# Research Knowledge Graph Explorer

An AI-assisted, **fully local** knowledge graph system for research paper analysis. Upload a PDF, and the system extracts authors, keywords, methods, claims, and citations using a locally-hosted LLM (Ollama), then stores everything as a connected graph in Neo4j — so you can visually explore how your papers relate to each other, verify claims, detect buried negative results, generate cross-paper research hypotheses, and get a guided reading path toward a learning goal.

No cloud API, no subscription, no data ever leaves your machine.

---

## Features

- **PDF upload & extraction** — pulls text from a PDF and uses a local LLM to extract title, authors, year, abstract, keywords, methods, datasets, claims, citations, and negative results.
- **Knowledge graph storage** — persists everything in Neo4j as deduplicated `Paper`, `Author`, `Keyword`, and `Method` nodes, connected by `AUTHORED`, `HAS_KEYWORD`, `USES_METHOD`, and `CITES` relationships.
- **Claim verification** — rates each extracted claim's strength (strong / moderate / weak) based on how well it's supported in the text.
- **Negative result detection** — surfaces admitted failures or null results that are easy to miss on a normal read.
- **Citation context analysis** — classifies how a paper cites its references (supporting, contrasting, etc.).
- **Hypothesis generation** — looks for under-connected clusters in the graph and proposes a research idea bridging them.
- **PageRank-based reading path** — orders a set of papers from foundational to advanced, toward a stated learning goal.
- **Author fingerprinting** — summarizes an author's dominant keywords/methods, and can compare two authors.
- **Interactive graph visualization** — force-directed graph (Sigma.js), with node-type filtering, a year timeline slider, and an AI-generated plain-language explanation for any selected node.

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM runtime | [Ollama](https://ollama.com) running `llama3.2` |
| Backend | Python, [FastAPI](https://fastapi.tiangolo.com), Uvicorn |
| Database | [Neo4j](https://neo4j.com) (graph database) |
| Graph algorithms | NetworkX (PageRank), NumPy, SciPy |
| PDF parsing | pypdf |
| Frontend | React, TypeScript, Vite |
| Graph visualization | Sigma.js, graphology |
| Data fetching | TanStack Query |

---

## Architecture

```
React Frontend (:3000)
        │  HTTP /api/* (proxied by Vite)
        ▼
FastAPI Backend (:8000)
        │                      │
        ▼                      ▼
Ollama LLM (:11434)     Neo4j Database (:7687)
```

The backend is organized into:
- `routers/` — HTTP endpoints, grouped by feature (papers, graph, authors, analysis, hypothesis, reading_path, timeline)
- `services/` — the actual logic: `pdf_service.py` (text extraction), `llm_service.py` (all Ollama calls), `graph_service.py` (all Neo4j queries)
- `database/` — Neo4j connection handling

The frontend is a single-page React app, one page per feature, with a typed API client (`src/api/client.ts`) and Vite's dev server proxying `/api/*` to the backend.

---

## Prerequisites

Install these first:

- [Ollama](https://ollama.com/download) — then run `ollama pull llama3.2`
- [Neo4j Desktop](https://neo4j.com/download/) — create and start a local database
- Python 3.11+
- Node.js 18+

---

## Setup

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd research-kg-explorer
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Activate the virtual environment
venv\Scripts\Activate.ps1      # Windows PowerShell
source venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your Neo4j password:

```bash
cp .env.example .env   # or: copy .env.example .env   (Windows)
```

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password
OLLAMA_URL=http://localhost:11434
LLM_MODEL=llama3.2
```

Start the backend:

```bash
uvicorn main:app --reload
```

Confirm it's working at `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/docs`.

### 3. Frontend

In a **separate terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

> Both the backend and frontend need to be running at the same time, in two separate terminals, along with Ollama and Neo4j.

---

## Usage

1. Go to the **Upload** page and submit a PDF (text-based, not scanned — see Limitations below).
2. Wait for extraction to complete (can take 15 seconds to a few minutes, depending on your hardware).
3. Explore the **Graph** page to see the paper connected to its authors, keywords, and methods.
4. Use **Analysis** to review claim strength and negative results.
5. Upload a few more papers, then try **Hypothesis Engine** and **Reading Path** — both work best with 3+ papers in the graph.

---

## Known Limitations

- **One PDF at a time** — uploads are processed sequentially by design, to keep local LLM load predictable.
- **No OCR** — only the embedded text layer of a PDF is read; scanned/image-only PDFs are detected and rejected, not processed.
- **Speed** — local LLM inference on CPU can take 15 seconds to a few minutes per paper. A GPU significantly speeds this up.
- **Citation placeholders** — references cited by an uploaded paper create lightweight placeholder `Paper` nodes (no abstract/authors) so the citation graph has something to point to; this is expected, not a bug.

---

## Project Structure

```
research-kg-explorer/
├── backend/
│   ├── routers/        # API endpoints
│   ├── services/        # PDF, LLM, and graph logic
│   ├── database/         # Neo4j connection
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/        # One component per feature
    │   └── api/client.ts # Typed API client
    ├── package.json
    └── vite.config.ts
```



