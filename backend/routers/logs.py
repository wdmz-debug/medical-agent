from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SensorLog, Device
from schemas import SensorLogCreate, SensorLogOut

router = APIRouter(prefix="/api/devices/{device_id}/logs", tags=["logs"])


@router.post("", response_model=SensorLogOut)
def create_log(device_id: int, log_data: SensorLogCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    log = SensorLog(
        device_id=device_id,
        temperature=log_data.temperature,
        vibration=log_data.vibration,
        power_consumption=log_data.power_consumption,
        fan_speed=log_data.fan_speed,
        load=log_data.load,
        alarm_code=log_data.alarm_code,
        extra_data=log_data.extra_data or {},
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("", response_model=list[SensorLogOut])
def list_logs(device_id: int, limit: int = 100, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    logs = (
        db.query(SensorLog)
        .filter(SensorLog.device_id == device_id)
        .order_by(SensorLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return logs
