from typing import List, TypedDict, Optional, Dict, Any

class AgentState(TypedDict):
    submission_id: int
    project_title: str
    abstract: str
    embedding: List[float]
    logs: List[str]
    status: str  # PENDING_REVIEW, FLAGGED_DUPLICATE, MATCHED, APPROVED
    decision_metadata: Dict[str, Any]
