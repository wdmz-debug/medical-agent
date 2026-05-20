import sys
import os

# Add backend dir to path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from mock_data import init_mock_data

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="设备病历本 Agent", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers.devices import router as devices_router
from routers.logs import router as logs_router
from routers.documents import router as documents_router
from routers.analyze import router as analyze_router
from routers.work_orders import router as work_orders_router
from routers.chat import router as chat_router

app.include_router(devices_router)
app.include_router(logs_router)
app.include_router(documents_router)
app.include_router(analyze_router)
app.include_router(work_orders_router)
app.include_router(chat_router)


@app.on_event("startup")
def startup():
    init_mock_data()
    # Pre-index sample documents into RAG
    _index_sample_docs()


def _index_sample_docs():
    """Index sample documents into vector DB on startup."""
    from database import SessionLocal
    from models import Document
    from services.rag_service import index_document

    db = SessionLocal()
    try:
        docs = db.query(Document).all()
        for doc in docs:
            try:
                index_document(doc.device_id, doc.doc_name, doc.doc_type, doc.content)
            except Exception as e:
                print(f"Warning: Failed to index {doc.doc_name}: {e}")
        print(f"Indexed {len(docs)} sample documents into RAG")
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "设备病历本 Agent API", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
