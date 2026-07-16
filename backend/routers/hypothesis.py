"""
Hypothesis Engine Router
"""
from fastapi import APIRouter
from services.graph_service import build_graph_summary
from services.llm_service import generate_hypothesis

router = APIRouter()


@router.post("/generate")
async def generate_hypotheses():
    """Generate research hypotheses from the knowledge graph"""
    summary = await build_graph_summary()
    result = await generate_hypothesis(summary)
    return result