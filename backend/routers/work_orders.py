from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import WorkOrder, Device, AnalysisResult
from schemas import WorkOrderCreate, WorkOrderOut

router = APIRouter(prefix="/api/devices/{device_id}/work-orders", tags=["work_orders"])


@router.post("", response_model=WorkOrderOut)
def create_work_order(device_id: int, order_data: WorkOrderCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Get latest analysis result
    analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.device_id == device_id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

    analysis_dict = None
    if analysis:
        analysis_dict = {
            "diagnosis": analysis.diagnosis,
            "risk_level": analysis.risk_level,
            "risk_probability": analysis.risk_probability,
            "predicted_fault_type": analysis.predicted_fault_type,
        }

    order = WorkOrder(
        device_id=device_id,
        title=order_data.title,
        description=order_data.description,
        priority=order_data.priority,
        status="pending",
        analysis_result=analysis_dict,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[WorkOrderOut])
def list_work_orders(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    orders = (
        db.query(WorkOrder)
        .filter(WorkOrder.device_id == device_id)
        .order_by(WorkOrder.created_at.desc())
        .all()
    )
    return orders
