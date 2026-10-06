"""
Graph Service — all Neo4j read/write operations for the knowledge graph
"""
import networkx as nx
from datetime import datetime
from database.neo4j_client import neo4j_client
from typing import Optional
import uuid


# ─── Write Operations ────────────────────────────────────────────────────────

async def save_paper(data: dict, full_text: str = "") -> str:
    """Upsert a paper and all its entities into Neo4j"""
    paper_id = data.get("id") or str(uuid.uuid4())

    # Create Paper node
    await neo4j_client.run("""
        MERGE (p:Paper {id: $id})
        SET p.title = $title,
            p.year = $year,
            p.abstract = $abstract,
            p.full_text = $full_text
        RETURN p.id
    """, id=paper_id, title=data.get("title", "Unknown"),
        year=data.get("year"), abstract=data.get("abstract", ""),
        full_text=full_text[:5000])

    # Authors
    for author_name in (data.get("authors") or []):
        if not author_name:
            continue
        await neo4j_client.run("""
            MERGE (a:Author {name: $name})
            WITH a
            MATCH (p:Paper {id: $pid})
            MERGE (a)-[:AUTHORED]->(p)
        """, name=author_name, pid=paper_id)

    # Keywords
    for kw in (data.get("keywords") or []):
        if not kw:
            continue
        await neo4j_client.run("""
            MERGE (k:Keyword {name: $name})
            WITH k
            MATCH (p:Paper {id: $pid})
            MERGE (p)-[:HAS_KEYWORD]->(k)
        """, name=kw.lower().strip(), pid=paper_id)

    # Methods
    for method in (data.get("methods") or []):
        if not method:
            continue
        await neo4j_client.run("""
            MERGE (m:Method {name: $name})
            WITH m
            MATCH (p:Paper {id: $pid})
            MERGE (p)-[:USES_METHOD]->(m)
        """, name=method.strip(), pid=paper_id)

    # Citations (store references, resolve later)
    for cite in (data.get("citations") or []):
        cite_title = cite.get("title", "")
        if not cite_title:
            continue
        await neo4j_client.run("""
            MERGE (ref:Paper {title: $title})
            ON CREATE SET ref.id = randomUUID(), ref.year = $year
            WITH ref
            MATCH (p:Paper {id: $pid})
            MERGE (p)-[:CITES]->(ref)
        """, title=cite_title, year=cite.get("year"), pid=paper_id)

    return paper_id


async def save_claim(paper_id: str, claim: str, analysis: dict):
    await neo4j_client.run("""
        MATCH (p:Paper {id: $pid})
        CREATE (c:Claim {
            text: $text,
            strength: $strength,
            score: $score,
            verdict: $verdict
        })
        MERGE (p)-[:MAKES_CLAIM]->(c)
    """, pid=paper_id, text=claim,
        strength=analysis.get("strength", "unknown"),
        score=analysis.get("score", 0),
        verdict=analysis.get("verdict", ""))


async def save_negative_result(paper_id: str, phrase: str, context: str, type_: str):
    await neo4j_client.run("""
        MATCH (p:Paper {id: $pid})
        CREATE (n:NegativeResult {phrase: $phrase, context: $ctx, type: $type})
        MERGE (p)-[:HAS_NEGATIVE_RESULT]->(n)
    """, pid=paper_id, phrase=phrase, ctx=context, type_=type_)


# ─── Read Operations ─────────────────────────────────────────────────────────

