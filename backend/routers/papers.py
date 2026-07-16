"""
Papers Router — upload PDFs, list papers, get paper details
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from services.pdf_service import extract_text_from_pdf, find_citation_context
from services.graph_service import save_paper, get_all_papers, get_paper_by_id, save_claim, save_negative_result
from services.llm_service import (
    extract_paper_entities, verify_claim, detect_negative_results,
    analyze_citation_context
)

router = APIRouter()


@router.post("/upload")
async def upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a PDF — extract, parse, and store in graph"""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    # Extract text
    full_text, file_hash = await extract_text_from_pdf(file)
    if len(full_text) < 100:
        raise HTTPException(422, "Could not extract text from PDF")

    # LLM extraction
    entities = await extract_paper_entities(full_text)
    entities["id"] = file_hash

    # Save main paper
    paper_id = await save_paper(entities, full_text)

    # Background: process claims + negative results (slow)
    background_tasks.add_task(
        _process_paper_analysis, paper_id, entities, full_text
    )

    return {
        "paper_id": paper_id,
        "title": entities.get("title"),
        "authors": entities.get("authors", []),
        "year": entities.get("year"),
        "keywords": entities.get("keywords", []),
        "methods": entities.get("methods", []),
        "status": "saved — analysis running in background",
    }


async def _process_paper_analysis(paper_id: str, entities: dict, full_text: str):
    """Background task: verify claims, detect negative results, analyze citations"""
    # Claim verification
    for claim in (entities.get("claims") or [])[:5]:  # limit to 5 claims
        try:
            analysis = await verify_claim(claim, full_text[:3000])
            await save_claim(paper_id, claim, analysis)
        except Exception:
            pass

    # Negative results
    try:
        neg_results = await detect_negative_results(full_text)
        if isinstance(neg_results, dict):
            neg_results = neg_results.get("results", [])
        for nr in (neg_results or []):
            await save_negative_result(
                paper_id, nr.get("phrase", ""), nr.get("context", ""), nr.get("type", "")
            )
    except Exception:
        pass

    # Citation context
    for cite in (entities.get("citations") or [])[:5]:
        cite_title = cite.get("title", "")
        if not cite_title:
            continue
        try:
            ctx = find_citation_context(full_text, cite_title)
            if ctx:
                analysis = await analyze_citation_context(ctx, cite_title)
                from database.neo4j_client import neo4j_client
                await neo4j_client.run("""
                    MATCH (p:Paper {id: $pid})-[r:CITES]->(ref:Paper {title: $title})
                    SET r.intent = $intent, r.sentiment = $sentiment, r.explanation = $explanation
                """, pid=paper_id, title=cite_title,
                    intent=analysis.get("type", "mentioning"),
                    sentiment=analysis.get("sentiment", "neutral"),
                    explanation=analysis.get("explanation", ""))
        except Exception:
            pass


@router.get("/")
async def list_papers():
    papers = await get_all_papers()
    return {"papers": papers, "count": len(papers)}


@router.get("/{paper_id}")
async def get_paper(paper_id: str):
    paper = await get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(404, "Paper not found")
    return paper