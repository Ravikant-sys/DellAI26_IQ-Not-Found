from sqlmodel import Session, SQLModel, Field, Column, select
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy import Float, Text, String, inspect
from app.database import engine
from typing import List, Optional, Dict
import json
import numpy as np

class ChromaEmbeddings(SQLModel, table=True):
    __tablename__ = "chroma_embeddings"
    id: str = Field(primary_key=True)
    collection_name: str = Field(index=True)
    document: str
    metadata_json: Dict[str, str] = Field(default_factory=dict, sa_column=Column(JSONB))
    embedding: List[float] = Field(sa_column=Column(ARRAY(Float)))

def init_chroma_table():
    inspector = inspect(engine)
    if "chroma_embeddings" not in inspector.get_table_names():
        ChromaEmbeddings.__table__.create(engine)

class MockCollection:
    def __init__(self, name: str):
        self.name = name
        init_chroma_table()
        
    def add(self, ids: List[str], embeddings: List[List[float]], documents: List[str], metadatas: Optional[List[Dict]] = None):
        metadatas = metadatas or [{} for _ in ids]
        with Session(engine) as session:
            for i in range(len(ids)):
                existing = session.get(ChromaEmbeddings, ids[i])
                if existing:
                    existing.collection_name = self.name
                    existing.document = documents[i]
                    existing.metadata_json = metadatas[i]
                    existing.embedding = embeddings[i]
                    session.add(existing)
                else:
                    item = ChromaEmbeddings(
                        id=ids[i],
                        collection_name=self.name,
                        document=documents[i],
                        metadata_json=metadatas[i],
                        embedding=embeddings[i]
                    )
                    session.add(item)
            session.commit()
            
    def query(self, query_embeddings: List[List[float]], n_results: int = 5):
        query_emb = query_embeddings[0]
        results = []
        with Session(engine) as session:
            items = session.exec(select(ChromaEmbeddings).where(ChromaEmbeddings.collection_name == self.name)).all()
            for item in items:
                a = np.array(item.embedding)
                b = np.array(query_emb)
                if len(a) != len(b):
                    sim = 0.0
                else:
                    norm_a = np.linalg.norm(a)
                    norm_b = np.linalg.norm(b)
                    if norm_a == 0 or norm_b == 0:
                        sim = 0.0
                    else:
                        sim = float(np.dot(a, b) / (norm_a * norm_b))
                results.append((item, sim))
                
        results.sort(key=lambda x: x[1], reverse=True)
        top = results[:n_results]
        
        return {
            "ids": [[x[0].id for x in top]],
            "distances": [[1.0 - x[1] for x in top]],
            "metadatas": [[x[0].metadata_json for x in top]],
            "documents": [[x[0].document for x in top]],
            "similarities": [[x[1] for x in top]]
        }

class MockClient:
    def __init__(self, path: Optional[str] = None):
        pass
    def get_or_create_collection(self, name: str):
        return MockCollection(name)

def PersistentClient(path: Optional[str] = None):
    return MockClient(path)

def Client():
    return MockClient()
