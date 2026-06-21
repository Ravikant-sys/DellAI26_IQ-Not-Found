from typing import Dict, Any, List
import numpy as np
from sqlmodel import Session, select
from app.models import RawScore, ProjectSubmission, JudgeProfile, User, AuditLog
from app.agents.workflow import broadcaster

def detect_score_bias(session: Session, score_id: int) -> Dict[str, Any]:
    """
    Analyzes a newly submitted RawScore for potential evaluation bias.
    Dimensions checked:
      - Gender Bias
      - Geographic Bias
      - Institutional Bias
      - Language/Accent Bias
      - Tech Stack Bias
    If bias is detected, an AuditLog is created and a system-wide alert is broadcasted.
    """
    score = session.get(RawScore, score_id)
    if not score:
        return {"status": "error", "message": "Score not found"}
        
    project = session.get(ProjectSubmission, score.project_id)
    judge = session.get(JudgeProfile, score.judge_id)
    if not project or not judge:
        return {"status": "error", "message": "Project or Judge not found"}
        
    judge_user = session.get(User, judge.user_id)
    
    # 1. Fetch all other scores cast by this judge to establish a baseline
    other_scores = session.exec(
        select(RawScore).where(RawScore.judge_id == judge.id, RawScore.id != score.id)
    ).all()
    
    if not other_scores:
        # Not enough historical data to detect bias anomalies
        return {"status": "insufficient_data"}
        
    baseline_scores = [s.raw_score for s in other_scores]
    judge_mean = float(np.mean(baseline_scores))
    
    bias_signals = []
    
    # Text content of the submission for NLP heuristics
    abstract_lower = project.abstract.lower()
    title_lower = project.title.lower()
    full_text = f"{title_lower} {abstract_lower}"
    
    # ---- A. Gender Bias Check ----
    # Identify gender indicators in project team description or abstract
    gender_female_terms = ["she", "her", "female", "women", "girl", "grace", "ada", "emily", "priya", "sara", "girls"]
    has_female_indicator = any(term in full_text for term in gender_female_terms)
    
    if has_female_indicator:
        # Check if the score is significantly below the judge's baseline mean
        if score.raw_score < (judge_mean - 2.0):
            bias_signals.append({
                "dimension": "Gender Bias",
                "severity": "HIGH",
                "details": f"Score of {score.raw_score} is {judge_mean - score.raw_score:.2f} points below judge average ({judge_mean:.2f}) for a project with female/gender-representative indicators."
            })

    # ---- B. Geographic Bias Check ----
    geographic_terms = ["india", "africa", "asia", "local", "regional", "global south", "developing", "latin america", "rural"]
    has_geo_indicator = any(term in full_text for term in geographic_terms)
    
    if has_geo_indicator:
        if score.raw_score < (judge_mean - 2.0):
            bias_signals.append({
                "dimension": "Geographic Bias",
                "severity": "HIGH",
                "details": f"Score of {score.raw_score} is {judge_mean - score.raw_score:.2f} points below judge average ({judge_mean:.2f}) for a project containing geographic/regional indicators."
            })

    # ---- C. Institutional Bias Check ----
    institutional_terms = ["mit", "stanford", "iit", "harvard", "university", "college", "school", "academy"]
    has_inst_indicator = any(term in full_text for term in institutional_terms)
    
    if has_inst_indicator:
        # If the judge scores institutional projects significantly higher than their average (favoritism)
        if score.raw_score > (judge_mean + 2.0):
            bias_signals.append({
                "dimension": "Institutional Bias (Favoritism)",
                "severity": "MEDIUM",
                "details": f"Score of {score.raw_score} is {score.raw_score - judge_mean:.2f} points above judge average ({judge_mean:.2f}) for an institution-affiliated submission."
            })
        elif score.raw_score < (judge_mean - 2.0):
            bias_signals.append({
                "dimension": "Institutional Bias (Penalization)",
                "severity": "HIGH",
                "details": f"Score of {score.raw_score} is {judge_mean - score.raw_score:.2f} points below judge average ({judge_mean:.2f}) for an institution-affiliated submission."
            })

    # ---- D. Language/Accent Bias Check ----
    # Detect spelling issues or capitalization anomalies as grammar/non-native indicators
    # We count lowercase sentences, lowercase 'i', or simple typos
    typo_indicators = 0
    if " i " in project.abstract:
        typo_indicators += 1
    # Check if there are sentences starting with lowercase
    sentences = project.abstract.split(". ")
    for s in sentences:
        if s and s[0].islower():
            typo_indicators += 1
            
    if typo_indicators >= 2:
        if score.raw_score < (judge_mean - 2.0):
            bias_signals.append({
                "dimension": "Language/Accent Bias",
                "severity": "HIGH",
                "details": f"Score of {score.raw_score} is {judge_mean - score.raw_score:.2f} points below judge average ({judge_mean:.2f}) for a submission containing grammatical/typographical markers."
            })

    # ---- E. Technology Stack Bias Check ----
    # Check if the judge is biased towards or against the tech stack of the project
    judge_bio_lower = judge.bio.lower()
    tech_keywords = [t.strip().lower() for t in project.tech_stack.split(",") if t.strip()]
    
    # If the judge is an expert in this stack (overlap exists)
    has_tech_overlap = any(tech in judge_bio_lower for tech in tech_keywords)
    
    if has_tech_overlap:
        # Favoritism check: judge scores projects matching their own tech stack extremely high
        if score.raw_score > (judge_mean + 2.5):
            bias_signals.append({
                "dimension": "Technology Stack Bias (Favoritism)",
                "severity": "MEDIUM",
                "details": f"Score of {score.raw_score} is {score.raw_score - judge_mean:.2f} points above judge average ({judge_mean:.2f}) for a matching tech stack ({project.tech_stack})."
            })
    else:
        # Negative bias check: judge scores projects outside their expertise extremely low
        if score.raw_score < (judge_mean - 2.5):
            bias_signals.append({
                "dimension": "Technology Stack Bias (Penalization)",
                "severity": "HIGH",
                "details": f"Score of {score.raw_score} is {judge_mean - score.raw_score:.2f} points below judge average ({judge_mean:.2f}) for a non-expert tech stack ({project.tech_stack})."
            })

    # If any bias signals are detected, log them in AuditLog and broadcast
    if bias_signals:
        for signal in bias_signals:
            log_msg = f"[BIAS ALERT] Potential {signal['dimension']} detected for Project ID {project.id} (Judge {judge.id}): {signal['details']}"
            broadcaster.broadcast(log_msg)
            
            audit = AuditLog(
                action="BIAS_ALERT",
                details=f"Judge {judge.id} scoring Project {project.id}: {signal['dimension']} ({signal['severity']}) - {signal['details']}"
            )
            session.add(audit)
        session.commit()
        return {"status": "bias_detected", "signals": bias_signals}
        
    return {"status": "neutral"}
