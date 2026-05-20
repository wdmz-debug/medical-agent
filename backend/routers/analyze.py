from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Device
from schemas import AgentAnalysisResponse, PipelineStep, EvidenceSource, DraftWorkOrder, AnalyzeRequest
from services.agent_pipeline import AgentPipeline

router = APIRouter(prefix="/api/devices/{device_id}/analyze", tags=["analyze"])


def _build_server05_demo(now: datetime) -> AgentAnalysisResponse:
    """SERVER-05 Demo: 散热异常 -> 导热硅脂老化 -> 生成换件工单"""
    return AgentAnalysisResponse(
        status="warning",
        health_score=68,
        pipeline_steps=[
            PipelineStep(
                timestamp=(now - timedelta(seconds=5)).isoformat(),
                action="获取传感器日志",
                tool_used="sensor_log_query",
                content="已拉取 SERVER-05 近 7 天共 28 条传感器采样记录，准备进行时序趋势分析。",
                icon_type="database",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=4)).isoformat(),
                action="趋势分析与异常检测",
                tool_used="sensor_trend_analyzer",
                content=(
                    "分析发现关键异常：\n"
                    "1. CPU 温度 7 日均值 62.3°C，呈持续上升趋势（+6°C/周），已逼近 75°C 降频阈值。\n"
                    "2. GPU 温度同步上升至 71°C，趋势与 CPU 一致。\n"
                    "3. 进风口温度 24°C 正常，排除环境因素。\n"
                    "4. 风扇转速虽已提升至 6800 RPM，但温度仍在爬升，冷却响应不足。"
                ),
                icon_type="chart",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=3)).isoformat(),
                action="RAG 知识检索",
                tool_used="chromadb_retriever",
                content=(
                    "检索到关键运维文档《服务器运维SOP.txt》：\n"
                    "- CPU 温度正常范围 35-75°C，当前 62°C 已进入黄色区间。\n"
                    "- 风扇策略：高负载时应自动提升至 6000-8000 RPM。\n"
                    "- 文档特别指出：'如果温度升高但风扇转速未增加，检查 iDRAC 风扇策略设置。'\n"
                    "- 故障处理流程：温度报警 → 检查风扇转速 → 检查散热器 → 检查导热硅脂。"
                ),
                icon_type="search",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=2)).isoformat(),
                action="历史案例匹配",
                tool_used="vector_similarity_search",
                content=(
                    "命中历史故障案例（相似度 0.91）：\n"
                    "【案例】服务器 CPU 过热导致降频\n"
                    "- 现象：CPU 温度持续超过 80°C，系统自动降频保护\n"
                    "- 根因：散热器与 CPU 之间的导热硅脂干涸老化，导热效率大幅下降\n"
                    "- 处理：更换导热硅脂，清洁散热器翅片\n"
                    "- 该案例与当前温度渐升、风扇响应滞后的症状高度吻合。"
                ),
                icon_type="file-text",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=1)).isoformat(),
                action="综合诊断与风险评估",
                tool_used="diagnosis_engine",
                content=(
                    "综合传感器趋势、运维文档和历史案例，判定：\n"
                    "■ 风险等级：中高风险（健康评分 68/100）\n"
                    "■ 故障类型：散热系统效率下降\n"
                    "■ 置信度：82%\n"
                    "■ 推理链：CPU/GPU 温度同步渐升 + 进风温度正常 + 风扇已高转速但仍控温不足 → "
                    "排除环境与风扇故障 → 最可能原因为导热硅脂老化导致热阻增大。\n"
                    "■ 若不干预，预计 3-5 天内触发 CPU 降频保护，影响 AI 训练任务。"
                ),
                icon_type="brain",
            ),
            PipelineStep(
                timestamp=now.isoformat(),
                action="生成维护工单草稿",
                tool_used="work_order_generator",
                content="已根据诊断结论自动生成维护工单草稿，建议 24 小时内安排停机维护。",
                icon_type="clipboard",
            ),
        ],
        evidence_sources=[
            EvidenceSource(
                source_name="服务器运维SOP.txt",
                excerpt="CPU温度正常范围：35-75°C。风扇策略：正常负载下风扇转速3000-5000 RPM，高负载时应自动提升至6000-8000 RPM。如果温度升高但风扇转速未增加，检查iDRAC风扇策略设置。",
                confidence=0.95,
            ),
            EvidenceSource(
                source_name="服务器运维SOP.txt",
                excerpt="故障处理流程：1. 温度报警：检查风扇转速 → 检查散热器 → 检查导热硅脂。",
                confidence=0.92,
            ),
            EvidenceSource(
                source_name="历史故障案例库",
                excerpt="案例：服务器CPU过热导致降频 — 散热器与CPU之间的导热硅脂干涸老化，导热效率大幅下降。处理：更换导热硅脂，清洁散热器翅片。",
                confidence=0.91,
            ),
        ],
        draft_work_order=DraftWorkOrder(
            title="预防性维护：SERVER-05 散热系统检查与导热硅脂更换",
            description=(
                "AI Agent 诊断发现服务器 CPU/GPU 温度持续上升（一周内 +6°C），风扇转速已达 6800 RPM 但仍无法有效控温。"
                "结合运维文档和历史案例分析，判定为导热硅脂老化导致散热效率下降。\n\n"
                "建议操作：\n"
                "1. 停机后拆卸散热器，检查导热硅脂状态\n"
                "2. 清洁 CPU/GPU 表面及散热器翅片\n"
                "3. 重新涂抹高性能导热硅脂\n"
                "4. 检查风扇轴承状态，必要时更换\n"
                "5. 恢复后监控 24 小时确认温度回归正常"
            ),
            suggested_parts=["高性能导热硅脂 (信越7921)", "清洁套件", "服务器散热风扇 (备用)"],
            estimated_time="建议 24 小时内安排，停机维护约 2 小时",
        ),
    )


