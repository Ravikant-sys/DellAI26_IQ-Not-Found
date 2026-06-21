import asyncio
import json
import datetime
from typing import List, Dict, Any, Callable
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.sybil import check_duplicates
from app.agents.matcher import match_projects_to_judges
from app.database import engine
from sqlmodel import Session
from app.models import ProjectSubmission, AuditLog
from app.agents.comm_agent import analyze_sentiment_and_tone, predict_optimal_send_time, get_multilingual_template

import time

# Global Real-time SSE Broadcaster
class SSEBroadcaster:
    def __init__(self):
        self.listeners: List[asyncio.Queue] = []
        self.loop = None

    def set_loop(self, loop):
        self.loop = loop

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.listeners:
            self.listeners.remove(q)

    def broadcast(self, message: str, event_type: str = "log"):
        payload = json.dumps({"text": message, "timestamp": str(time.time())})
        data = f"event: {event_type}\ndata: {payload}\n\n"
        if self.loop and self.loop.is_running():
            for q in self.listeners:
                self.loop.call_soon_threadsafe(q.put_nowait, data)
        else:
            try:
                loop = asyncio.get_event_loop()
                for q in self.listeners:
                    loop.call_soon_threadsafe(q.put_nowait, data)
            except Exception:
                pass

broadcaster = SSEBroadcaster()

# Workflow Nodes
def sybil_node(state: AgentState) -> Dict[str, Any]:
    sub_id = state["submission_id"]
    logs = list(state.get("logs", []))
    
    msg = f"[Registration Agent] Starting verification for Project ID {sub_id}: '{state['project_title']}'"
    logs.append(msg)
    broadcaster.broadcast(msg)
    
    with Session(engine) as session:
        submission = session.get(ProjectSubmission, sub_id)
        if not submission:
            msg = f"[Registration Agent] ERROR: Submission ID {sub_id} not found."
            logs.append(msg)
            broadcaster.broadcast(msg)
            return {"logs": logs, "status": "FAILED"}
            
        if submission.state == "APPROVED":
            msg = f"[Registration Agent] HITL Approved override detected. Bypassing duplicate detection."
            logs.append(msg)
            broadcaster.broadcast(msg)
            return {"logs": logs, "status": "VERIFIED"}
            
        is_dup, match_id, match_score = check_duplicates(session, submission)
        
        if is_dup:
            msg = f"[Registration Agent] ALARM: Plagiarism similarity detected (Similarity Score: {match_score:.4f})"
            logs.append(msg)
            broadcaster.broadcast(msg)
            
            msg = f"[Registration Agent] Flagged duplicate against Project ID {match_id}."
            logs.append(msg)
            broadcaster.broadcast(msg)
            
            submission.state = "FLAGGED_DUPLICATE"
            session.add(submission)
            
            audit = AuditLog(
                action="DUPLICATE_ALERT",
                details=f"Project {sub_id} flagged as duplicate of {match_id} (sim={match_score:.4f})"
            )
            session.add(audit)
            session.commit()
            
            broadcaster.broadcast(f"[System] State updated: FLAGGED_DUPLICATE for Project ID {sub_id}", "state_update")
            
            return {
                "logs": logs, 
                "status": "FLAGGED_DUPLICATE",
                "decision_metadata": {"matched_project_id": match_id, "similarity": match_score}
            }
        else:
            msg = f"[Registration Agent] OK: No duplicate submissions detected (Max similarity: {match_score:.4f})."
            logs.append(msg)
            broadcaster.broadcast(msg)
            
            submission.state = "PENDING_REVIEW"
            session.add(submission)
            session.commit()
            
            broadcaster.broadcast(f"[System] State updated: PENDING_REVIEW for Project ID {sub_id}", "state_update")
            return {"logs": logs, "status": "VERIFIED"}

def matching_node(state: AgentState) -> Dict[str, Any]:
    sub_id = state["submission_id"]
    logs = list(state.get("logs", []))
    
    if state["status"] == "FLAGGED_DUPLICATE":
        return {"logs": logs}
        
    msg = f"[Matcher Agent] Invoking Multi-Objective Matcher optimization for Project ID {sub_id}..."
    logs.append(msg)
    broadcaster.broadcast(msg)
    
    with Session(engine) as session:
        matches = match_projects_to_judges(session)
        if matches:
            matched_judge_id = None
            score_bd = None
            
            for j_id, p_id, final_score, bd in matches:
                if p_id == sub_id:
                    matched_judge_id = j_id
                    score_bd = bd
                    break
                    
            if matched_judge_id:
                msg = (
                    f"[Matcher Agent] Optimization Solved: Assigned Project {sub_id} to Judge {matched_judge_id} "
                    f"(Score: {score_bd['final_score']} | Expertise: {score_bd['expertise']}, "
                    f"Workload Score: {score_bd['workload']}, Conflict Avoided: {score_bd['conflict_avoided']}, "
                    f"Diversity Score: {score_bd['diversity']})"
                )
                logs.append(msg)
                broadcaster.broadcast(msg)
                
                sub = session.get(ProjectSubmission, sub_id)
                if sub:
                    sub.state = "MATCHED"
                    session.add(sub)
                    
                    # Update audit
                    audit = AuditLog(
                        action="JUDGE_MATCHED",
                        details=(
                            f"Project {sub_id} matched to Judge {matched_judge_id}. "
                            f"Score={score_bd['final_score']}, Expertise={score_bd['expertise']}, "
                            f"Workload={score_bd['workload']}, ConflictAvoided={score_bd['conflict_avoided']}, "
                            f"Diversity={score_bd['diversity']}"
                        )
                    )
                    session.add(audit)
                    session.commit()
                    
                broadcaster.broadcast(f"[System] State updated: MATCHED for Project ID {sub_id}", "state_update")
                return {"logs": logs, "status": "MATCHED"}
            
        msg = f"[Matcher Agent] Optimization finished: Project {sub_id} remains in queue for next matching iteration."
        logs.append(msg)
        broadcaster.broadcast(msg)
        return {"logs": logs}

