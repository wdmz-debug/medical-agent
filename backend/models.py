from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    device_type = Column(String(50), nullable=False)
    status = Column(String(20), default="normal")  # normal, warning, critical, offline
    health_score = Column(Float, default=95.0)
    location = Column(String(200), default="")
    description = Column(Text, default="")
    meta_info = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SensorLog(Base):
    __tablename__ = "sensor_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    temperature = Column(Float, nullable=True)
    vibration = Column(Float, nullable=True)
    power_consumption = Column(Float, nullable=True)
    fan_speed = Column(Float, nullable=True)
    load = Column(Float, nullable=True)
    alarm_code = Column(String(50), nullable=True)
    extra_data = Column(JSON, default=dict)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, nullable=False, index=True)
    doc_name = Column(String(200), nullable=False)
    doc_type = Column(String(50), nullable=False)  # manual, sop, fault_case, repair_log
    content = Column(Text, nullable=False)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    analysis_result = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, nullable=False, index=True)
    diagnosis = Column(Text, default="")
    risk_level = Column(String(20), default="low")
    risk_probability = Column(Float, default=0.0)
    predicted_fault_type = Column(String(100), default="")
    maintenance_advice = Column(Text, default="")
    priority = Column(String(20), default="low")
    sensor_evidence = Column(JSON, default=list)
    similar_case_evidence = Column(JSON, default=list)
    rag_evidence = Column(JSON, default=list)
    work_order_suggestion = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())
