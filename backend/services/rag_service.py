import os
import hashlib
from typing import Optional

# LangChain imports
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Vector store - use Chroma
try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")

# Global client
_chroma_client = None
_collections = {}


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        if not CHROMA_AVAILABLE:
            raise RuntimeError("chromadb not installed. Run: pip install chromadb")
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _chroma_client


def _get_collection(device_id: int):
    """Get or create a Chroma collection for a device."""
    if device_id not in _collections:
        client = _get_chroma_client()
        _collections[device_id] = client.get_or_create_collection(
            name=f"device_{device_id}",
            metadata={"device_id": device_id},
        )
    return _collections[device_id]


def _mock_embedding(text: str) -> list[float]:
    """Generate a deterministic mock embedding from text content.
    Uses hash-based approach so similar texts get similar vectors."""
    h = hashlib.sha256(text.encode()).digest()
    # Generate 384-dim vector from hash
    vec = []
    for i in range(384):
        byte_val = h[i % len(h)]
        vec.append((byte_val / 128.0) - 1.0)
    # Normalize
    norm = sum(v * v for v in vec) ** 0.5
    return [v / norm for v in vec]


def split_document(content: str, doc_name: str, doc_type: str, device_id: int,
                   chunk_size: int = 500, chunk_overlap: int = 50) -> list[dict]:
    """Split document into chunks with metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", ".", "；", ";", " "],
    )

    chunks = splitter.split_text(content)
    result = []
    for i, chunk in enumerate(chunks):
        result.append({
            "content": chunk,
            "metadata": {
                "device_id": device_id,
                "doc_name": doc_name,
                "doc_type": doc_type,
                "chunk_index": i,
            },
        })
    return result


def index_document(device_id: int, doc_name: str, doc_type: str, content: str) -> int:
    """Split, embed, and store document in vector DB."""
    chunks = split_document(content, doc_name, doc_type, device_id)
    if not chunks:
        return 0

    collection = _get_collection(device_id)

    ids = []
    documents = []
    embeddings = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        doc_id = f"{doc_name}_{i}_{hashlib.md5(chunk['content'].encode()).hexdigest()[:8]}"
        ids.append(doc_id)
        documents.append(chunk["content"])
        embeddings.append(_mock_embedding(chunk["content"]))
        metadatas.append(chunk["metadata"])

    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return len(chunks)


def retrieve(device_id: int, query: str, top_k: int = 3) -> list[dict]:
    """Retrieve relevant document chunks for a device."""
    try:
        collection = _get_collection(device_id)
    except Exception:
        return []

    if collection.count() == 0:
        return []

    query_embedding = _mock_embedding(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    evidence = []
    if results and results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            dist = results["distances"][0][i] if results["distances"] else 0
            # Convert distance to similarity score (Chroma uses L2 by default)
            score = max(0, 1 - dist / 2)
            evidence.append({
                "source": meta.get("doc_name", "unknown"),
                "doc_type": meta.get("doc_type", "unknown"),
                "content": doc,
                "score": round(score, 3),
            })

    return evidence


def search_similar_cases(device_id: int, anomaly_desc: str, top_k: int = 2) -> list[dict]:
    """Search for similar fault cases across all documents for this device."""
    # Search specifically for fault cases
    collection = _get_collection(device_id)

    if collection.count() == 0:
        return []

    query_embedding = _mock_embedding(anomaly_desc + " 故障 案例 维修")

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k * 2, collection.count()),
            include=["documents", "metadatas", "distances"],
            where={"doc_type": "fault_case"},
        )
    except Exception:
        # If filter fails (no fault_case docs), search all
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

    cases = []
    if results and results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            dist = results["distances"][0][i] if results["distances"] else 0
            score = max(0, 1 - dist / 2)
            cases.append({
                "source": meta.get("doc_name", "unknown"),
                "doc_type": meta.get("doc_type", "unknown"),
                "content": doc,
                "score": round(score, 3),
            })

    return cases[:top_k]