async def get_full_graph(year_filter: Optional[int] = None) -> dict:
    """Return all nodes and edges for visualization"""
    year_clause = "AND p.year <= $year" if year_filter else ""

    papers = await neo4j_client.run(f"""
        MATCH (p:Paper)
        WHERE p.title IS NOT NULL {year_clause}
        OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
        OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
        OPTIONAL MATCH (p)-[:USES_METHOD]->(m:Method)
        RETURN p, collect(DISTINCT a.name) as authors,
               collect(DISTINCT k.name) as keywords,
               collect(DISTINCT m.name) as methods
    """, year=year_filter)

    edges = await neo4j_client.run(f"""
        MATCH (p1:Paper)-[:CITES]->(p2:Paper)
        WHERE p1.title IS NOT NULL AND p2.title IS NOT NULL
        {year_clause.replace('p.year', 'p1.year')}
        RETURN p1.id as source, p2.id as target, 'CITES' as type
        UNION
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        WHERE p.title IS NOT NULL {year_clause}
        RETURN a.name as source, p.id as target, 'AUTHORED' as type
        UNION
        MATCH (p:Paper)-[:HAS_KEYWORD]->(k:Keyword)
        WHERE p.title IS NOT NULL {year_clause}
        RETURN p.id as source, k.name as target, 'HAS_KEYWORD' as type
        UNION
        MATCH (p:Paper)-[:USES_METHOD]->(m:Method)
        WHERE p.title IS NOT NULL {year_clause}
        RETURN p.id as source, m.name as target, 'USES_METHOD' as type
    """, year=year_filter)

    nodes = []
    seen_ids = set()

    for row in papers:
        p = row["p"]
        pid = p.get("id")
        nodes.append({
            "id": pid,
            "label": p.get("title", "")[:50],
            "type": "paper",
            "year": p.get("year"),
            "abstract": p.get("abstract", ""),
            "authors": row["authors"],
            "keywords": row["keywords"],
            "methods": row["methods"],
        })
        seen_ids.add(pid)

        for name in row["authors"]:
            if name and name not in seen_ids:
                nodes.append({"id": name, "label": name, "type": "author"})
                seen_ids.add(name)
        for name in row["keywords"]:
            if name and name not in seen_ids:
                nodes.append({"id": name, "label": name, "type": "keyword"})
                seen_ids.add(name)
        for name in row["methods"]:
            if name and name not in seen_ids:
                nodes.append({"id": name, "label": name, "type": "method"})
                seen_ids.add(name)

    return {"nodes": nodes, "edges": edges}

async def get_paper_by_id(paper_id: str) -> dict | None:
    rows = await neo4j_client.run("""
        MATCH (p:Paper {id: $id})
        OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
        OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
        OPTIONAL MATCH (p)-[:USES_METHOD]->(m:Method)
        OPTIONAL MATCH (p)-[:CITES]->(cited:Paper)
        OPTIONAL MATCH (p)-[:MAKES_CLAIM]->(c:Claim)
        OPTIONAL MATCH (p)-[:HAS_NEGATIVE_RESULT]->(n:NegativeResult)
        RETURN p,
               collect(DISTINCT a.name) as authors,
               collect(DISTINCT k.name) as keywords,
               collect(DISTINCT m.name) as methods,
               collect(DISTINCT cited.title) as citations,
               collect(DISTINCT c) as claims,
               collect(DISTINCT n) as negative_results
    """, id=paper_id)
    return rows[0] if rows else None


async def get_all_papers() -> list[dict]:
    rows = await neo4j_client.run("""
        MATCH (p:Paper)
        WHERE p.title IS NOT NULL
        OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
        OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
        RETURN p.id as id, p.title as title, p.year as year,
               p.abstract as abstract,
               collect(DISTINCT a.name) as authors,
               collect(DISTINCT k.name) as keywords
    """)
    return rows


async def get_author_papers(author_name: str) -> list[dict]:
    rows = await neo4j_client.run("""
        MATCH (a:Author {name: $name})-[:AUTHORED]->(p:Paper)
        OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
        OPTIONAL MATCH (p)-[:USES_METHOD]->(m:Method)
        RETURN p.id as id, p.title as title, p.year as year,
               collect(DISTINCT k.name) as keywords,
               collect(DISTINCT m.name) as methods
    """, name=author_name)
    return rows


async def get_all_authors() -> list[dict]:
    rows = await neo4j_client.run("""
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        RETURN a.name as name, count(p) as paper_count,
               collect(p.year) as years
    """)
    return rows


# ─── PageRank ────────────────────────────────────────────────────────────────

