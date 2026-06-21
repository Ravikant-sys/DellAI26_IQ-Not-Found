import asyncio
from typing import List, Dict, Any, Optional
import os
import datetime
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from sqlmodel import Session, select
from sqlalchemy import text
from pydantic import BaseModel

from app.config import settings
from app.database import init_db, get_session
from app.models import User, Team, ProjectSubmission, JudgeProfile, RawScore, AuditLog, EvaluationCriteria, SystemConfig, reset_blockchain_cache
from app.agents.sybil import generate_text_embedding
from app.agents.workflow import agent_workflow, broadcaster
from app.agents.score_eval import normalize_judge_scores
from app.agents.bias_detector import detect_score_bias
from app.agents.comm_agent import analyze_sentiment_and_tone, predict_optimal_send_time, get_multilingual_template

app = FastAPI(title=settings.PROJECT_NAME)

# Enable CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve interactive local dashboard
@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard():
    template_path = os.path.join(os.path.dirname(__file__), "templates", "dashboard.html")
    if not os.path.exists(template_path):
        return HTMLResponse(content="<h1>Dashboard HTML not found</h1>", status_code=404)
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

# Startup DB init
@app.on_event("startup")
def startup_event():
    init_db()
    broadcaster.set_loop(asyncio.get_running_loop())

# Request schemas
class UserCreate(BaseModel):
    email: str
    full_name: str
    role: str

class TeamCreate(BaseModel):
    name: str
    repo_url: Optional[str] = None

class SubmissionCreate(BaseModel):
    team_id: int
    title: str
    abstract: str
    tech_stack: str
    track: Optional[str] = "General"

class JudgeCreate(BaseModel):
    user_id: int
    bio: str
    max_projects: int = 5

class ScoreCreate(BaseModel):
    judge_id: int
    project_id: int
    criteria_scores: Dict[str, float]
    raw_score: Optional[float] = None

class CriteriaWeightUpdate(BaseModel):
    name: str
    weight: float
    description: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    evaluation_closed: bool

class OverrideRequest(BaseModel):
    action: str # APPROVE_OVERRIDE, CONFIRM_DISQUALIFICATION

# Background worker task for LangGraph pipeline
async def execute_agent_pipeline(sub_id: int, title: str, abstract: str, embedding: List[float]):
    await asyncio.sleep(0.5) # Allow transaction to fully commit
    state = {
        "submission_id": sub_id,
        "project_title": title,
        "abstract": abstract,
        "embedding": embedding,
        "logs": [],
        "status": "PENDING_REVIEW",
        "decision_metadata": {}
    }
    broadcaster.broadcast(f"[System] Initiating autonomous analysis for Project ID {sub_id}...")
    try:
        # Run synchronous LangGraph runnable in a threadpool to prevent blocking FastAPI
        await asyncio.to_thread(agent_workflow.invoke, state)
        broadcaster.broadcast(f"[System] Pipeline execution complete for Project ID {sub_id}")
    except Exception as e:
        broadcaster.broadcast(f"[System] ERROR in Agent Pipeline: {e}")

# API Routes
@app.post("/api/users/register", response_model=User)
def register_user(dto: UserCreate, session: Session = Depends(get_session)):
    user = User(email=dto.email, full_name=dto.full_name, role=dto.role)
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
        return user
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")

@app.post("/api/teams/register", response_model=Team)
def register_team(dto: TeamCreate, session: Session = Depends(get_session)):
    team = Team(name=dto.name, repo_url=dto.repo_url)
    session.add(team)
    try:
        session.commit()
        session.refresh(team)
        return team
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="Team name already exists")

