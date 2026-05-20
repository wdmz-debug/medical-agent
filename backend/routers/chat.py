import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Device, AnalysisResult
from schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/devices/{device_id}/chat", tags=["chat"])

STATUS_MAP = {
    "normal": "正常",
    "warning": "警告",
    "critical": "高危",
    "offline": "离线",
}


def _build_system_prompt(device: Device, analysis: Optional[AnalysisResult]) -> str:
    status_cn = STATUS_MAP.get(device.status, device.status)
    prompt = (
        f"你是一名工业设备诊断专家，正在协助用户分析设备 {device.name}（{device.device_type}）。\n"
        f"设备位置：{device.location}\n"
        f"当前状态：{status_cn}，健康评分：{device.health_score}/100\n"
        f"设备描述：{device.description}\n"
    )
    if analysis:
        prompt += (
            f"\n最新诊断结论：{analysis.diagnosis}\n"
            f"风险等级：{analysis.risk_level}，风险概率：{analysis.risk_probability}\n"
            f"预测故障类型：{analysis.predicted_fault_type}\n"
            f"维护建议：{analysis.maintenance_advice}\n"
        )
    prompt += (
        "\n请严格基于以上事实和工业标准回答用户问题，保持专业、简洁。"
        "如果信息不足，请明确说明并给出合理的推测方向。"
    )
    return prompt


def _mock_reply(device: Device, message: str) -> str:
    status_cn = STATUS_MAP.get(device.status, device.status)
    if device.status == "critical":
        return (
            f"[本地降级模式] 无法连接大模型，但基于本地规则分析：\n\n"
            f"设备 {device.name} 当前处于高危状态（健康评分 {device.health_score}/100），"
            f"建议立即停机检查。常见原因包括关键部件磨损、过载运行或传感器异常。"
            f"请优先检查设备运行日志和最近的告警记录。\n\n"
            f"您的问题：{message}\n"
            f"（本回复为本地规则生成，接入大模型后可获得更精准的分析）"
        )
    elif device.status == "warning":
        return (
            f"[本地降级模式] 无法连接大模型，但基于本地规则分析：\n\n"
            f"设备 {device.name} 当前处于警告状态（健康评分 {device.health_score}/100），"
            f"存在潜在风险。建议安排预防性维护，重点关注温度、振动等关键指标的趋势变化。\n\n"
            f"您的问题：{message}\n"
            f"（本回复为本地规则生成，接入大模型后可获得更精准的分析）"
        )
    else:
        return (
            f"[本地降级模式] 无法连接大模型，但基于本地规则分析：\n\n"
            f"设备 {device.name} 当前运行正常（健康评分 {device.health_score}/100），"
            f"各项指标在合理范围内。建议按计划执行日常维护。\n\n"
            f"您的问题：{message}\n"
            f"（本回复为本地规则生成，接入大模型后可获得更精准的分析）"
        )


@router.post("", response_model=ChatResponse)
async def chat_with_device(device_id: int, body: ChatRequest, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Get latest analysis for richer context
    analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.device_id == device_id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

    # Try DeepSeek API
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    if not api_key:
        return ChatResponse(reply=_mock_reply(device, body.message))

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        system_prompt = _build_system_prompt(device, analysis)

        messages = [{"role": "system", "content": system_prompt}]
        for msg in body.history[-10:]:  # keep last 10 turns
            if msg.get("role") in ("user", "assistant") and msg.get("content"):
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": body.message})

        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        reply = response.choices[0].message.content or "抱歉，模型未返回有效回复。"
        return ChatResponse(reply=reply)

    except Exception as e:
        print(f"[Chat] DeepSeek API error: {e}")
        return ChatResponse(reply=_mock_reply(device, body.message))