def _build_fan03_demo(now: datetime) -> AgentAnalysisResponse:
    """FAN-03 Demo: 风机叶片积尘 -> 振动升高 -> 生成清理工单"""
    return AgentAnalysisResponse(
        status="warning",
        health_score=74,
        pipeline_steps=[
            PipelineStep(
                timestamp=(now - timedelta(seconds=5)).isoformat(),
                action="获取传感器日志",
                tool_used="sensor_log_query",
                content="已拉取 FAN-03 近 7 天共 28 条传感器采样记录。",
                icon_type="database",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=4)).isoformat(),
                action="趋势分析与异常检测",
                tool_used="sensor_trend_analyzer",
                content=(
                    "分析发现异常趋势：\n"
                    "1. 振动值 7 日均值 3.2 mm/s，较上周上升 15%，逼近 3.5 mm/s 警戒线。\n"
                    "2. 电机温度 35°C 略高于基线（+5°C），与振动升高同步。\n"
                    "3. 功耗 10.5kW 较额定 2.2kW 明显偏高，负载未变但能耗增加。\n"
                    "4. 转速 1250 RPM 正常，排除电机控制异常。"
                ),
                icon_type="chart",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=3)).isoformat(),
                action="RAG 知识检索",
                tool_used="chromadb_retriever",
                content=(
                    "检索到运维文档《工业风机维护SOP.txt》：\n"
                    "- 振动标准：低于 3.5 mm/s，当前 3.2 mm/s 已接近警告阈值。\n"
                    "- 定期维护要求：每月清洁叶片积尘，每季度检查轴承润滑。\n"
                    "- 故障处理指引：振动异常优先检查叶片积灰不均和轴承状态。"
                ),
                icon_type="search",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=2)).isoformat(),
                action="历史案例匹配",
                tool_used="vector_similarity_search",
                content=(
                    "命中相关案例（相似度 0.85）：\n"
                    "【案例】工业风机振动升高 — 叶片积尘导致动平衡失衡\n"
                    "- 现象：振动值从 2.5 升至 3.8 mm/s\n"
                    "- 根因：叶片表面积聚灰尘，导致质量分布不均，动平衡被破坏\n"
                    "- 处理：清洁叶片，重新做动平衡校验\n"
                    "- 该案例与当前渐进式振动升高模式吻合。"
                ),
                icon_type="file-text",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=1)).isoformat(),
                action="综合诊断与风险评估",
                tool_used="diagnosis_engine",
                content=(
                    "综合分析结论：\n"
                    "■ 风险等级：中风险（健康评分 74/100）\n"
                    "■ 故障类型：叶片积尘导致动平衡偏移\n"
                    "■ 置信度：78%\n"
                    "■ 推理链：振动渐升 + 温度微升 + 功耗增加 + 转速正常 → "
                    "排除电机故障 → 叶片积尘导致不平衡是最可能原因。\n"
                    "■ 若不处理，预计 1-2 周内振动突破 3.5 mm/s 警戒线，可能损伤轴承。"
                ),
                icon_type="brain",
            ),
            PipelineStep(
                timestamp=now.isoformat(),
                action="生成维护工单草稿",
                tool_used="work_order_generator",
                content="已根据诊断结论自动生成维护工单草稿，建议本周内安排叶片清洁。",
                icon_type="clipboard",
            ),
        ],
        evidence_sources=[
            EvidenceSource(
                source_name="工业风机维护SOP.txt",
                excerpt="振动标准：低于3.5 mm/s。定期维护：每月清洁叶片积尘，检查紧固件。每季度检查轴承润滑状态。每年叶轮动平衡校验。",
                confidence=0.93,
            ),
            EvidenceSource(
                source_name="工业风机维护SOP.txt",
                excerpt="日常检查：观察运行电流是否在额定范围内，听运转声音有无异常，检查振动是否正常。",
                confidence=0.88,
            ),
            EvidenceSource(
                source_name="历史故障案例库",
                excerpt="案例：工业风机振动升高 — 叶片表面积聚灰尘导致质量分布不均，动平衡被破坏。处理：清洁叶片，重新做动平衡校验。",
                confidence=0.85,
            ),
        ],
        draft_work_order=DraftWorkOrder(
            title="预防性维护：FAN-03 工业风机叶片清洁与动平衡校验",
            description=(
                "AI Agent 诊断发现风机振动值持续上升（当前 3.2 mm/s，逼近 3.5 mm/s 警戒线），"
                "结合功耗增加和温度微升的趋势，判定为叶片积尘导致动平衡偏移。\n\n"
                "建议操作：\n"
                "1. 停机后拆卸防护网\n"
                "2. 清洁叶片表面积尘\n"
                "3. 检查叶片有无裂纹或损伤\n"
                "4. 检查轴承润滑状态\n"
                "5. 启动后做动平衡校验\n"
                "6. 恢复运行后持续监测振动值"
            ),
            suggested_parts=["清洁刷具套装", "润滑脂 (Kluber Isoflex NBU 15)", "动平衡校验块"],
            estimated_time="建议本周内安排，停机维护约 1.5 小时",
        ),
    )


