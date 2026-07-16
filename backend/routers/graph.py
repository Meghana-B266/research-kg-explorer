"""
Graph Router — graph data for visualization and PageRank
"""
from fastapi import APIRouter, Query
from services.graph_service import get_full_graph, compute_pagerank
from services.llm_service import explain_node
from database.neo4j_client import neo4j_client
from typing import Optional

router = APIRouter()


@router.get("/")
async def get_graph(year: Optional[int] = Query(None)):
    """Full graph data — optionally filtered by year (timeline mode)"""
    data = await get_full_graph(year_filter=year)
    return data


@router.post("/pagerank")
async def run_pagerank():
    """Compute and store PageRank scores"""
    scores = await compute_pagerank()
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    # Fetch titles for top papers
    top_ids = [r[0] for r in ranked[:20]]
    rows = await neo4j_client.run("""
        MATCH (p:Paper) WHERE p.id IN $ids
        RETURN p.id as id, p.title as title, p.pagerank as score, p.year as year
        ORDER BY p.pagerank DESC
    """, ids=top_ids)

    return {"top_papers": rows, "total_nodes": len(scores)}


@router.get("/node-explain")
async def explain_graph_node(
    node_type: str = Query(...),
    node_name: str = Query(...),
    node_id: Optional[str] = Query(None),
):
    """ELI5: explain a node in the context of its graph neighborhood"""
    # Build neighborhood context
    if node_type == "paper" and node_id:
        neighbors = await neo4j_client.run("""
            MATCH (p:Paper {id: $id})
            OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
            OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
            OPTIONAL MATCH (p)-[:USES_METHOD]->(m:Method)
            OPTIONAL MATCH (p)-[:CITES]->(cited:Paper)
            OPTIONAL MATCH (citing:Paper)-[:CITES]->(p)
            RETURN collect(DISTINCT a.name) as authors,
                   collect(DISTINCT k.name) as keywords,
                   collect(DISTINCT m.name) as methods,
                   collect(DISTINCT cited.title) as cites,
                   collect(DISTINCT citing.title) as cited_by
        """, id=node_id)
        ctx = str(neighbors[0]) if neighbors else ""
    elif node_type == "author":
        neighbors = await neo4j_client.run("""
            MATCH (a:Author {name: $name})-[:AUTHORED]->(p:Paper)
            OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
            RETURN collect(DISTINCT p.title) as papers,
                   collect(DISTINCT k.name) as keywords
        """, name=node_name)
        ctx = str(neighbors[0]) if neighbors else ""
    else:
        ctx = f"This {node_type} appears in the research knowledge graph."

    explanation = await explain_node(node_type, node_name, ctx)
    return {"explanation": explanation}


@router.get("/years")
async def get_year_range():
    """Get min/max years in graph for timeline slider"""
    rows = await neo4j_client.run("""
        MATCH (p:Paper) WHERE p.year IS NOT NULL
        RETURN min(p.year) as min_year, max(p.year) as max_year
    """)
    if rows:
        return {"min_year": rows[0]["min_year"], "max_year": rows[0]["max_year"]}
    return {"min_year": 2018, "max_year": 2024}