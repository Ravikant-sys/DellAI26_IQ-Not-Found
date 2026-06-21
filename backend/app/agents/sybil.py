import hashlib
from typing import List, Tuple, Optional
import numpy as np
from sklearn.cluster import DBSCAN
from sqlmodel import Session, select
from app.models import ProjectSubmission, AuditLog
from app.database import engine

def generate_text_embedding(text: str) -> List[float]:
    """
    Generates a deterministic 1536-dimensional embedding based on bigram frequencies.
    Produces a unit vector suitable for cosine similarity.
    """
    hasher = hashlib.sha256()
    hasher.update(text.encode("utf-8"))
    seed = int(hasher.hexdigest(), 16) % (2**32)
    
    # Deterministic RNG based on text content
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(1536) * 0.1 # Base noise
    
    # Overlay bigram frequencies to capture textual similarity
    text_lower = text.lower()
    for i in range(len(text_lower) - 1):
        bigram = text_lower[i:i+2]
        idx = int(hashlib.md5(bigram.encode()).hexdigest(), 16) % 1536
        vec[idx] += 2.5
        
    # Normalize to L2 unit norm
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
        
    return vec.tolist()

def check_duplicates(
    session: Session, 
    new_submission: ProjectSubmission, 
    epsilon: float = 0.15
) -> Tuple[bool, Optional[int], float]:
    """
    Calculates cosine distances between the new submission and existing ones.
    Uses DBSCAN clustering as a verification tool to check if it joins an existing cluster.
    """
    # Fetch all other approved or pending submissions
    statement = select(ProjectSubmission).where(ProjectSubmission.id != new_submission.id)
    existing_submissions = session.exec(statement).all()
    
    if not existing_submissions:
        return False, None, 0.0
        
    # Construct embeddings matrix
    new_emb = np.array(new_submission.embedding)
    existing_embs = [np.array(sub.embedding) for sub in existing_submissions]
    
    # Check for direct pairwise duplicate (distance < epsilon)
    min_dist = 1.0
    duplicate_match_id = None
    
    for sub in existing_submissions:
        sub_emb = np.array(sub.embedding)
        # Cosine distance = 1 - cosine_similarity safely handled
        if len(new_emb) != len(sub_emb):
            similarity = 0.0
        else:
            similarity = np.dot(new_emb, sub_emb)
        distance = 1.0 - similarity
        
        if distance < min_dist:
            min_dist = distance
            if distance < epsilon:
                duplicate_match_id = sub.id
                
    # Run DBSCAN over the combined pool to verify clusters
    all_embeddings = existing_embs + [new_emb]
    n_samples = len(all_embeddings)
    
    # Precompute distance matrix
    dist_matrix = np.zeros((n_samples, n_samples))
    for i in range(n_samples):
        for j in range(i, n_samples):
            if len(all_embeddings[i]) != len(all_embeddings[j]):
                sim = 0.0
            else:
                sim = np.dot(all_embeddings[i], all_embeddings[j])
            dist = max(0.0, 1.0 - sim) # clamp float anomalies
            dist_matrix[i, j] = dist
            dist_matrix[j, i] = dist
            
    # DBSCAN will flag core points and noise
    db = DBSCAN(eps=epsilon, min_samples=2, metric="precomputed")
    labels = db.fit_predict(dist_matrix)
    
    # If the new submission (last element) is clustered (label != -1), it's a duplicate
    new_label = labels[-1]
    is_duplicate = new_label != -1 or duplicate_match_id is not None
    
    match_score = float(1.0 - min_dist)
    
    return is_duplicate, duplicate_match_id, match_score
