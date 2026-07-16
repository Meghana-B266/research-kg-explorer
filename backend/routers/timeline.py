"""
Timeline Router — graph evolution by year
"""
from fastapi import APIRouter, Query
from services.graph_service import get_full_graph
from database.neo4j_client import neo4j_client

router = APIRouter()


@router.get("/snapshot")
async def get_timeline_snapshot(year: int = Query(...)):
    """Graph state at a given year"""
    data = await get_full_graph(year_filter=year)
    return data


@router.get("/stats")
async def get_yearly_stats():
    """Papers per year — for timeline bar chart"""
    rows = await neo4j_client.run("""
        MATCH (p:Paper)
        WHERE p.year IS NOT NULL
        RETURN p.year as year, count(p) as count
        ORDER BY p.year ASC
    """)
    return {"yearly_counts": rows}