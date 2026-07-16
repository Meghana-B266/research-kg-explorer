"""
LLM Service — Ollama wrapper for all AI-powered features.

Uses your local Ollama server (free, no API key, runs on your own machine).
Install: https://ollama.com/download
Then run:  ollama pull llama3.2      (one-time download, ~2GB)
And keep Ollama running in the background (it starts automatically after install).

Every feature (extraction, claim verification, negative-result detection,
citation-context analysis, hypothesis generation, ELI5 explanations, and
reading-path generation) goes through the two helpers below:

    chat()       -> plain text response
    chat_json()  -> parsed JSON response, with a feature-specific fallback
                    so one broken response never crashes the whole request.
"""

import json
import re
import httpx
from config import settings

OLLAMA_URL = settings.OLLAMA_URL.rstrip("/")
MODEL = settings.LLM_MODEL

# Local models are much slower than a hosted API, especially on CPU-only
# machines — give them plenty of time before giving up.
TIMEOUT = httpx.Timeout(180.0)


# ─── Core helpers ────────────────────────────────────────────────────────────

async def chat(system: str, user: str) -> str:
    """Plain text completion via Ollama."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.4},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "") or ""
    except httpx.ConnectError:
        print("⚠️ Could not reach Ollama at", OLLAMA_URL, "— is `ollama serve` / the Ollama app running?")
        return "Sorry, I couldn't generate an explanation right now — the local LLM (Ollama) isn't reachable."
    except Exception as e:
        print(f"⚠️ Ollama chat error: {e}")
        return "Sorry, I couldn't generate an explanation right now."


def _extract_json(text: str) -> str:
    """Strip markdown code fences if the model wraps JSON in ```json ... ```"""
    text = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()
    return text


async def chat_json(system: str, user: str, fallback: dict | list | None = None):
    """
    JSON-mode completion. `fallback` is returned (instead of a generic,
    possibly-wrong-shaped default) if the call or the parse fails.

    Ollama's `"format": "json"` option forces syntactically valid JSON output
    from the model (works with llama3.2, mistral, qwen2.5, and most current
    models), so this doesn't need markdown-fence-stripping tricks — but we
    keep `_extract_json` as a safety net for older/smaller models.
    """
    if fallback is None:
        fallback = {}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system + "\n\nRespond with ONLY valid JSON. No prose, no markdown fences."},
                        {"role": "user", "content": user},
                    ],
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data.get("message", {}).get("content", "{}") or "{}"
            return json.loads(_extract_json(text))
    except httpx.ConnectError:
        print("⚠️ Could not reach Ollama at", OLLAMA_URL, "— is `ollama serve` / the Ollama app running?")
        return fallback
    except Exception as e:
        print(f"⚠️ Ollama JSON error: {e}")
        return fallback


# ─── Feature functions ───────────────────────────────────────────────────────

PAPER_EXTRACTION_FALLBACK = {
    "title": "Unknown Title",
    "authors": [],
    "year": None,
    "abstract": "",
    "keywords": [],
    "methods": [],
    "datasets": [],
    "claims": [],
    "citations": [],
    "negative_results": [],
    "limitations": [],
}


async def extract_paper_entities(text: str) -> dict:
    """Pull structured metadata out of raw PDF text."""
    result = await chat_json(
        system="""You are a research-paper metadata extractor. Given raw extracted
PDF text (which may be messy — headers, footers, and line breaks may be jumbled),
extract structured data.

Return a JSON object with exactly these keys:
- title (string)
- authors (array of strings — full names, no affiliations)
- year (integer or null — publication year)
- abstract (string)
- keywords (array of strings — 5-10 core topical terms, lowercase)
- methods (array of strings — named techniques/models/algorithms used, e.g. "BERT", "transfer learning")
- datasets (array of strings — named datasets used)
- claims (array of strings — up to 5 direct quotes or close paraphrases of the paper's main results/claims,
  e.g. "Our model improves accuracy by 12% over the baseline")
- citations (array of objects like {"title": "...", "year": 2020} — up to 15 papers this paper cites,
  parsed from its reference list if present)
- negative_results (array of strings — sentences describing failures, non-improvements, or limitations)
- limitations (array of strings — explicitly stated limitations of the work)
""",
        user=text[:8000],
        fallback=PAPER_EXTRACTION_FALLBACK,
    )
    # Guard against the LLM omitting keys
    for key, default in PAPER_EXTRACTION_FALLBACK.items():
        result.setdefault(key, default)
    return result


async def verify_claim(claim: str, context: str) -> dict:
    """Claim Verifier — Evidence Strength Analyzer."""
    return await chat_json(
        system="""You are a skeptical peer reviewer. Evaluate how well-supported a
research claim is, based on the surrounding paper context provided.

Check specifically for:
- Dataset size / diversity used to test the claim
- Whether real baselines were compared against
- Whether statistical significance or multiple runs/seeds were reported
- Whether the wording overstates what the evidence shows (e.g. "significantly"
  without a significance test)

