"""
Analysis Router — Claim Verifier, Negative Results, Citation Context Analyzer
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.neo4j_client import neo4j_client
from services.llm_service import verify_claim, detect_negative_results, analyze_citation_context

router = APIRouter()


@router.get("/claims/{paper_id}")
async def get_paper_claims(paper_id: str):
    """Get all verified claims for a paper"""
    rows = await neo4j_client.run("""
        MATCH (p:Paper {id: $id})-[:MAKES_CLAIM]->(c:Claim)
        RETURN c.text as text, c.strength as strength,
               c.score as score, c.verdict as verdict
    """, id=paper_id)
    return {"paper_id": paper_id, "claims": rows}


@router.get("/negative-results/{paper_id}")
async def get_negative_results(paper_id: str):
    """Get detected negative results for a paper"""
    rows = await neo4j_client.run("""
        MATCH (p:Paper {id: $id})-[:HAS_NEGATIVE_RESULT]->(n:NegativeResult)
        RETURN n.phrase as phrase, n.context as context, n.type as type
    """, id=paper_id)
    return {"paper_id": paper_id, "negative_results": rows}


@router.get("/all-negative-results")
async def all_negative_results():
    """All negative results across the graph"""
    rows = await neo4j_client.run("""
        MATCH (p:Paper)-[:HAS_NEGATIVE_RESULT]->(n:NegativeResult)
        RETURN p.title as paper, p.year as year,
               n.phrase as phrase, n.type as type
        ORDER BY p.year DESC
    """)
    return {"results": rows}


@router.get("/citations/{paper_id}")
async def get_citation_contexts(paper_id: str):
    """Get citation intent analysis for a paper's references"""
    rows = await neo4j_client.run("""
        MATCH (p:Paper {id: $id})-[r:CITES]->(cited:Paper)
        RETURN cited.title as cited_title, cited.year as cited_year,
               r.intent as intent, r.sentiment as sentiment,
               r.explanation as explanation
    """, id=paper_id)
    return {"paper_id": paper_id, "citations": rows}


class ClaimRequest(BaseModel):
    claim: str
    context: str


@router.post("/verify-claim")
async def verify_single_claim(req: ClaimRequest):
    """On-demand claim verification"""
    result = await verify_claim(req.claim, req.context)
    return result