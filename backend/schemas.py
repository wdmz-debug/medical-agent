from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Device ---
class DeviceOut(BaseModel):
    id: int
    name: str
    device_type: str
    status: str
    health_score: float
    location: str
    description: str
    meta_info: dict
    document_count: int = 0
    analysis_count: int = 0
    latest_diagnosis: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeviceDetail(DeviceOut):
    recent_logs: list = []
    recent_documents: list = []
    recent_analysis: Optional[dict] = None


# --- Sensor Log ---
class SensorLogCreate(BaseModel):
    temperature: Optional[float] = None
    vibration: Optional[float] = None
    power_consumption: Optional[float] = None
    fan_speed: Optional[float] = None
    load: Optional[float] = None
    alarm_code: Optional[str] = None
    extra_data: Optional[dict] = {}


class SensorLogOut(BaseModel):
    id: int
    device_id: int
    timestamp: Optional[datetime] = None
    temperature: Optional[float] = None
    vibration: Optional[float] = None
    power_consumption: Optional[float] = None
    fan_speed: Optional[float] = None
    load: Optional[float] = None
    alarm_code: Optional[str] = None
    extra_data: Optional[dict] = {}

    class Config:
        from_attributes = True


# --- Document ---
class DocumentCreate(BaseModel):
    doc_name: str
    doc_type: str = "manual"
    content: str


class DocumentOut(BaseModel):
    id: int
    device_id: int
    doc_name: str
    doc_type: str
    chunk_count: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Analysis ---
class EvidenceItem(BaseModel):
    source: str = ""
    doc_type: str = ""
    content: str = ""
    score: float = 0.0


class SensorEvidence(BaseModel):
    metric: str
    value: float
    threshold: float
    status: str  # normal, warning, critical
    description: str


class AnalysisOut(BaseModel):
    diagnosis: str
    risk_level: str
    risk_probability: float
    predicted_fault_type: str
    maintenance_advice: str
    priority: str
    sensor_evidence: list[SensorEvidence]
    similar_case_evidence: list[EvidenceItem]
    rag_evidence: list[EvidenceItem]
    work_order_suggestion: dict


# --- Agent Analysis (New Pipeline Response) ---
class PipelineStep(BaseModel):
    timestamp: str
    action: str
    tool_used: str
    content: str
    icon_type: str
    agent_role: str = ""


class EvidenceSource(BaseModel):
    source_name: str
    excerpt: str
    confidence: float


class DraftWorkOrder(BaseModel):
    title: str
    description: str
    suggested_parts: list[str]
    estimated_time: str


class AgentAnalysisResponse(BaseModel):
    status: str
    health_score: int
    remaining_useful_life_days: Optional[int] = None
    pipeline_steps: list[PipelineStep]
    evidence_sources: list[EvidenceSource]
    draft_work_order: DraftWorkOrder


class AnalyzeRequest(BaseModel):
    human_feedback: Optional[str] = None


# --- Work Order ---
class WorkOrderCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"


class WorkOrderOut(BaseModel):
    id: int
    device_id: int
    title: str
    description: str
    priority: str
    status: str
    analysis_result: Optional[dict] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    history: list = []  # [{role: "user"|"assistant", content: "..."}]


class ChatResponse(BaseModel):
    reply: str