Return JSON with:
{
  "strength": "strong" | "moderate" | "weak",
  "score": <integer 0-100>,
  "verdict": "<one or two sentence explanation, e.g. 'Claim is weak — tested only on a small dataset with no strong baseline comparison.'>",
  "evidence_found": ["<short bullet of supporting evidence found>", ...],
  "gaps": ["<short bullet of what's missing, e.g. 'no statistical significance test'>", ...]
}""",
        user=f"Claim: {claim}\n\nPaper context:\n{context}",
        fallback={
            "strength": "unknown",
            "score": 0,
            "verdict": "Could not evaluate this claim — LLM analysis failed.",
            "evidence_found": [],
            "gaps": [],
        },
    )


async def detect_negative_results(text: str) -> list[dict]:
    """Negative Results Detector — surfaces buried failures/limitations."""
    result = await chat_json(
        system="""You find negative or null results hidden inside research papers —
sentences where the authors admit something did NOT work, did not improve
performance, failed on a dataset, or is a stated limitation. Look for phrases
like "did not improve", "failed to", "no significant difference", "limitation",
"did not generalize", "underperformed", etc., but rely on meaning, not just
keyword matching.

Return JSON: {"results": [
  {"phrase": "<the exact or near-exact sentence>", "context": "<1-2 sentences around it>", "type": "failure" | "limitation" | "no_improvement"},
  ...
]}
If none are found, return {"results": []}.""",
        user=text[:6000],
        fallback={"results": []},
    )
    if isinstance(result, dict):
        return result.get("results", [])
    return result if isinstance(result, list) else []


async def analyze_citation_context(text: str, title: str) -> dict:
    """Citation Context Analyzer — classify why a paper is cited."""
    return await chat_json(
        system="""You classify the intent of a citation based on the sentence(s)
surrounding it. Categories:
- "supporting": the citing paper builds on, agrees with, or uses the cited work
- "criticizing": the citing paper disputes, contrasts, or points out a weakness of the cited work
- "mentioning": neutral background reference, no clear stance

Return JSON:
{
  "type": "supporting" | "criticizing" | "mentioning",
  "sentiment": "positive" | "negative" | "neutral",
  "explanation": "<one sentence, e.g. 'This citation is critical — the paper disagrees with the cited method's assumptions.'>"
}""",
        user=f"Citation context: {text}\n\nCited paper title: {title}",
        fallback={"type": "mentioning", "sentiment": "neutral", "explanation": "Could not determine citation intent."},
    )


async def generate_hypothesis(graph_summary: str) -> dict:
    """Hypothesis Engine — proposes untested bridges between clusters."""
    return await chat_json(
        system="""You are a creative research strategist. Given a summary of a
knowledge graph (papers, authors, keywords, methods, and which papers are
disconnected/isolated from the citation network), propose bold, specific
research hypotheses that connect underexplored or disconnected clusters.

Favor hypotheses that:
- Bridge two keyword/method clusters that rarely co-occur in the same paper
- Point out an isolated paper's idea that nobody has built on
- Are falsifiable and specific enough to actually design an experiment for

Return JSON:
{
  "hypotheses": [
    {
      "title": "<short catchy name>",
      "hypothesis": "<the actual hypothesis, 1-3 sentences>",
      "rationale": "<why the graph suggests this is unexplored>",
      "connects": ["<concept/method A>", "<concept/method B>"]
    },
    ...
  ]
}
Propose 3-5 hypotheses.""",
        user=graph_summary,
        fallback={"hypotheses": []},
    )


async def explain_node(node_type: str, node_name: str, context: str) -> str:
    """ELI5 Click-to-Explain, grounded in the node's actual graph neighborhood."""
    return await chat(
        system="""Explain a knowledge-graph node in plain, beginner-friendly
language. Do NOT give a generic textbook definition — ground your explanation
in the specific graph context provided (who uses it, what it connects to, how
many other things reference it, etc). Keep it to 3-5 sentences.""",
        user=f"Node type: {node_type}\nNode name: {node_name}\n\nGraph context:\n{context}",
    )


async def generate_reading_path(goal: str, papers: list) -> dict:
    """Smart Reading Path Generator — ordered list from foundational to cutting-edge."""
    papers_summary = "\n".join(
        f"- [{p.get('year', '?')}] \"{p.get('title', 'Untitled')}\" "
        f"(pagerank={round(p.get('pagerank') or 0, 4)}, keywords={', '.join(p.get('keywords') or [])})"
        for p in papers
    )
    return await chat_json(
        system="""You build an ordered reading path through research papers for
someone with a specific learning goal. Order from foundational (older, higher
PageRank / more foundational keywords) to cutting-edge (newer, more
specialized). Only choose from the papers provided — do not invent papers.

Return JSON:
{
  "goal": "<restated goal>",
  "reading_path": [
    {"title": "<paper title from the list>", "year": <int or null>, "why": "<1 sentence on why this comes at this point in the path>"},
    ...
  ],
  "note": "<optional 1-sentence caveat, e.g. if the graph doesn't fully cover the goal>"
}""",
        user=f"Learning goal: {goal}\n\nAvailable papers (already sorted by PageRank):\n{papers_summary}",
        fallback={"goal": goal, "reading_path": [], "note": "Could not generate a reading path — LLM call failed."},
    )