def enrichment_node(state: AgentState) -> Dict[str, Any]:
    sub_id = state["submission_id"]
    logs = list(state.get("logs", []))
    
    msg = f"[Insights Agent] Running automated skill extraction, predictive analytics, and personalized communications generation for Project ID {sub_id}..."
    logs.append(msg)
    broadcaster.broadcast(msg)
    
    with Session(engine) as session:
        sub = session.get(ProjectSubmission, sub_id)
        if not sub:
            return {"logs": logs}
            
        # 1. Skill Extraction
        skills_dict = ["react", "next.js", "spring boot", "fastapi", "postgresql", "postgres", "dbscan", "hungarian", "scipy", "scikit-learn", "tensorflow", "pytorch", "rust", "go", "docker", "kubernetes", "aws", "python", "java", "javascript", "tailwind"]
        extracted = []
        text_to_scan = f"{sub.title} {sub.abstract} {sub.tech_stack}".lower()
        for skill in skills_dict:
            if skill in text_to_scan:
                extracted.append(skill)
        if not extracted:
            extracted = ["general hacking"]
        sub.extracted_skills = extracted
        
        # 2. Predictive Analytics
        # Predictive success score = baseline 0.70 + (tech stack items count * 0.05) + (abstract length * 0.0005)
        # Clamped between 0.65 and 0.98
        stack_count = len([x for x in sub.tech_stack.split(",") if x.strip()])
        word_count = len(sub.abstract.split())
        raw_predictive = 0.70 + (stack_count * 0.04) + (word_count * 0.0005)
        sub.predictive_success_score = float(min(0.98, max(0.65, raw_predictive)))
        
        # 3. Tone & Multilingual Classification
        tone = analyze_sentiment_and_tone(sub.abstract)
        
        # Detect regional language
        lang = "en"
        lower_abstract = sub.abstract.lower()
        if any(w in lower_abstract for w in ["madrid", "mexico", "barcelona", "spanish", "espanol", "latam", "colombia"]):
            lang = "es"
        elif any(w in lower_abstract for w in ["india", "rural", "mumbai", "delhi", "hindi", "bengaluru", "priya"]):
            lang = "hi"
            
        # Optimize send timing
        creation_time = sub.created_at if sub.created_at else datetime.datetime.now()
        timing = predict_optimal_send_time(creation_time)
        
        # 4. Personalized Multilingual Communication Generation
        personalized_email = get_multilingual_template(
            tone=tone,
            team_id=sub.team_id,
            title=sub.title,
            skills=extracted,
            success_score=sub.predictive_success_score,
            lang=lang
        )
        
        # Attach scheduling metadata to the header of the email
        sub.generated_email = (
            f"--- TIMING ENGINE: OPTIMIZED SEND SLOT ---\n"
            f"Scheduled At: {timing['scheduled_time']}\n"
            f"Strategy Reason: {timing['reason']}\n"
            f"Selected Language Profile: {lang.upper()}\n"
            f"Target Tone Category: {tone}\n"
            f"-----------------------------------------\n\n"
            f"{personalized_email}"
        )
        
        # 5. Promotional Content Generation
        sub.generated_promo = (
            f"🚀 [Tone: {tone}] Project Alert: Team {sub.team_id} is building '{sub.title}'! "
            f"Leveraging a stack of {sub.tech_stack}, they are targeting: {', '.join(extracted)}. "
            f"Real-time progress tracked by the Dell Agentic OS. #DellFutureMinds2026 #AgenticOS #AI"
        )
        
        session.add(sub)
        
        # Log audit entry
        audit = AuditLog(
            action="PROJECT_ENRICHED",
            details=f"Project {sub_id} enriched: skills={extracted}, success_prob={sub.predictive_success_score:.2f}, lang={lang}, tone={tone}"
        )
        session.add(audit)
        session.commit()
        predictive_score_val = sub.predictive_success_score
        
    msg = f"[Insights Agent] SUCCESS: Extracted skills: {extracted} | Predictive Success Score: {predictive_score_val * 100:.1f}%"
    logs.append(msg)
    broadcaster.broadcast(msg)
    
    msg = f"[Communication Agent] Generated optimized {lang.upper()} email with tone {tone} (Timing reason: {timing['reason']})."
    logs.append(msg)
    broadcaster.broadcast(msg)
    
    msg = f"[Promotion Agent] Generated social promotion draft for Project ID {sub_id}."
    logs.append(msg)
    broadcaster.broadcast(msg)
    
    broadcaster.broadcast(f"[System] State updated: ENRICHED for Project ID {sub_id}", "state_update")
    return {"logs": logs, "status": "ENRICHED"}

# Compile LangGraph Workflow
workflow = StateGraph(AgentState)
workflow.add_node("sybil", sybil_node)
workflow.add_node("matcher", matching_node)
workflow.add_node("enrichment", enrichment_node)

workflow.set_entry_point("sybil")
workflow.add_conditional_edges(
    "sybil",
    lambda state: "matcher" if state["status"] == "VERIFIED" else END,
    {
        "matcher": "matcher",
        END: END
    }
)
workflow.add_edge("matcher", "enrichment")
workflow.add_edge("enrichment", END)

agent_workflow = workflow.compile()
