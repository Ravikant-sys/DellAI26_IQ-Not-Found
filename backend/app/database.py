from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
from app.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

def init_db():
    # Attempt to create extension if pgvector is enabled
    with Session(engine) as session:
        if settings.USE_PGVECTOR:
            try:
                session.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                session.commit()
                print("pgvector extension loaded successfully!")
            except Exception as e:
                session.rollback()
                print(f"Warning: Failed to load pgvector extension ({e}). Standard array fallback will be used.")
        else:
            print("pgvector extension disabled. Using standard array storage.")
        
        # Import models here to register them with SQLModel
        from app import models
        SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
