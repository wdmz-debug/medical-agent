from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Document, Device
from schemas import DocumentCreate, DocumentOut
from services.rag_service import index_document

router = APIRouter(prefix="/api/devices/{device_id}/documents", tags=["documents"])


@router.post("", response_model=DocumentOut)
async def create_document(
    device_id: int,
    doc_name: str = Form(...),
    doc_type: str = Form("manual"),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Get content from file or form
    doc_content = content
    if file:
        raw = await file.read()
        doc_content = raw.decode("utf-8", errors="ignore")
        if not doc_name:
            doc_name = file.filename or "uploaded_file"

    if not doc_content:
        raise HTTPException(status_code=400, detail="No content provided")

    # Index into vector DB
    chunk_count = index_document(device_id, doc_name, doc_type, doc_content)

    # Save metadata to SQLite
    doc = Document(
        device_id=device_id,
        doc_name=doc_name,
        doc_type=doc_type,
        content=doc_content,
        chunk_count=chunk_count,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    docs = (
        db.query(Document)
        .filter(Document.device_id == device_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return docs
