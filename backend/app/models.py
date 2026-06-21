import json
from typing import List, Optional, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy import Float, Text, String
from app.config import settings

# Bind pgvector dynamically based on config
if settings.USE_PGVECTOR:
    try:
        from pgvector.sqlalchemy import Vector
        EmbeddingType = Vector(1536)
    except ImportError:
        EmbeddingType = ARRAY(Float)
else:
    EmbeddingType = ARRAY(Float)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    role: str = "PARTICIPANT" # PARTICIPANT, ORGANIZER, JUDGE
    hashed_password: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=True)
    )
    institution: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Team(SQLModel, table=True):
    __tablename__ = "teams"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    repo_url: Optional[str] = None
    status: str = "PENDING" # PENDING, VERIFIED, BLOCKED
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectSubmission(SQLModel, table=True):
    __tablename__ = "project_submissions"
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="teams.id", unique=True)
    title: str
    abstract: str
    tech_stack: str # Comma-separated list or JSON
    track: str = Field(default="General", index=True)
    state: str = "PENDING_REVIEW" # PENDING_REVIEW, FLAGGED_DUPLICATE, MATCHED, APPROVED
    github_url: Optional[str] = None
    demo_url: Optional[str] = None
    tags: Optional[str] = None # Comma-separated tags
    
    # Store embedding as pgvector or Float Array depending on configuration
    embedding: Optional[List[float]] = Field(
        default=None, 
        sa_column=Column(EmbeddingType, nullable=True)
    )
    
    # Automated PS1 enrichment fields
    extracted_skills: Optional[List[str]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=True)
    )
    generated_email: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True)
    )
    generated_promo: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True)
    )
    predictive_success_score: Optional[float] = Field(
        sa_column=Column(Float, nullable=True)
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class JudgeProfile(SQLModel, table=True):
    __tablename__ = "judge_profiles"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True)
    bio: str
    max_projects: int = 5
    expertise: Optional[str] = None # Comma-separated tags/skills
    current_load: int = Field(default=0)
    institution: Optional[str] = None
    
    capability_embedding: Optional[List[float]] = Field(
        default=None, 
        sa_column=Column(EmbeddingType, nullable=True)
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RawScore(SQLModel, table=True):
    __tablename__ = "raw_scores"
    id: Optional[int] = Field(default=None, primary_key=True)
    judge_id: int = Field(foreign_key="judge_profiles.id")
    project_id: int = Field(foreign_key="project_submissions.id")
    
    innovation: float = Field(default=5.0)
    tech: float = Field(default=5.0)
    feasibility: float = Field(default=5.0)
    presentation: float = Field(default=5.0)
    bias_flag: bool = Field(default=False)
    bias_type: Optional[str] = None
    
    # Dict storing specific criteria scores (e.g., {"innovation": 8, "feasibility": 9})
    criteria_scores: Dict[str, float] = Field(
        default_factory=dict, 
        sa_column=Column(JSONB, nullable=False)
    )
    
    raw_score: float
    normalized_score: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DuplicateFlag(SQLModel, table=True):
    __tablename__ = "duplicate_flags"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    similar_user_id: int = Field(foreign_key="users.id")
    similarity: float
    resolved: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Assignment(SQLModel, table=True):
    __tablename__ = "assignments"
    id: Optional[int] = Field(default=None, primary_key=True)
    reviewer_id: int = Field(foreign_key="judge_profiles.id")
    submission_id: int = Field(foreign_key="project_submissions.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BiasAlert(SQLModel, table=True):
    __tablename__ = "bias_alerts"
    id: Optional[int] = Field(default=None, primary_key=True)
    reviewer_id: int = Field(foreign_key="judge_profiles.id")
    submission_id: int = Field(foreign_key="project_submissions.id")
    type: str
    z_score: float
    resolved: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: Optional[int] = Field(default=None, primary_key=True)
    submission_id: int = Field(foreign_key="project_submissions.id", unique=True)
    final_score: float
    rank: int
    feedback: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EvaluationCriteria(SQLModel, table=True):
    __tablename__ = "evaluation_criteria"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    weight: float = Field(default=1.0)
    description: Optional[str] = None

class SystemConfig(SQLModel, table=True):
    __tablename__ = "system_config"
    key: str = Field(primary_key=True)
    value: str

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: str
    prev_hash: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    hash: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))


import hashlib
from sqlalchemy.event import listens_for
from sqlalchemy import text

_last_audit_hash = None

def reset_blockchain_cache():
    global _last_audit_hash
    _last_audit_hash = None

@listens_for(AuditLog, 'before_insert')
def before_insert_audit_log(mapper, connection, target):
    global _last_audit_hash
    if _last_audit_hash is None:
        try:
            result = connection.execute(text("SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1")).fetchone()
            _last_audit_hash = result[0] if (result and result[0]) else "0000000000000000000000000000000000000000000000000000000000000000"
        except Exception:
            _last_audit_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    
    target.prev_hash = _last_audit_hash
    if not target.timestamp:
        target.timestamp = datetime.utcnow()
    payload = f"{target.prev_hash}|{target.action}|{target.details}|{target.timestamp.isoformat()}"
    target.hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
    _last_audit_hash = target.hash

