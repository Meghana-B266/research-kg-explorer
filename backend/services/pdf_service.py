"""
PDF Extraction Service — extracts text from uploaded PDFs
"""
import io
import hashlib
import pypdf
from fastapi import UploadFile


async def extract_text_from_pdf(file: UploadFile) -> tuple[str, str]:
    """
    Extract full text from a PDF file.
    Returns (text, file_hash)
    """
    contents = await file.read()
    file_hash = hashlib.sha256(contents).hexdigest()[:12]

    reader = pypdf.PdfReader(io.BytesIO(contents))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())

    full_text = "\n\n".join(pages)
    return full_text, file_hash


def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks for processing"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def find_citation_context(full_text: str, cited_title: str, window: int = 500) -> str:
    """Find the sentence(s) around a citation mention"""
    # Simple substring search — good enough for most papers
    title_words = cited_title.lower().split()[:4]
    query = " ".join(title_words)
    idx = full_text.lower().find(query)
    if idx == -1:
        return ""
    start = max(0, idx - window // 2)
    end = min(len(full_text), idx + window // 2)
    return full_text[start:end]