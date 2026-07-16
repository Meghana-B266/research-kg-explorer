"""
LLM-Based Research Paper Knowledge Graph Explorer
Main FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import (
    papers,
    graph,
    authors,
    analysis,
    hypothesis,
    reading_path,
    timeline,
)
from database.neo4j_client import neo4j_client
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await neo4j_client.connect()
        print(" Neo4j connected ✓")
    except Exception as e:
        print(" Neo4j connection failed:", e)

    yield

    # Shutdown
    await neo4j_client.close()


app = FastAPI(
    title="Research KG Explorer API",
    description="LLM-powered Knowledge Graph for Research Papers",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router, prefix="/api/papers", tags=["Papers"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(authors.router, prefix="/api/authors", tags=["Authors"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(hypothesis.router, prefix="/api/hypothesis", tags=["Hypothesis"])
app.include_router(reading_path.router, prefix="/api/reading-path", tags=["Reading Path"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["Timeline"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}