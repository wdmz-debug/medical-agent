from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Device, SensorLog, Document, AnalysisResult
from schemas import DeviceOut, DeviceDetail

router = APIRouter(prefix="/api/devices", tags=["devices"])


def _build_uci_cnc_logs():
    """Build synthetic sensor logs from UCI AI4I 2020 dataset for CNC-01."""
    from main import UCI_CNC_DATA
    now = datetime.now()
    logs = []
    for i, row in enumerate(UCI_CNC_DATA):
        ts = now - timedelta(hours=len(UCI_CNC_DATA) - i)
        temp_c = round(row["process_temp"] - 273.15, 1)
        logs.append({
            "id": 1000 + i,
            "device_id": 1,
            "timestamp": ts.isoformat(),
            "temperature": temp_c,
            "vibration": row["vibration"],
            "power_consumption": round(row["torque"] * row["rpm"] / 9549 * 1000, 0),  # approximate watts
            "fan_speed": row["rpm"],
            "load": round(row["torque"] / 46.8 * 100, 1),  # normalized load %
            "alarm_code": None if row["label"] == "正常" else row["label"],
            "extra_data": {"air_temp_k": row["air_temp"], "torque_nm": row["torque"], "label": row["label"]},
        })
    return logs


@router.get("", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    results = []
    for device in devices:
        doc_count = db.query(Document).filter(Document.device_id == device.id).count()
        analysis_count = db.query(AnalysisResult).filter(AnalysisResult.device_id == device.id).count()
        latest = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.device_id == device.id)
            .order_by(AnalysisResult.created_at.desc())
            .first()
        )
        results.append(DeviceOut(
            id=device.id,
            name=device.name,
            device_type=device.device_type,
            status=device.status,
            health_score=device.health_score,
            location=device.location,
            description=device.description,
            meta_info=device.meta_info or {},
            document_count=doc_count,
            analysis_count=analysis_count,
            latest_diagnosis=latest.diagnosis if latest else None,
            created_at=device.created_at,
            updated_at=device.updated_at,
        ))
    return results


@router.get("/{device_id}", response_model=DeviceDetail)
def get_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Get recent logs (last 50)
    logs = (
        db.query(SensorLog)
        .filter(SensorLog.device_id == device_id)
        .order_by(SensorLog.timestamp.desc())
        .limit(50)
        .all()
    )

    # Get recent documents
    docs = (
        db.query(Document)
        .filter(Document.device_id == device_id)
        .order_by(Document.created_at.desc())
        .limit(10)
        .all()
    )

    # Get latest analysis
    analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.device_id == device_id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

    recent_analysis = None
    if analysis:
        recent_analysis = {
            "diagnosis": analysis.diagnosis,
            "risk_level": analysis.risk_level,
            "risk_probability": analysis.risk_probability,
            "predicted_fault_type": analysis.predicted_fault_type,
            "maintenance_advice": analysis.maintenance_advice,
            "priority": analysis.priority,
            "sensor_evidence": analysis.sensor_evidence or [],
            "similar_case_evidence": analysis.similar_case_evidence or [],
            "rag_evidence": analysis.rag_evidence or [],
            "work_order_suggestion": analysis.work_order_suggestion or {},
            "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        }

    # For CNC-01, inject UCI AI4I 2020 dataset as sensor logs
    if device.name == "CNC-01":
        uci_logs = _build_uci_cnc_logs()
    else:
        uci_logs = [
            {
                "id": log.id,
                "device_id": log.device_id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "temperature": log.temperature,
                "vibration": log.vibration,
                "power_consumption": log.power_consumption,
                "fan_speed": log.fan_speed,
                "load": log.load,
                "alarm_code": log.alarm_code,
                "extra_data": log.extra_data or {},
            }
            for log in logs
        ]

    return DeviceDetail(
        id=device.id,
        name=device.name,
        device_type=device.device_type,
        status=device.status,
        health_score=device.health_score,
        location=device.location,
        description=device.description,
        meta_info=device.meta_info or {},
        created_at=device.created_at,
        updated_at=device.updated_at,
        recent_logs=uci_logs,
        recent_documents=[
            {
                "id": doc.id,
                "doc_name": doc.doc_name,
                "doc_type": doc.doc_type,
                "chunk_count": doc.chunk_count,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in docs
        ],
        recent_analysis=recent_analysis,
    )
