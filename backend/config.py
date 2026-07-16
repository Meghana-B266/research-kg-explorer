"""
Configuration and environment settings
"""
from dotenv import load_dotenv
from pathlib import Path

# Force load .env from backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Ollama (local LLM — free, no API key needed)
    OLLAMA_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2"   # run `ollama pull llama3.2` first — see setup guide

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # App
    MAX_UPLOAD_MB: int = 50
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()