async def compute_pagerank() -> dict[str, float]:
    """Compute PageRank on citation graph using NetworkX"""
    edges = await neo4j_client.run("""
        MATCH (p1:Paper)-[:CITES]->(p2:Paper)
        RETURN p1.id as source, p2.id as target
    """)

    G = nx.DiGraph()
    for e in edges:
        if e["source"] and e["target"]:
            G.add_edge(e["source"], e["target"])

    if len(G.nodes) == 0:
        return {}

    pr = nx.pagerank(G, alpha=0.85)

    # Store back to Neo4j
    for node_id, score in pr.items():
        await neo4j_client.run("""
            MATCH (p:Paper {id: $id})
            SET p.pagerank = $score
        """, id=node_id, score=score)

    return pr


# ─── Author DNA / Fingerprint ────────────────────────────────────────────────

async def compute_author_fingerprint(author_name: str) -> dict:
    """Extract keyword+method frequency vector weighted by recency"""
    papers = await get_author_papers(author_name)
    if not papers:
        return {}

    current_year = datetime.now().year
    keyword_weights: dict[str, float] = {}
    method_weights: dict[str, float] = {}

    for paper in papers:
        year = paper.get("year") or current_year
        recency = 1 + (year - 2000) / 25  # Weight: older=1.0, newer≈2.0

        for kw in paper.get("keywords", []):
            if kw:
                keyword_weights[kw] = keyword_weights.get(kw, 0) + recency

        for method in paper.get("methods", []):
            if method:
                method_weights[method] = method_weights.get(method, 0) + recency

    # Normalize
    total = sum(keyword_weights.values()) + sum(method_weights.values()) or 1
    fingerprint = {}
    for k, v in keyword_weights.items():
        fingerprint[f"kw:{k}"] = v / total
    for m, v in method_weights.items():
        fingerprint[f"method:{m}"] = v / total

    return fingerprint


def cosine_similarity(vec1: dict, vec2: dict) -> float:
    """Cosine similarity between two sparse fingerprint dicts"""
    keys = set(vec1) | set(vec2)
    dot = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in keys)
    mag1 = sum(v ** 2 for v in vec1.values()) ** 0.5
    mag2 = sum(v ** 2 for v in vec2.values()) ** 0.5
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


async def compare_authors(name1: str, name2: str) -> dict:
    fp1 = await compute_author_fingerprint(name1)
    fp2 = await compute_author_fingerprint(name2)
    score = cosine_similarity(fp1, fp2)
    shared = [k for k in fp1 if k in fp2]
    return {
        "author1": name1,
        "author2": name2,
        "alignment_score": round(score * 100, 1),
        "shared_concepts": shared[:10],
        "author1_unique": [k for k in fp1 if k not in fp2][:5],
        "author2_unique": [k for k in fp2 if k not in fp1][:5],
    }


# ─── Graph Summary for Hypothesis Engine ─────────────────────────────────────

async def build_graph_summary() -> str:
    """Create a text summary of graph for LLM hypothesis generation"""
    stats = await neo4j_client.run("""
        MATCH (p:Paper) WITH count(p) as papers
        MATCH (a:Author) WITH papers, count(a) as authors
        MATCH (k:Keyword) WITH papers, authors, count(k) as keywords
        MATCH (m:Method) WITH papers, authors, keywords, count(m) as methods
        RETURN papers, authors, keywords, methods
    """)

    top_keywords = await neo4j_client.run("""
        MATCH (p:Paper)-[:HAS_KEYWORD]->(k:Keyword)
        RETURN k.name as kw, count(p) as cnt ORDER BY cnt DESC LIMIT 15
    """)

    top_methods = await neo4j_client.run("""
        MATCH (p:Paper)-[:USES_METHOD]->(m:Method)
        RETURN m.name as method, count(p) as cnt ORDER BY cnt DESC LIMIT 10
    """)

    isolated = await neo4j_client.run("""
        MATCH (p:Paper)
        WHERE NOT (p)-[:CITES]-() AND NOT ()-[:CITES]->(p)
        RETURN p.title as title LIMIT 5
    """)

    s = stats[0] if stats else {}
    return f"""
Graph has {s.get('papers', 0)} papers, {s.get('authors', 0)} authors,
{s.get('keywords', 0)} unique keywords, {s.get('methods', 0)} methods.

Top keywords: {', '.join(r['kw'] for r in top_keywords)}
Top methods: {', '.join(r['method'] for r in top_methods)}
Isolated papers (no citations): {', '.join(r['title'] for r in isolated[:3])}
"""
