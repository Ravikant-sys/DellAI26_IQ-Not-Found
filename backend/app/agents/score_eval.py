from typing import List
import numpy as np
from sqlmodel import Session, select
from app.models import RawScore, AuditLog

GLOBAL_MEAN = 7.0
GLOBAL_STD = 1.5

def normalize_judge_scores(session: Session, judge_id: int):
    """
    Recalculates and updates the normalized Z-scores for all evaluations 
    cast by a specific judge.
    Z = (X - Mean) / Std
    Normalized = Global_Mean + Z * Global_Std (clamped to [0.0, 10.0])
    """
    # Fetch all raw scores submitted by this judge
    statement = select(RawScore).where(RawScore.judge_id == judge_id)
    scores = session.exec(statement).all()
    
    if not scores:
        return
        
    raw_values = [s.raw_score for s in scores]
    n = len(raw_values)
    
    if n < 2:
        # If there's only 1 score, standard deviation is undefined/zero.
        # Set normalized score directly to raw score for now
        for s in scores:
            s.normalized_score = s.raw_score
            session.add(s)
        session.commit()
        return
        
    mean = np.mean(raw_values)
    std = np.std(raw_values)
    
    for s in scores:
        if std < 1e-5:
            # Judge gives the exact same score for everything
            z = 0.0
        else:
            z = (s.raw_score - mean) / std
            
        # Map Z-score back to global scale: mean=7.0, std=1.5
        norm_score = GLOBAL_MEAN + z * GLOBAL_STD
        # Clamp to [0, 10] range
        s.normalized_score = float(np.clip(norm_score, 0.0, 10.0))
        session.add(s)
        
    session.commit()
    
    # Audit log entry for normalization execution
    audit = AuditLog(
        action="BIAS_NORMALIZATION",
        details=f"Normalized {n} scores for Judge ID {judge_id}. Mean={mean:.2f}, Std={std:.2f}"
    )
    session.add(audit)
    session.commit()