def _build_cnc01_demo(now: datetime) -> AgentAnalysisResponse:
    """CNC-01 Demo: 主轴温度偏高 -> 冷却水路隐患 -> 生成预防性维护工单"""
    return AgentAnalysisResponse(
        status="warning",
        health_score=72,
        pipeline_steps=[
            PipelineStep(
                timestamp=(now - timedelta(seconds=5)).isoformat(),
                action="获取传感器日志",
                tool_used="sensor_log_query",
                content="已拉取 CNC-01 近 7 天共 28 条传感器采样记录，准备进行时序趋势分析。",
                icon_type="database",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=4)).isoformat(),
                action="趋势分析与异常检测",
                tool_used="sensor_trend_analyzer",
                content=(
                    "分析发现关键异常：\n"
                    "1. 主轴温度 7 日均值 58°C，呈持续上升趋势（+4°C/周），逼近 65°C 自动降速阈值。\n"
                    "2. 振动值 2.8 mm/s，较基线 2.5 mm/s 上升 12%，接近 3.0 mm/s 警告线。\n"
                    "3. 功耗 18kW 略高于正常水平，与负载不匹配。\n"
                    "4. 冷却系统流量未见明显下降，但温度仍在爬升，暗示散热效率正在退化。"
                ),
                icon_type="chart",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=3)).isoformat(),
                action="RAG 知识检索",
                tool_used="chromadb_retriever",
                content=(
                    "检索到关键运维文档《CNC-01 维护手册.txt》：\n"
                    "- 主轴温度报警阈值：超过 65°C 时系统自动降速，超过 75°C 自动停机保护。\n"
                    "- 振动标准：正常运行应低于 3.0 mm/s，3.0-5.0 mm/s 为警告区间。\n"
                    "- 常见故障指引：主轴过热应检查润滑系统、冷却水路、轴承磨损。\n"
                    "- 文档建议：每 500 小时检查润滑脂状态，每月检查冷却水路流量。"
                ),
                icon_type="search",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=2)).isoformat(),
                action="历史案例匹配",
                tool_used="vector_similarity_search",
                content=(
                    "命中历史故障案例（相似度 0.88）：\n"
                    "【案例 2024-08-15】CNC-01 主轴过热停机\n"
                    "- 现象：主轴温度持续上升至 78°C 触发停机保护\n"
                    "- 根因：冷却水路堵塞导致散热效率下降\n"
                    "- 处理：清洗冷却水路，更换冷却液，检查水泵\n"
                    "- 预防措施：每月检查冷却水路流量\n"
                    "- 该案例与当前温度渐升模式高度吻合，属于同一设备的历史复发倾向。"
                ),
                icon_type="file-text",
            ),
            PipelineStep(
                timestamp=(now - timedelta(seconds=1)).isoformat(),
                action="综合诊断与风险评估",
                tool_used="diagnosis_engine",
                content=(
                    "综合传感器趋势、运维文档和历史案例，判定：\n"
                    "■ 风险等级：中风险（健康评分 72/100）\n"
                    "■ 故障类型：冷却系统效率下降 / 主轴退化风险\n"
                    "■ 置信度：76%\n"
                    "■ 推理链：主轴温度持续上升 + 振动同步微升 + 冷却流量未明显下降 → "
                    "排除水泵故障 → 最可能原因为冷却水路局部堵塞或主轴轴承早期磨损。\n"
                    "■ 该设备 2024 年 8 月曾因同样原因停机，存在复发风险。\n"
                    "■ 若不干预，预计 5-7 天内触发 65°C 自动降速，影响加工精度。"
                ),
                icon_type="brain",
            ),
            PipelineStep(
                timestamp=now.isoformat(),
                action="生成维护工单草稿",
                tool_used="work_order_generator",
                content="已根据诊断结论自动生成预防性维护工单草稿，建议本周内安排停机检修。",
                icon_type="clipboard",
            ),
        ],
        evidence_sources=[
            EvidenceSource(
                source_name="CNC-01 维护手册.txt",
                excerpt="主轴温度报警阈值：超过65°C时系统自动降速，超过75°C时自动停机保护。振动标准：正常运行振动值应低于3.0 mm/s，3.0-5.0 mm/s为警告区间。",
                confidence=0.94,
            ),
            EvidenceSource(
                source_name="CNC-01 维护手册.txt",
                excerpt="常见故障及处理：主轴过热 — 检查润滑系统、冷却水路、轴承磨损。每500小时检查润滑脂状态，必要时补充。",
                confidence=0.90,
            ),
            EvidenceSource(
                source_name="CNC-01 历史故障案例.txt",
                excerpt="案例 2024-08-15：主轴温度持续上升至78°C触发停机保护。根因：冷却水路堵塞导致散热效率下降。处理：清洗冷却水路，更换冷却液。",
                confidence=0.88,
            ),
        ],
        draft_work_order=DraftWorkOrder(
            title="预防性维护：CNC-01 主轴冷却系统检查与轴承状态评估",
            description=(
                "AI Agent 诊断发现数控机床主轴温度持续上升（一周内 +4°C，当前 58°C），振动值同步微升至 2.8 mm/s。"
                "结合维护手册阈值和 2024 年 8 月同类故障案例，判定为冷却水路效率下降或主轴轴承早期退化。\n\n"
                "建议操作：\n"
                "1. 停机后检查冷却水路流量，清洗管路\n"
                "2. 更换冷却液，检查水泵工作状态\n"
                "3. 检查主轴润滑脂状态，必要时补充或更换\n"
                "4. 检测主轴轴承振动频谱，评估轴承健康\n"
                "5. 恢复加工后持续监控主轴温度 48 小时"
            ),
            suggested_parts=["主轴润滑脂", "冷却液", "冷却水路清洗套件"],
            estimated_time="建议本周内安排，停机维护约 4 小时",
        ),
    )