@app.post("/api/submissions/submit", response_model=ProjectSubmission)
def submit_project(dto: SubmissionCreate, bg_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # 1. Generate text embedding vector (dimension 1536)
    embedding = generate_text_embedding(dto.abstract)
    
    # 2. Create and commit submission under strict ACID transaction
    submission = ProjectSubmission(
        team_id=dto.team_id,
        title=dto.title,
        abstract=dto.abstract,
        tech_stack=dto.tech_stack,
        track=dto.track or "General",
        state="PENDING_REVIEW",
        sa_column=None, # sa_column is handled by model metadata
        embedding=embedding
    )
    session.add(submission)
    try:
        session.commit()
        session.refresh(submission)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Submission failed or team already submitted: {e}")
        
    # 3. Offload task to background thread to execute the LangGraph pipeline
    bg_tasks.add_task(execute_agent_pipeline, submission.id, submission.title, submission.abstract, embedding)
    
    return submission

@app.get("/api/submissions", response_model=List[ProjectSubmission])
def list_submissions(session: Session = Depends(get_session)):
    return session.exec(select(ProjectSubmission)).all()

@app.get("/api/submissions/{id}", response_model=ProjectSubmission)
def get_submission(id: int, session: Session = Depends(get_session)):
    sub = session.get(ProjectSubmission, id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub

@app.patch("/api/submissions/{id}/override", response_model=ProjectSubmission)
def human_in_the_loop_override(id: int, dto: OverrideRequest, bg_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    sub = session.get(ProjectSubmission, id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    if dto.action == "APPROVE_OVERRIDE":
        sub.state = "APPROVED"
        log_action = "HITL_APPROVED"
        details = f"Admin approved override for Project {id}"
    elif dto.action == "CONFIRM_DISQUALIFICATION":
        sub.state = "BLOCKED"
        log_action = "HITL_DISQUALIFIED"
        details = f"Admin confirmed disqualification for Project {id}"
    else:
        raise HTTPException(status_code=400, detail="Invalid override action")
        
    session.add(sub)
    
    # Write audit log
    audit = AuditLog(action=log_action, details=details)
    session.add(audit)
    session.commit()
    session.refresh(sub)
    
    broadcaster.broadcast(f"[System] HITL Override executed: {details}", "state_update")
    
    if dto.action == "APPROVE_OVERRIDE":
        bg_tasks.add_task(execute_agent_pipeline, sub.id, sub.title, sub.abstract, sub.embedding)
        
    return sub

@app.post("/api/judges/register", response_model=JudgeProfile)
def register_judge(dto: JudgeCreate, session: Session = Depends(get_session)):
    # Find user profile
    user = session.get(User, dto.user_id)
    if not user or user.role != "JUDGE":
        raise HTTPException(status_code=400, detail="Invalid user ID or user role is not JUDGE")
        
    # Generate capabilities embedding based on bio
    emb = generate_text_embedding(dto.bio)
    
    judge = JudgeProfile(
        user_id=dto.user_id,
        bio=dto.bio,
        max_projects=dto.max_projects,
        capability_embedding=emb
    )
    session.add(judge)
    try:
        session.commit()
        session.refresh(judge)
        return judge
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="Judge profile already registered for this user")

@app.post("/api/scores/submit", response_model=RawScore)
def submit_score(dto: ScoreCreate, session: Session = Depends(get_session)):
    # 1. Check if evaluations are closed
    eval_closed_config = session.get(SystemConfig, "evaluation_closed")
    if eval_closed_config and eval_closed_config.value == "true":
        raise HTTPException(status_code=400, detail="Evaluations have closed. No further scores can be cast.")

    # 2. Fetch evaluation criteria weights
    db_criteria = session.exec(select(EvaluationCriteria)).all()
    criteria_dict = {c.name.lower(): c.weight for c in db_criteria}
    
    # Input criteria scores normalized to lowercase keys
    scores_input = {k.lower(): v for k, v in dto.criteria_scores.items()}
    
    # If database has criteria configured, use weighted sum.
    if criteria_dict:
        # Ensure we fill any missing criteria with default 5.0
        for name in criteria_dict.keys():
            if name not in scores_input:
                scores_input[name] = 5.0
                
        weighted_sum = 0.0
        total_weight = 0.0
        for name, val in scores_input.items():
            if name in criteria_dict:
                weighted_sum += val * criteria_dict[name]
                total_weight += criteria_dict[name]
                
        computed_raw = weighted_sum / total_weight if total_weight > 0 else 5.0
    else:
        # Fallback to provided raw_score, or average of criteria_scores
        if dto.raw_score is not None:
            computed_raw = dto.raw_score
        else:
            computed_raw = sum(scores_input.values()) / len(scores_input) if scores_input else 5.0

    score = RawScore(
        judge_id=dto.judge_id,
        project_id=dto.project_id,
        criteria_scores=scores_input,
        raw_score=float(round(computed_raw, 2))
    )
    session.add(score)
    try:
        session.commit()
        session.refresh(score)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Score submission failed: {e}")
        
    # Trigger Z-score bias normalization for this judge
    normalize_judge_scores(session, dto.judge_id)
    
    # Reload score to return normalized value
    session.refresh(score)
    
    # Run evaluations bias detection
    detect_score_bias(session, score.id)
    
    broadcaster.broadcast(f"[System] Score cast by Judge {dto.judge_id} for Project {dto.project_id}. Raw: {score.raw_score:.2f}, Normalized: {score.normalized_score:.2f}", "state_update")
    return score

import numpy as np

@app.get("/api/leaderboard")
def get_leaderboard(session: Session = Depends(get_session)):
    """
    Returns submissions ranked by their average normalized score, including
    confidence scores, margins of error, confidence intervals, and tie-breaking details.
    """
    subs = session.exec(select(ProjectSubmission)).all()
    leaderboard = []
    
    for sub in subs:
        if sub.state in ["FLAGGED_DUPLICATE", "BLOCKED"]:
            continue
            
        scores = session.exec(select(RawScore).where(RawScore.project_id == sub.id)).all()
        
        if not scores:
            avg_score = 0.0
            raw_avg = 0.0
            variance = 0.0
            confidence = 0.0
            ci_lower = 0.0
            ci_upper = 0.0
        else:
            norm_scores = [s.normalized_score for s in scores if s.normalized_score is not None]
            raw_scores = [s.raw_score for s in scores]
            
            if not norm_scores:
                avg_score = 0.0
                variance = 0.0
            else:
                avg_score = float(np.mean(norm_scores))
                variance = float(np.var(norm_scores)) if len(norm_scores) > 1 else 0.0
                
            raw_avg = float(np.mean(raw_scores)) if raw_scores else 0.0
            
            # Confidence score calculation
            n = len(scores)
            base_conf = 1.0 - np.exp(-0.6 * n)
            var_penalty = min(0.4, variance * 0.08)
            confidence = float(max(0.1, base_conf - var_penalty) * 100)
            
            # 95% Confidence Interval for mean score
            std_dev = float(np.std(norm_scores)) if len(norm_scores) > 1 else 0.0
            se = std_dev / np.sqrt(n) if n > 0 else 0.0
            margin = 1.96 * se
            ci_lower = float(np.clip(avg_score - margin, 0.0, 10.0))
            ci_upper = float(np.clip(avg_score + margin, 0.0, 10.0))
            
        leaderboard.append({
            "project_id": sub.id,
            "title": sub.title,
            "state": sub.state,
            "raw_average": round(raw_avg, 2),
            "normalized_score": round(avg_score, 2),
            "variance": round(variance, 3),
            "eval_count": len(scores),
            "confidence_score": round(confidence, 1),
            "ci_lower": round(ci_lower, 2),
            "ci_upper": round(ci_upper, 2),
            "created_at": sub.created_at.isoformat() if sub.created_at else ""
        })
        
    # Sort with tie-breaking rules:
    # 1. Normalized score descending
    # 2. Raw average descending (tie-breaker 1)
    # 3. Variance ascending (tie-breaker 2)
    # 4. Evaluation count descending (tie-breaker 3)
    # 5. Created_at ascending (tie-breaker 4)
    leaderboard.sort(key=lambda x: x["created_at"] or "")
    leaderboard.sort(key=lambda x: x["eval_count"], reverse=True)
    leaderboard.sort(key=lambda x: x["variance"])
    leaderboard.sort(key=lambda x: x["raw_average"], reverse=True)
    leaderboard.sort(key=lambda x: x["normalized_score"], reverse=True)
    
    # Assign ranks and detect tie-breaking cases
    for i, item in enumerate(leaderboard):
        item["rank"] = i + 1
        item["tie_broken"] = False
        item["tie_break_reason"] = None
        
        if i > 0:
            prev = leaderboard[i - 1]
            if prev["normalized_score"] == item["normalized_score"]:
                item["tie_broken"] = True
                if prev["raw_average"] != item["raw_average"]:
                    item["tie_break_reason"] = f"Raw Average Difference ({prev['raw_average']} vs {item['raw_average']})"
                elif prev["variance"] != item["variance"]:
                    item["tie_break_reason"] = f"Review Consensus (Lower Variance: {prev['variance']} vs {item['variance']})"
                elif prev["eval_count"] != item["eval_count"]:
                    item["tie_break_reason"] = f"Evaluation Count ({prev['eval_count']} vs {item['eval_count']})"
                else:
                    item["tie_break_reason"] = "Submission Timestamp (Earlier submission)"
                    
    return leaderboard

@app.get("/api/analytics/winner")
def get_winner_report(session: Session = Depends(get_session)):
    subs = session.exec(select(ProjectSubmission)).all()
    if not subs:
        return {"status": "NO_SUBMISSIONS", "message": "No submissions found."}
        
    leaderboard = []
    for sub in subs:
        scores = session.exec(select(RawScore).where(RawScore.project_id == sub.id)).all()
        if scores:
            avg_score = float(sum(s.normalized_score for s in scores) / len(scores))
            raw_avg = float(sum(s.raw_score for s in scores) / len(scores))
            leaderboard.append({
                "project_id": sub.id,
                "title": sub.title,
                "team_id": sub.team_id,
                "raw_average": round(raw_avg, 2),
                "normalized_score": round(avg_score, 2),
                "eval_count": len(scores)
            })
            
    if not leaderboard:
        return {"status": "NO_EVALUATIONS", "message": "No evaluations registered yet."}
        
    leaderboard.sort(key=lambda x: x["normalized_score"], reverse=True)
    winner = leaderboard[0]
    
    # Deterministic hash for certificate verification
    hash_val = abs(hash(winner['title'] + str(winner['normalized_score']))) % 100000000
    
    certificate = {
        "title": "DELL FUTURE MINDS AI HACKATHON 2026",
        "award": "CERTIFICATE OF MERIT",
        "recipient": f"Team {winner['team_id']}",
        "reason": f"First Place Winner for Project: '{winner['title']}'",
        "normalized_score": winner['normalized_score'],
        "verification_hash": f"DELL-OS-{hash_val:08x}",
        "date": "June 19, 2026",
        "signature": "Dell Autonomous Agentic OS Engine"
    }
    
    audit_trail = (
        f"Project ID {winner['project_id']} completed all autonomous stages: "
        f"verified by DBSCAN, matched to judges using Hungarian assignment, and calibrated with Z-score normalizer "
        f"to achieve the top score of {winner['normalized_score']} (Raw Average: {winner['raw_average']})."
    )
    
    return {
        "status": "SUCCESS",
        "winner": winner,
        "certificate": certificate,
        "audit_trail": audit_trail
    }

@app.post("/api/seed")
def seed_database(session: Session = Depends(get_session)):
    # 1. Clear database tables
    session.execute(text("TRUNCATE TABLE raw_scores, project_submissions, judge_profiles, teams, users, audit_logs, evaluation_criteria, system_config RESTART IDENTITY CASCADE;"))
    session.commit()
    reset_blockchain_cache()
    
    # Seed default configs
    session.add(SystemConfig(key="evaluation_closed", value="false"))
    
    # Seed default criteria weights
    session.add(EvaluationCriteria(name="Innovation", weight=0.40, description="Creativity and uniqueness of the AI solution"))
    session.add(EvaluationCriteria(name="Feasibility", weight=0.30, description="Completeness and operational viability of the prototype"))
    session.add(EvaluationCriteria(name="Technical Complexity", weight=0.30, description="Depth of tech stack and algorithms utilized"))
    session.commit()
    
    # 2. Seed Users & Judges
    u1 = User(email="strict_hawk@judges.com", full_name="Dr. Hawk", role="JUDGE")
    session.add(u1)
    u2 = User(email="moderate@judges.com", full_name="Prof. Mod", role="JUDGE")
    session.add(u2)
    u3 = User(email="lenient_dove@judges.com", full_name="Hon. Dove", role="JUDGE")
    session.add(u3)
    session.commit()
    session.refresh(u1)
    session.refresh(u2)
    session.refresh(u3)
    
    j1 = JudgeProfile(
        user_id=u1.id,
        bio="Strict grading criteria, focusing on code quality and technical details in Python and Go.",
        max_projects=5,
        capability_embedding=generate_text_embedding("Strict grading criteria, focusing on code quality and technical details in Python and Go.")
    )
    j2 = JudgeProfile(
        user_id=u2.id,
        bio="Balanced evaluation covering implementation depth and product pitch across React and WebAssembly.",
        max_projects=5,
        capability_embedding=generate_text_embedding("Balanced evaluation covering implementation depth and product pitch across React and WebAssembly.")
    )
    j3 = JudgeProfile(
        user_id=u3.id,
        bio="Very encouraging criteria, high focus on innovation and machine learning.",
        max_projects=5,
        capability_embedding=generate_text_embedding("Very encouraging criteria, high focus on innovation and machine learning.")
    )
    session.add_all([j1, j2, j3])
    session.commit()
    session.refresh(j1)
    session.refresh(j2)
    session.refresh(j3)
    
    # 3. Seed Teams
    teams = [
        Team(name="Team Swarm 101", repo_url="https://github.com/swarm-101"),
        Team(name="Team Swarm 102", repo_url="https://github.com/swarm-102"),
        Team(name="Team Swarm 103", repo_url="https://github.com/swarm-103"),
        Team(name="Team Swarm 104", repo_url="https://github.com/swarm-104"),
    ]
    session.add_all(teams)
    session.commit()
    for t in teams:
        session.refresh(t)
        
    # 4. Seed Submissions
    p1_abstract = "A highly optimized decentralized swarm router using Go, Docker, Kubernetes, and WebAssembly. It balances workload dynamically and avoids single points of failure."
    p1_emb = generate_text_embedding(p1_abstract)
    
    p1_tone = analyze_sentiment_and_tone(p1_abstract)
    p1_lang = "en"
    p1_timing = predict_optimal_send_time(datetime.datetime.now())
    p1_email_body = get_multilingual_template(p1_tone, teams[0].id, "Decentralized Swarm Router", ["go", "docker", "kubernetes", "webassembly"], 0.92, p1_lang)
    p1_email = (
        f"--- TIMING ENGINE: OPTIMIZED SEND SLOT ---\n"
        f"Scheduled At: {p1_timing['scheduled_time']}\n"
        f"Strategy Reason: {p1_timing['reason']}\n"
        f"Selected Language Profile: {p1_lang.upper()}\n"
        f"Target Tone Category: {p1_tone}\n"
        f"-----------------------------------------\n\n"
        f"{p1_email_body}"
    )
    p1_promo = f"🚀 [Tone: {p1_tone}] Project Alert: Team {teams[0].id} is building 'Decentralized Swarm Router'! Stack: Go, Docker, Kubernetes, WebAssembly. #DellFutureMinds2026 #AgenticOS #AI"

    p1 = ProjectSubmission(
        team_id=teams[0].id,
        title="Decentralized Swarm Router",
        abstract=p1_abstract,
        tech_stack="Go, Docker, Kubernetes, WebAssembly",
        state="MATCHED",
        embedding=p1_emb,
        extracted_skills=["go", "docker", "kubernetes", "webassembly"],
        predictive_success_score=0.92,
        generated_email=p1_email,
        generated_promo=p1_promo
    )
    
    p2_abstract = "A highly optimized decentralized swarm router using Go, Docker, Kubernetes, and WebAssembly. It balances workload dynamically and avoids single points of failure."
    p2_emb = generate_text_embedding(p2_abstract)
    p2 = ProjectSubmission(
        team_id=teams[1].id,
        title="Duplicate Swarm Router",
        abstract=p2_abstract,
        tech_stack="Go, Docker, Kubernetes, WebAssembly",
        state="FLAGGED_DUPLICATE",
        embedding=p2_emb
    )
    
    p3_abstract = "An AI-powered regional medical assistant specifically focusing on healthcare access in rural India. Created by Emily and Priya, it uses React and python."
    p3_emb = generate_text_embedding(p3_abstract)
    
    p3_tone = analyze_sentiment_and_tone(p3_abstract)
    p3_lang = "hi"
    p3_timing = predict_optimal_send_time(datetime.datetime.now())
    p3_email_body = get_multilingual_template(p3_tone, teams[2].id, "Women in AI: Regional Medical Assistant", ["react", "python", "tailwind"], 0.88, p3_lang)
    p3_email = (
        f"--- TIMING ENGINE: OPTIMIZED SEND SLOT ---\n"
        f"Scheduled At: {p3_timing['scheduled_time']}\n"
        f"Strategy Reason: {p3_timing['reason']}\n"
        f"Selected Language Profile: {p3_lang.upper()}\n"
        f"Target Tone Category: {p3_tone}\n"
        f"-----------------------------------------\n\n"
        f"{p3_email_body}"
    )
    p3_promo = f"🚀 [Tone: {p3_tone}] Project Alert: Team {teams[2].id} is building 'Women in AI: Regional Medical Assistant'! Stack: React, Python, Tailwind. #DellFutureMinds2026 #AgenticOS #AI"

    p3 = ProjectSubmission(
        team_id=teams[2].id,
        title="Women in AI: Regional Medical Assistant",
        abstract=p3_abstract,
        tech_stack="React, Python, Tailwind",
        state="MATCHED",
        embedding=p3_emb,
        extracted_skills=["react", "python", "tailwind"],
        predictive_success_score=0.88,
        generated_email=p3_email,
        generated_promo=p3_promo
    )
    
    p4_abstract = "i want to build a system that monitor crop health. it uses raspberry pi and python. i hope it works well because we need it for our farm."
    p4_emb = generate_text_embedding(p4_abstract)
    
    p4_tone = analyze_sentiment_and_tone(p4_abstract)
    p4_lang = "en"
    p4_timing = predict_optimal_send_time(datetime.datetime.now())
    p4_email_body = get_multilingual_template(p4_tone, teams[3].id, "autonomous IoT crop monitoring", ["python", "raspberry pi"], 0.74, p4_lang)
    p4_email = (
        f"--- TIMING ENGINE: OPTIMIZED SEND SLOT ---\n"
        f"Scheduled At: {p4_timing['scheduled_time']}\n"
        f"Strategy Reason: {p4_timing['reason']}\n"
        f"Selected Language Profile: {p4_lang.upper()}\n"
        f"Target Tone Category: {p4_tone}\n"
        f"-----------------------------------------\n\n"
        f"{p4_email_body}"
    )
    p4_promo = f"🚀 [Tone: {p4_tone}] Project Alert: Team {teams[3].id} is building 'autonomous IoT crop monitoring'! Stack: Python, Raspberry Pi. #DellFutureMinds2026 #AgenticOS #AI"

    p4 = ProjectSubmission(
        team_id=teams[3].id,
        title="autonomous IoT crop monitoring",
        abstract=p4_abstract,
        tech_stack="Python, Raspberry Pi",
        state="MATCHED",
        embedding=p4_emb,
        extracted_skills=["python", "raspberry pi"],
        predictive_success_score=0.74,
        generated_email=p4_email,
        generated_promo=p4_promo
    )
    
    session.add_all([p1, p2, p3, p4])
    session.commit()
    session.refresh(p1)
    session.refresh(p2)
    session.refresh(p3)
    session.refresh(p4)
    
    # 5. Log Audit Entries
    session.add(AuditLog(action="DUPLICATE_ALERT", details=f"Project {p2.id} flagged as duplicate of {p1.id} (sim=1.0000)"))
    session.add(AuditLog(action="JUDGE_MATCHED", details=f"Project 1 matched to Judge 2 (Prof. Mod). Score=0.85, Expertise=0.92, Workload=1.0, ConflictAvoided=True, Diversity=0.8"))
    session.add(AuditLog(action="JUDGE_MATCHED", details=f"Project 3 matched to Judge 1 (Dr. Hawk). Score=0.78, Expertise=0.75, Workload=1.0, ConflictAvoided=True, Diversity=0.9"))
    session.add(AuditLog(action="JUDGE_MATCHED", details=f"Project 4 matched to Judge 3 (Hon. Dove). Score=0.79, Expertise=0.82, Workload=1.0, ConflictAvoided=True, Diversity=0.7"))
    session.commit()
    
    # 6. Seed scores to establish judge baselines and trigger BIAS detection
    scores = [
        RawScore(judge_id=j1.id, project_id=p1.id, criteria_scores={"innovation": 6.0, "feasibility": 6.0, "technical complexity": 6.0}, raw_score=6.0),
        RawScore(judge_id=j1.id, project_id=p4.id, criteria_scores={"innovation": 5.0, "feasibility": 5.0, "technical complexity": 5.0}, raw_score=5.0),
        # Target score for Project 3: 3.0 (triggers Gender and Geographic bias!)
        RawScore(judge_id=j1.id, project_id=p3.id, criteria_scores={"innovation": 3.0, "feasibility": 3.0, "technical complexity": 3.0}, raw_score=3.0),
        
        RawScore(judge_id=j2.id, project_id=p1.id, criteria_scores={"innovation": 8.0, "feasibility": 8.0, "technical complexity": 8.0}, raw_score=8.0),
        RawScore(judge_id=j2.id, project_id=p3.id, criteria_scores={"innovation": 8.0, "feasibility": 8.0, "technical complexity": 8.0}, raw_score=8.0),
        RawScore(judge_id=j2.id, project_id=p4.id, criteria_scores={"innovation": 7.0, "feasibility": 7.0, "technical complexity": 7.0}, raw_score=7.0),
        
        RawScore(judge_id=j3.id, project_id=p1.id, criteria_scores={"innovation": 9.5, "feasibility": 9.5, "technical complexity": 9.5}, raw_score=9.5),
        RawScore(judge_id=j3.id, project_id=p3.id, criteria_scores={"innovation": 9.0, "feasibility": 9.0, "technical complexity": 9.0}, raw_score=9.0),
        # Target score for Project 4: 6.5 (triggers Language bias!)
        RawScore(judge_id=j3.id, project_id=p4.id, criteria_scores={"innovation": 6.5, "feasibility": 6.5, "technical complexity": 6.5}, raw_score=6.5),
    ]
    session.add_all(scores)
    session.commit()
    
    # 7. Normalize judge scores
    for j_id in [j1.id, j2.id, j3.id]:
        normalize_judge_scores(session, j_id)
        
    # 8. Run bias detection on all scores to populate audit logs
    for s in scores:
        detect_score_bias(session, s.id)
        
    broadcaster.broadcast("[System] Database seeded with 3 Judges, 4 Teams, 4 Submissions, and bias-calibrated scores.", "state_update")
    return {"status": "SUCCESS", "message": "Database seeded successfully."}

def recalculate_all_raw_scores(session: Session):
    db_criteria = session.exec(select(EvaluationCriteria)).all()
    if not db_criteria:
        return
    weights = {c.name.lower(): c.weight for c in db_criteria}
    
    scores = session.exec(select(RawScore)).all()
    for score in scores:
        score_dict = {k.lower(): v for k, v in score.criteria_scores.items()}
        
        weighted_sum = 0.0
        weight_total = 0.0
        for name, score_val in score_dict.items():
            if name in weights:
                weighted_sum += score_val * weights[name]
                weight_total += weights[name]
                
        if weight_total > 0:
            score.raw_score = float(round(weighted_sum / weight_total, 2))
        else:
            score.raw_score = float(round(sum(score_dict.values()) / len(score_dict), 2)) if score_dict else 0.0
            
        session.add(score)
    session.commit()
    
    # Re-normalize
    judges = session.exec(select(JudgeProfile)).all()
    for judge in judges:
        normalize_judge_scores(session, judge.id)

@app.get("/api/config/criteria", response_model=List[CriteriaWeightUpdate])
def get_criteria(session: Session = Depends(get_session)):
    return session.exec(select(EvaluationCriteria)).all()

@app.post("/api/config/criteria")
def update_criteria_weights(criteria_list: List[CriteriaWeightUpdate], session: Session = Depends(get_session)):
    total_weight = sum(c.weight for c in criteria_list)
    if total_weight <= 0:
        raise HTTPException(status_code=400, detail="Total weight must be greater than zero")
        
    session.execute(text("DELETE FROM evaluation_criteria;"))
    session.commit()
    
    for item in criteria_list:
        db_c = EvaluationCriteria(
            name=item.name,
            weight=item.weight / total_weight,
            description=item.description
        )
        session.add(db_c)
    session.commit()
    
    recalculate_all_raw_scores(session)
    broadcaster.broadcast(f"[System] Configured custom evaluation criteria. Total recalculated scores updated.", "state_update")
    return {"status": "SUCCESS", "message": "Criteria weights updated and scores recalculated."}

@app.get("/api/config/status")
def get_evaluation_status(session: Session = Depends(get_session)):
    cfg = session.get(SystemConfig, "evaluation_closed")
    return {"evaluation_closed": cfg.value == "true" if cfg else False}

@app.post("/api/config/status")
def update_evaluation_status(dto: StatusUpdateRequest, session: Session = Depends(get_session)):
    cfg = session.get(SystemConfig, "evaluation_closed")
    if not cfg:
        cfg = SystemConfig(key="evaluation_closed", value="true" if dto.evaluation_closed else "false")
    else:
        cfg.value = "true" if dto.evaluation_closed else "false"
    session.add(cfg)
    
    action = "EVALUATION_CLOSED" if dto.evaluation_closed else "EVALUATION_OPENED"
    details = "Organizer has closed the evaluation and locked results." if dto.evaluation_closed else "Organizer has opened evaluations for scoring."
    
    audit = AuditLog(action=action, details=details)
    session.add(audit)
    session.commit()
    
    broadcaster.broadcast(f"[System] Evaluations status changed: {'CLOSED' if dto.evaluation_closed else 'OPEN'}", "state_update")
    return {"status": "SUCCESS", "evaluation_closed": dto.evaluation_closed}

@app.get("/api/audit-logs/verify")
def verify_audit_logs(session: Session = Depends(get_session)):
    logs = session.exec(select(AuditLog).order_by(AuditLog.id.asc())).all()
    chain_valid = True
    verified_blocks = 0
    errors = []
    
    expected_prev = "0000000000000000000000000000000000000000000000000000000000000000"
    for log in logs:
        if log.prev_hash != expected_prev:
            chain_valid = False
            errors.append(f"Block #{log.id} prev_hash mismatch: expected {expected_prev[:12]}..., got {log.prev_hash[:12]}...")
            
        payload = f"{log.prev_hash}|{log.action}|{log.details}|{log.timestamp.isoformat()}"
        import hashlib
        recomputed = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        if log.hash != recomputed:
            chain_valid = False
            errors.append(f"Block #{log.id} hash corruption: recomputed {recomputed[:12]}..., got {log.hash[:12]}...")
            
        expected_prev = log.hash
        verified_blocks += 1
        
    return {
        "status": "SUCCESS" if chain_valid else "CORRUPTED",
        "verified_blocks": verified_blocks,
        "is_valid": chain_valid,
        "errors": errors
    }

@app.get("/api/submissions/{id}/feedback")
def get_submission_feedback(id: int, session: Session = Depends(get_session)):
    sub = session.get(ProjectSubmission, id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    scores = session.exec(select(RawScore).where(RawScore.project_id == id)).all()
    if not scores:
        return {
            "project_id": id,
            "title": sub.title,
            "status": "AWAITING_EVALUATIONS",
            "message": "This project has not been evaluated by any judges yet."
        }
        
    criteria_avgs = {}
    for s in scores:
        for c, val in s.criteria_scores.items():
            criteria_avgs[c] = criteria_avgs.get(c, []) + [val]
            
    averages = {c: float(np.mean(vals)) for c, vals in criteria_avgs.items()}
    
    leaderboard = get_leaderboard(session)
    rank_info = next((item for item in leaderboard if item["project_id"] == id), None)
    
    rank = rank_info["rank"] if rank_info else len(leaderboard)
    total_ranked = len(leaderboard)
    percentile = round((1 - (rank - 1) / total_ranked) * 100, 1) if total_ranked > 0 else 0.0
    
    strengths = []
    improvements = []
    
    for c, avg in averages.items():
        if avg >= 7.5:
            strengths.append(f"Outstanding score in **{c.capitalize()}** ({avg:.1f}/10.0), demonstrating strong architectural implementation and depth.")
        elif avg < 6.0:
            improvements.append(f"Opportunity for improvement in **{c.capitalize()}** ({avg:.1f}/10.0) by adding comprehensive documentation and resolving edge-case behaviors.")
        else:
            strengths.append(f"Solid performance in **{c.capitalize()}** ({avg:.1f}/10.0), meeting all core requirements.")
            
    if not strengths:
        strengths.append("Successfully integrated the technology stack into a running prototype.")
    if not improvements:
        improvements.append("Continue optimizing resource usage and query response times to handle scaling requirements.")
        
    judge_feedback_insights = []
    for s in scores:
        judge = session.get(JudgeProfile, s.judge_id)
        if judge:
            judge_user = session.get(User, judge.user_id)
            judge_name = judge_user.full_name if judge_user else f"Judge #{judge.id}"
            
            if s.raw_score >= 8.0:
                rec_text = "Highly impressed by the scalability and cleanliness of the design. Recommended to present at the main demo day."
            elif s.raw_score >= 6.0:
                rec_text = "Good overall prototype. Consider refining the tech stack overlap details to reduce latency."
            else:
                rec_text = "Core structure is present. Focus on rewriting bottleneck routines and resolving open issues."
                
            judge_feedback_insights.append({
                "judge_role": judge_name,
                "score_cast": s.raw_score,
                "recommendation": rec_text
            })
            
    feedback_text = (
        f"Team {sub.team_id}'s submission '{sub.title}' achieved an overall rank of #{rank} out of {total_ranked} "
        f"verified projects (placing in the top {percentile}%). After Z-score reviewer calibration, the project "
        f"secured a normalized average of {rank_info['normalized_score'] if rank_info else 0.0:.2f}."
    )
    
    return {
        "project_id": id,
        "title": sub.title,
        "team_id": sub.team_id,
        "rank": rank,
        "percentile": percentile,
        "normalized_score": rank_info["normalized_score"] if rank_info else 0.0,
        "averages": {c: round(v, 2) for c, v in averages.items()},
        "strengths": strengths,
        "improvements": improvements,
        "judge_insights": judge_feedback_insights,
        "overall_summary": feedback_text
    }

@app.get("/api/analytics/announcements")
def generate_winner_announcements(session: Session = Depends(get_session)):
    leaderboard = get_leaderboard(session)
    if not leaderboard:
        return {"status": "ERROR", "message": "No submissions ranked yet."}
        
    top_3 = leaderboard[:3]
    while len(top_3) < 3:
        top_3.append({"title": "TBD", "project_id": None, "normalized_score": 0.0, "raw_average": 0.0})
        
    p1, p2, p3 = top_3
    
    email_html = f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <h2 style="color: #0047cc; text-align: center; font-size: 24px;">🏆 Dell Future Minds AI Hackathon 2026 Winners!</h2>
  <p style="font-size: 14px; color: #334155; line-height: 1.6;">Dear Participants,</p>
  <p style="font-size: 14px; color: #334155; line-height: 1.6;">We are thrilled to announce the official results of the <b>Dell Future Minds AI Hackathon 2026</b>. After rigorous Z-score normalization and cryptographically verified evaluations, the winners are:</p>
  
  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <h3 style="color: #15803d; margin: 0 0 5px 0; font-size: 18px;">🥇 1st Place: Project '{p1['title']}'</h3>
    <p style="margin: 0; font-size: 13px; color: #1e293b;"><b>Calibrated Score:</b> {p1['normalized_score']} (Raw Average: {p1['raw_average']})</p>
  </div>
  
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <h3 style="color: #475569; margin: 0 0 5px 0; font-size: 16px;">🥈 2nd Place: Project '{p2['title']}'</h3>
    <p style="margin: 0; font-size: 13px; color: #1e293b;"><b>Calibrated Score:</b> {p2['normalized_score']} (Raw Average: {p2['raw_average']})</p>
  </div>
  
  <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <h3 style="color: #b45309; margin: 0 0 5px 0; font-size: 16px;">🥉 3rd Place: Project '{p3['title']}'</h3>
    <p style="margin: 0; font-size: 13px; color: #1e293b;"><b>Calibrated Score:</b> {p3['normalized_score']} (Raw Average: {p3['raw_average']})</p>
  </div>
  
  <p style="font-size: 14px; color: #334155; line-height: 1.6;">Thank you to all teams for building outstanding systems! Verified merit certificates can be viewed in your portal dashboard.</p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center;">Powered by Dell Autonomous Agentic OS &bull; Integrity Ledger Active</p>
</div>
"""

    slack_md = f"""
*🏆 DELL FUTURE MINDS AI HACKATHON 2026 WINNERS ANNOUNCED!* 🚀

After completing the bias-normalized score calibration, we are proud to present the winners:
• *1st Place:* {p1['title']} (Calibrated Score: `{p1['normalized_score']}`) 🥇
• *2nd Place:* {p2['title']} (Calibrated Score: `{p2['normalized_score']}`) 🥈
• *3rd Place:* {p3['title']} (Calibrated Score: `{p3['normalized_score']}`) 🥉

Special congratulations to the winning teams! The audit trail has been finalized on our agentic ledger. ⚖️
#DellFutureMinds2026 #HackathonWinners #AgenticOS
"""

    discord_md = f"""
***🏆 DELL FUTURE MINDS AI HACKATHON 2026 OFFICIAL RESULTS*** 🏆

We've completed the scoring audits and normalized all judge evaluations. Here are your winners:
:first_place: **1st Place:** {p1['title']} (Score: `{p1['normalized_score']}`)
:second_place: **2nd Place:** {p2['title']} (Score: `{p2['normalized_score']}`)
:third_place: **3rd Place:** {p3['title']} (Score: `{p3['normalized_score']}`)

Congratulations to the winners, and huge props to everyone who completed their builds! :sparkles:
"""

    twitter_md = f"""
🏆 Drumroll please! The official results of the Dell Future Minds AI Hackathon 2026 are in! 🚀

🥇 1st: {p1['title']}
🥈 2nd: {p2['title']}
🥉 3rd: {p3['title']}

Normalized rankings audited with cryptographic ledger integrity! Congrats to all winners! 🎉 #DellFutureMinds #AgenticOS #AI
"""

    return {
        "status": "SUCCESS",
        "email": email_html.strip(),
        "slack": slack_md.strip(),
        "discord": discord_md.strip(),
        "twitter": twitter_md.strip()
    }

@app.get("/api/audit-logs", response_model=List[AuditLog])
def list_audit_logs(session: Session = Depends(get_session)):
    return session.exec(select(AuditLog).order_by(AuditLog.timestamp.desc())).all()

# WebSockets Server Manager
class WebSocketConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message_dict: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message_dict)
            except Exception:
                pass

ws_manager = WebSocketConnectionManager()

# Hook WebSockets into global broadcaster
_original_broadcast = broadcaster.broadcast
def extended_broadcast(message: str, event_type: str = "log"):
    _original_broadcast(message, event_type)
    # Broadcast to WebSocket clients
    payload = {
        "text": message, 
        "timestamp": str(datetime.datetime.utcnow().timestamp()), 
        "event_type": event_type
    }
    if broadcaster.loop and broadcaster.loop.is_running():
        broadcaster.loop.create_task(ws_manager.broadcast(payload))

broadcaster.broadcast = extended_broadcast

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({
            "text": "[System] Connected to Real-time WebSockets Stream...",
            "timestamp": str(datetime.datetime.utcnow().timestamp()),
            "event_type": "log"
        })
        while True:
            # Receive ping/messages to keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# Bias Alerts APIs
@app.get("/api/bias-alerts")
def get_bias_alerts(session: Session = Depends(get_session)):
    alerts = session.exec(
        select(AuditLog).where(AuditLog.action == "BIAS_ALERT").order_by(AuditLog.timestamp.desc())
    ).all()
    result = []
    for alert in alerts:
        result.append({
            "id": alert.id,
            "timestamp": alert.timestamp.isoformat(),
            "details": alert.details,
            "action": alert.action
        })
    return result

@app.patch("/api/bias-alerts/{id}/resolve")
def resolve_bias_alert(id: int, session: Session = Depends(get_session)):
    alert = session.get(AuditLog, id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.action != "BIAS_ALERT":
        raise HTTPException(status_code=400, detail="Alert already resolved")
    
    alert.action = "BIAS_RESOLVED"
    session.add(alert)
    session.commit()
    
    # Broadcast to refresh UI
    broadcaster.broadcast(f"[System] Bias Alert ID {id} has been manually resolved by Organizer.", "state_update")
    return {"status": "SUCCESS", "message": f"Alert {id} resolved."}

# SSE Real-time Logs Endpoint
@app.get("/api/streams/logs")
async def stream_logs():
    q = broadcaster.subscribe()
    
    async def event_generator():
        try:
            # Yield initial connect log
            yield f"event: log\ndata: {{\"text\": \"[System] Connected to Real-time Agent Log Stream...\", \"timestamp\": \"0.0\"}}\n\n"
            while True:
                data = await q.get()
                yield data
        except asyncio.CancelledError:
            pass
        finally:
            broadcaster.unsubscribe(q)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")


# =====================================================================
# Workflow Extensions: Registration, Submission, Review, Judging, Results
# =====================================================================

import bcrypt
import celery
import redis
import spacy
import chromadb
import numpy as np
import scipy.optimize
from app.models import DuplicateFlag, Assignment, BiasAlert, Result

celery_app = celery.Celery("tasks")

# Request schemas for workflows
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    bio: Optional[str] = ""
    skills_text: Optional[str] = ""
    institution: Optional[str] = ""

class HackathonSubmissionRequest(BaseModel):
    team_id: int
    title: str
    description: str
    github_url: str
    demo_url: str
    track: str
    tags: str # comma-separated tags

class ScoringRequest(BaseModel):
    judge_id: int
    project_id: int
    innovation: float
    tech: float
    feasibility: float
    presentation: float
    event_id: Optional[int] = 1

# ASYNC Background tasks via Celery (mocked to run in background thread)
@celery_app.task
def process_registration_task(user_id: int):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            return
            
        profile_text = f"{user.full_name} {user.bio or ''} {user.skills or ''}"
        
        # 1. Embed profile text
        embedding = generate_text_embedding(profile_text)
        
        # 2. ChromaDB search
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
        collection = chroma_client.get_or_create_collection(name="users")
        
        # Query for duplicates
        results = collection.query(query_embeddings=[embedding], n_results=5)
        
        is_duplicate = False
        if results and "similarities" in results and len(results["similarities"][0]) > 0:
            # First similarity
            sim = results["similarities"][0][0]
            sim_id = results["ids"][0][0]
            if sim > 0.85:
                is_duplicate = True
                sim_user_id = int(sim_id.split("_")[1])
                dup_flag = DuplicateFlag(
                    user_id=user.id,
                    similar_user_id=sim_user_id,
                    similarity=sim
                )
                session.add(dup_flag)
                
                # Notify organizer via log and AuditLog
                audit = AuditLog(
                    action="BIAS_ALERT",
                    details=f"User {user.id} ({user.full_name}) flagged as profile duplicate of User {sim_user_id} (Similarity: {sim:.4f})"
                )
                session.add(audit)
                session.commit()
                
                broadcaster.broadcast(
                    f"[Registration Agent] ALARM: Duplicate profile detected for {user.full_name} against User {sim_user_id} (Similarity: {sim:.4f})",
                    "state_update"
                )
                
        # 3. spaCy NER for skills
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(f"{user.bio or ''} {user.skills or ''}")
        extracted_skills = []
        for ent in doc.ents:
            if ent.label_ == "SKILL":
                extracted_skills.append(ent.text)
                
        if extracted_skills:
            user.skills = list(set([s.lower() for s in extracted_skills]))
            session.add(user)
            session.commit()
            broadcaster.broadcast(f"[Registration Agent] Extracted skills from bio for User {user.id}: {user.skills}")
            
        # 4. Store in ChromaDB
        collection.add(
            ids=[f"user_{user.id}"],
            embeddings=[embedding],
            documents=[profile_text],
            metadatas=[{"email": user.email, "full_name": user.full_name}]
        )
        
        # 5. WebSocket notify organizer
        broadcaster.broadcast(f"[System] New registration event: User {user.id} ({user.full_name}) registered.", "new_registration")

@celery_app.task
def process_submission_task(submission_id: int):
    with Session(engine) as session:
        sub = session.get(ProjectSubmission, submission_id)
        if not sub:
            return
            
        # Generate embedding
        combined_text = f"{sub.title} {sub.abstract or ''}"
        embedding = generate_text_embedding(combined_text)
        
        # Store in ChromaDB
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
        collection = chroma_client.get_or_create_collection(name="submissions")
        collection.add(
            ids=[f"submission_{sub.id}"],
            embeddings=[embedding],
            documents=[combined_text],
            metadatas=[{"title": sub.title, "track": sub.track}]
        )
        
        # Tag extraction & matching against reviewer expertise
        sub_tags = set([t.strip().lower() for t in (sub.tags or "").split(",") if t.strip()])
        judges = session.exec(select(JudgeProfile)).all()
        matched_judges_count = 0
        for judge in judges:
            judge_tags = set([t.strip().lower() for t in (judge.expertise or "").split(",") if t.strip()])
            if sub_tags & judge_tags:
                matched_judges_count += 1
                
        broadcaster.broadcast(f"[System] Submission ID {sub.id} processed: tags matched {matched_judges_count} expert reviewers.")
        broadcaster.broadcast(f"[System] Real-time Submission event: Project '{sub.title}' submitted.", "new_submission")

@celery_app.task
def reviewer_assignment_task(event_id: int):
    broadcaster.broadcast(f"[System] Initiating Reviewer Assignment for Event {event_id}...")
    with Session(engine) as session:
        submissions = session.exec(select(ProjectSubmission)).all()
        judges = session.exec(select(JudgeProfile)).all()
        
        if not submissions or not judges:
            broadcaster.broadcast("[System] Bipartite reviewer assignment failed: No submissions or judges found.")
            return
            
        # Build cost matrix
        num_subs = len(submissions)
        num_judges = len(judges)
        
        cost_matrix = np.ones((num_subs, num_judges))
        
        for i, sub in enumerate(submissions):
            sub_tags = set([t.strip().lower() for t in (sub.tags or "").split(",") if t.strip()])
            
            # Fetch sub team institution
            team = session.get(Team, sub.team_id)
            team_inst = getattr(team, "institution", None) or ""
            
            for j, judge in enumerate(judges):
                judge_tags = set([t.strip().lower() for t in (judge.expertise or "").split(",") if t.strip()])
                
                # A. Expertise score
                intersection = len(sub_tags & judge_tags)
                union = len(sub_tags | judge_tags)
                exp_score = intersection / union if union > 0 else 0.1
                
                # B. Workload score
                workload_score = 1.0 - (judge.current_load / max(1, judge.max_projects))
                
                # C. Conflict score
                judge_inst = judge.institution or ""
                conflict_score = 0.0 if (judge_inst and team_inst and judge_inst.lower() == team_inst.lower()) else 1.0
                
                # D. Diversity score
                diversity_score = 1.0 if (i % 2 == j % 2) else 0.5
                
                final_score = 0.4 * exp_score + 0.3 * workload_score + 0.2 * conflict_score + 0.1 * diversity_score
                cost_matrix[i, j] = 1.0 - final_score
                
        # Run Hungarian Algorithm
        row_ind, col_ind = scipy.optimize.linear_sum_assignment(cost_matrix)
        
        # Clear previous assignments
        session.execute(text("TRUNCATE TABLE assignments CASCADE;"))
        session.commit()
        
        # Reset reviewer loads
        for judge in judges:
            judge.current_load = 0
            session.add(judge)
        session.commit()
        
        for r, c in zip(row_ind, col_ind):
            sub = submissions[r]
            judge = judges[c]
            
            assignment = Assignment(
                reviewer_id=judge.id,
                submission_id=sub.id
            )
            session.add(assignment)
            
            judge.current_load += 1
            session.add(judge)
            
            broadcaster.broadcast(f"[System] Notifying Reviewer ID {judge.id} of assigned Project ID {sub.id}", f"reviewer_assignment_{judge.id}")
            
        session.commit()
        broadcaster.broadcast("[System] Optimal Bipartite reviewer assignment matrix generated.", "state_update")

@celery_app.task
def bias_check_task(score_id: int, event_id: int):
    with Session(engine) as session:
        score = session.get(RawScore, score_id)
        if not score:
            return
            
        project = session.get(ProjectSubmission, score.project_id)
        judge = session.get(JudgeProfile, score.judge_id)
        if not project or not judge:
            return
            
        # Group evaluations
        all_scores = session.exec(select(RawScore)).all()
        if len(all_scores) < 3:
            return
            
        raws = [s.raw_score for s in all_scores]
        mean = np.mean(raws)
        std = np.std(raws)
        if std == 0:
            std = 1.0
            
        z_score = (score.raw_score - mean) / std
        
        if abs(z_score) > 2.0:
            bias_type = "High Score Outlier (Favoritism)" if z_score > 0 else "Low Score Outlier (Penalization)"
            
            score.bias_flag = True
            score.bias_type = bias_type
            session.add(score)
            
            alert = BiasAlert(
                reviewer_id=judge.id,
                submission_id=project.id,
                type=bias_type,
                z_score=float(z_score)
            )
            session.add(alert)
            
            audit = AuditLog(
                action="BIAS_ALERT",
                details=f"[Bias Check Task] Reviewer {judge.id} scoring Project {project.id}: {bias_type} detected (|z-score| = {abs(z_score):.2f})"
            )
            session.add(audit)
            session.commit()
            
            # Publish to Redis channel
            r = redis.from_url("redis://localhost:6379")
            r.publish(f"bias:event:{event_id}", f"Alert ID {alert.id}: Reviewer {judge.id} scored Project {project.id} with z-score {z_score:.2f}")
            
            broadcaster.broadcast(
                f"[Bias Check Task] ALARM: potential {bias_type} detected for Project ID {project.id} (|z-score| = {abs(z_score):.2f})",
                "state_update"
            )

@celery_app.task
def result_generation_task(event_id: int):
    broadcaster.broadcast(f"[System] Initiating result generation for Event {event_id}...")
    with Session(engine) as session:
        scores = session.exec(select(RawScore).where(RawScore.bias_flag == False)).all()
        if not scores:
            broadcaster.broadcast("[System] Result generation failed: No unbiased scores found.")
            return
            
        sub_scores = {}
        for s in scores:
            if s.project_id not in sub_scores:
                sub_scores[s.project_id] = []
            sub_scores[s.project_id].append(s)
            
        results_list = []
        for sub_id, score_list in sub_scores.items():
            avg_innov = np.mean([s.innovation for s in score_list])
            avg_tech = np.mean([s.tech for s in score_list])
            avg_feas = np.mean([s.feasibility for s in score_list])
            avg_pres = np.mean([s.presentation for s in score_list])
            
            weighted_score = avg_innov * 0.30 + avg_tech * 0.30 + avg_feas * 0.25 + avg_pres * 0.15
            results_list.append({
                "submission_id": sub_id,
                "raw_weighted": weighted_score,
                "innovation": avg_innov,
                "tech": avg_tech
            })
            
        if not results_list:
            return
            
        raw_scores_vals = [r["raw_weighted"] for r in results_list]
        min_s = min(raw_scores_vals)
        max_s = max(raw_scores_vals)
        denom = max_s - min_s
        if denom == 0:
            denom = 1.0
            
        for r in results_list:
            r["final_score"] = float(round((r["raw_weighted"] - min_s) / denom * 100.0, 2))
            
        results_list.sort(key=lambda x: (x["final_score"], x["innovation"]), reverse=True)
        
        session.execute(text("TRUNCATE TABLE results CASCADE;"))
        session.commit()
        
        for rank, r in enumerate(results_list, start=1):
            sub = session.get(ProjectSubmission, r["submission_id"])
            feedback = None
            if rank <= 10:
                feedback = f"Great effort on '{sub.title}'! The solution displays strong feasibility and technical competence. To improve, focus on expanding the user interface polishing and providing detailed error diagnostics in the next iteration."
                    
            res = Result(
                submission_id=r["submission_id"],
                final_score=r["final_score"],
                rank=rank,
                feedback=feedback
            )
            session.add(res)
            
        session.commit()
        
        broadcaster.broadcast(f"[System] Final standings published: results:published:{event_id}", f"results:published:{event_id}")
        broadcaster.broadcast(f"[System] Final standings published: results:published:{event_id}", "state_update")


# API routes
@app.post("/register", status_code=201)
@app.post("/api/register", status_code=201)
def register_workflow(dto: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == dto.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
        
    hashed = bcrypt.hashpw(dto.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        email=dto.email,
        full_name=dto.name,
        role="PARTICIPANT",
        hashed_password=hashed,
        bio=dto.bio,
        skills=[s.strip().lower() for s in (dto.skills_text or "").split(",") if s.strip()],
        institution=dto.institution
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Registration failed: {e}")
        
    process_registration_task.delay(user.id)
    return {"status": "SUCCESS", "message": "User registered successfully", "user_id": user.id}

@app.post("/submit", status_code=201)
@app.post("/api/submit", status_code=201)
@app.post("/api/submissions/submit_new", status_code=201)
def submission_workflow(dto: HackathonSubmissionRequest, session: Session = Depends(get_session)):
    team = session.get(Team, dto.team_id)
    if not team:
        raise HTTPException(status_code=400, detail="Invalid Team ID")
        
    eval_closed_config = session.get(SystemConfig, "evaluation_closed")
    if eval_closed_config and eval_closed_config.value == "true":
        raise HTTPException(status_code=400, detail="Submission window has closed.")
        
    sub = ProjectSubmission(
        team_id=dto.team_id,
        title=dto.title,
        abstract=dto.description,
        tech_stack=dto.tags,
        track=dto.track,
        github_url=dto.github_url,
        demo_url=dto.demo_url,
        tags=dto.tags,
        state="PENDING_REVIEW"
    )
    session.add(sub)
    try:
        session.commit()
        session.refresh(sub)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Submission failed: {e}")
        
    process_submission_task.delay(sub.id)
    return {"status": "SUCCESS", "message": "Project submitted successfully", "submission_id": sub.id}

@app.post("/review/assign")
@app.post("/api/review/assign")
def assign_reviewers_workflow(event_id: int = 1, session: Session = Depends(get_session)):
    reviewer_assignment_task.delay(event_id)
    return {"status": "SUCCESS", "message": "Reviewer assignment task enqueued."}

@app.post("/review/score")
@app.post("/api/review/score")
def score_workflow(dto: ScoringRequest, session: Session = Depends(get_session)):
    eval_closed_config = session.get(SystemConfig, "evaluation_closed")
    if eval_closed_config and eval_closed_config.value == "true":
        raise HTTPException(status_code=400, detail="Evaluations have closed. Scoring locked.")
        
    innovation_wt = 0.30
    tech_wt = 0.30
    feasibility_wt = 0.25
    presentation_wt = 0.15
    computed_raw = (
        dto.innovation * innovation_wt +
        dto.tech * tech_wt +
        dto.feasibility * feasibility_wt +
        dto.presentation * presentation_wt
    )
    
    score = RawScore(
        judge_id=dto.judge_id,
        project_id=dto.project_id,
        innovation=dto.innovation,
        tech=dto.tech,
        feasibility=dto.feasibility,
        presentation=dto.presentation,
        criteria_scores={
            "innovation": dto.innovation,
            "tech": dto.tech,
            "feasibility": dto.feasibility,
            "presentation": dto.presentation
        },
        raw_score=float(round(computed_raw, 2))
    )
    session.add(score)
    try:
        session.commit()
        session.refresh(score)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Scoring failed: {e}")
        
    normalize_judge_scores(session, dto.judge_id)
    session.refresh(score)
    
    bias_check_task.delay(score.id, dto.event_id)
    return {"status": "SUCCESS", "message": "Evaluation recorded successfully.", "score_id": score.id}

@app.post("/results/generate")
@app.post("/api/results/generate")
def generate_results_workflow(event_id: int = 1, session: Session = Depends(get_session)):
    result_generation_task.delay(event_id)
    return {"status": "SUCCESS", "message": "Result generation task enqueued."}

@app.get("/api/assignments")
def get_assignments(session: Session = Depends(get_session)):
    assignments = session.exec(select(Assignment)).all()
    results = []
    for a in assignments:
        sub = session.get(ProjectSubmission, a.submission_id)
        judge = session.get(JudgeProfile, a.reviewer_id)
        judge_user = session.get(User, judge.user_id) if judge else None
        results.append({
            "id": a.id,
            "reviewer_id": a.reviewer_id,
            "reviewer_name": judge_user.full_name if judge_user else f"Judge {a.reviewer_id}",
            "submission_id": a.submission_id,
            "project_title": sub.title if sub else f"Project {a.submission_id}"
        })
    return results

@app.get("/api/results")
def get_results_list(session: Session = Depends(get_session)):
    results = session.exec(select(Result).order_by(Result.rank.asc())).all()
    out = []
    for r in results:
        sub = session.get(ProjectSubmission, r.submission_id)
        out.append({
            "id": r.id,
            "submission_id": r.submission_id,
            "project_title": sub.title if sub else f"Project {r.submission_id}",
            "final_score": r.final_score,
            "rank": r.rank,
            "feedback": r.feedback
        })
    return out

