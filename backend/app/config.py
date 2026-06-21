import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://minion@localhost:5432/hackathon_os"
    )
    # Automatically toggle pgvector based on availability or environment
    USE_PGVECTOR: bool = os.getenv("USE_PGVECTOR", "False").lower() in ("true", "1", "yes")
    PROJECT_NAME: str = "State-Driven Agentic OS"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-12345")

    class Config:
        case_sensitive = True

settings = Settings()