@router.post("", response_model=AgentAnalysisResponse)
def analyze_device(device_id: int, body: AnalyzeRequest = None, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    now = datetime.now()
    feedback = body.human_feedback if body else None

    # Demo mock: return rich AgentAnalysisResponse for showcase devices
    if device.name == "CNC-01":
        response = _build_cnc01_demo(now)
    elif device.name == "SERVER-05":
        response = _build_server05_demo(now)
    elif device.name == "FAN-03":
        response = _build_fan03_demo(now)
    else:
        # Default: run real pipeline
        try:
            pipeline = AgentPipeline(db, device_id)
            result = pipeline.run()
            response = AgentAnalysisResponse(
                status=device.status,
                health_score=int(device.health_score),
                pipeline_steps=[
                    PipelineStep(
                        timestamp=now.isoformat(),
                        action="传感器分析",
                        tool_used="sensor_trend_analyzer",
                        content=result.get("diagnosis", ""),
                        icon_type="chart",
                    ),
                ],
                evidence_sources=[
                    EvidenceSource(
                        source_name=e.get("source", ""),
                        excerpt=e.get("content", ""),
                        confidence=e.get("score", 0.0),
                    )
                    for e in result.get("rag_evidence", [])
                ],
                draft_work_order=DraftWorkOrder(
                    title=result.get("work_order_suggestion", {}).get("title", "维护工单"),
                    description=result.get("work_order_suggestion", {}).get("description", ""),
                    suggested_parts=[],
                    estimated_time="待评估",
                ),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # HITL: prepend human feedback step if provided
    if feedback:
        hitl_step = PipelineStep(
            timestamp=(now - timedelta(seconds=10)).isoformat(),
            action="接收到人类专家线索",
            tool_used="human_feedback",
            content=(
                f"人类操作员驳回了上一轮诊断并提供新线索：\n"
                f"「{feedback}」\n\n"
                f"Agent 正在重新规划排查路径，将人类线索纳入推理上下文..."
            ),
            icon_type="brain",
        )
        response.pipeline_steps.insert(0, hitl_step)

    return response
