"""
Authors Router — author DNA fingerprint, comparison
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.graph_service import (
    get_all_authors, get_author_papers, compare_authors, compute_author_fingerprint
)

router = APIRouter()


@router.get("/")
async def list_authors():
    authors = await get_all_authors()
    return {"authors": authors}


@router.get("/{author_name}/fingerprint")
async def author_fingerprint(author_name: str):
    """Get author's intellectual DNA vector"""
    papers = await get_author_papers(author_name)
    if not papers:
        raise HTTPException(404, "Author not found or has no papers")
    fingerprint = await compute_author_fingerprint(author_name)
    top = sorted(fingerprint.items(), key=lambda x: x[1], reverse=True)[:20]
    return {
        "author": author_name,
        "paper_count": len(papers),
        "top_concepts": [{"concept": k, "weight": round(v, 4)} for k, v in top],
        "papers": papers,
    }


class CompareRequest(BaseModel):
    author1: str
    author2: str


@router.post("/compare")
async def compare_author_dna(req: CompareRequest):
    """Compare two authors' intellectual DNA"""
    result = await compare_authors(req.author1, req.author2)
    return result