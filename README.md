# Research Knowledge Graph Explorer

An AI-powered application that extracts information from research papers and visualizes relationships as an interactive knowledge graph.

## Features

- Upload research papers (PDF)
- Extract authors, keywords, methods, datasets, and research topics
- Generate structured knowledge using Large Language Models (LLMs)
- Store relationships in a Neo4j Knowledge Graph
- Interactive graph visualization
- Search and explore research connections

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- FastAPI
- Python
- Pydantic

### AI
- Ollama 

### Database
- Neo4j Graph Database

---

## Project Structure

```
research-kg-explorer/
│
├── backend/
├── frontend/
├── README.md
└── .gitignore
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/research-kg-explorer.git
```

### Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Environment Variables

Create a `.env` file inside the backend folder.

Example:

# Copy this file to ".env" in the same folder and fill in your real values.

# Ollama (local LLM — FREE, no API key, no billing)
# 1. Install Ollama:        https://ollama.com/download
# 2. Pull a model:          ollama pull llama3.2
# 3. Ollama runs automatically in the background after install (default port 11434)
OLLAMA_URL=http:XXXXX
LLM_MODEL=llama3.2

# Neo4j (required — either run locally via Neo4j Desktop, or use Neo4j Aura free tier)
NEO4J_URI=neo4j:/X:X:X:
NEO4J_USER=neo4j
NEO4J_PASSWORD=******

# Appcd 
MAX_UPLOAD_MB=50
DEBUG=true

## Future Improvements

- Multi-document comparison
- Advanced graph analytics
- Research paper recommendations
- User authentication
- Export knowledge graph

---

