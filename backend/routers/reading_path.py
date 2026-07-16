"""
Smart Reading Path Generator Router
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.graph_service import get_all_papers, compute_pagerank
from services.llm_service import generate_reading_path
from database.neo4j_client import neo4j_client

router = APIRouter()


class ReadingPathRequest(BaseModel):
    goal: str
    max_papers: int = 10


@router.post("/generate")
async def create_reading_path(req: ReadingPathRequest):
    """Generate ordered reading list for a research goal"""
    # Ensure PageRank is computed
    papers = await neo4j_client.run("""
        MATCH (p:Paper)
        WHERE p.title IS NOT NULL
        OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
        OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
        RETURN p.id as id, p.title as title, p.year as year,
               p.abstract as abstract, p.pagerank as pagerank,
               collect(DISTINCT k.name) as keywords
        ORDER BY p.pagerank DESC NULLS LAST
        LIMIT $limit
    """, limit=req.max_papers * 2)

    if not papers:
        return {"error": "No papers in graph yet. Upload some PDFs first."}

    result = await generate_reading_path(req.goal, papers)
    return result