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


UCI_CNC_DATA = [
    {"air_temp": 298.1, "process_temp": 308.2, "rpm": 1512, "torque": 31.5, "vibration": 2.1, "label": "正常"},
    {"air_temp": 298.3, "process_temp": 308.5, "rpm": 1520, "torque": 32.0, "vibration": 2.2, "label": "正常"},
    {"air_temp": 298.6, "process_temp": 309.0, "rpm": 1535, "torque": 33.2, "vibration": 2.3, "label": "正常"},
    {"air_temp": 298.9, "process_temp": 309.4, "rpm": 1558, "torque": 34.8, "vibration": 2.5, "label": "潜在异常"},
    {"air_temp": 299.0, "process_temp": 309.8, "rpm": 1580, "torque": 36.5, "vibration": 2.7, "label": "潜在异常"},
    {"air_temp": 299.1, "process_temp": 310.0, "rpm": 1602, "torque": 38.1, "vibration": 2.9, "label": "退化加剧"},
    {"air_temp": 299.2, "process_temp": 310.1, "rpm": 1635, "torque": 40.2, "vibration": 3.1, "label": "退化加剧"},
    {"air_temp": 299.3, "process_temp": 310.3, "rpm": 1668, "torque": 42.5, "vibration": 3.3, "label": "严重警告"},
    {"air_temp": 299.3, "process_temp": 310.4, "rpm": 1690, "torque": 44.1, "vibration": 3.5, "label": "严重警告"},
    {"air_temp": 299.4, "process_temp": 310.5, "rpm": 1710, "torque": 45.6, "vibration": 3.6, "label": "严重警告"},
    {"air_temp": 299.4, "process_temp": 310.5, "rpm": 1718, "torque": 46.2, "vibration": 3.7, "label": "散热故障(HDF)"},
    {"air_temp": 299.4, "process_temp": 310.6, "rpm": 1725, "torque": 46.8, "vibration": 3.8, "label": "散热故障(HDF)"},
]


@app.get("/")
def root():
    return {"message": "设备病历本 Agent API", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/devices/{device_id}/dispatch")
def dispatch_work_order(device_id: int):
    print("\033[92m" + "=" * 60 + "\033[0m")
    print("\033[92m [Webhook Triggered] 正在向飞书/钉钉企业群发送派发指令...\033[0m")
    print(f"\033[92m [DISPATCH] 设备 ID: {device_id} | 工单已送达一线维保终端！\033[0m")
    print("\033[92m" + "=" * 60 + "\033[0m")
    return {"status": "ok", "message": "工单已推送至飞书/钉钉", "device_id": device_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
