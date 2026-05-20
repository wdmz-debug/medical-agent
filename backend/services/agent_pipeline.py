import os
import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from models import SensorLog, Device, AnalysisResult
from services.sensor_analysis import analyze_sensor_trends, generate_search_queries
from services.rag_service import retrieve, search_similar_cases

# Try to import dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class AgentPipeline:
    """Predictive maintenance agent pipeline.

    Steps:
    1. collect_recent_logs
    2. analyze_sensor_trends
    3. retrieve_rag_context
    4. search_similar_cases
    5. generate_diagnosis
    6. create_work_order_suggestion
    """

    def __init__(self, db: Session, device_id: int):
        self.db = db
        self.device_id = device_id
        self.device = db.query(Device).filter(Device.id == device_id).first()
        if not self.device:
            raise ValueError(f"Device {device_id} not found")

    def run(self) -> dict:
        """Execute the full pipeline."""
        # Step 1: Collect recent logs
        logs = self._collect_recent_logs()

        # Step 2: Analyze sensor trends
        analysis = self._analyze_sensor_trends(logs)

        # Step 3: Retrieve RAG context
        rag_evidence = self._retrieve_rag_context(analysis["sensor_evidence"])

        # Step 4: Search similar cases
        case_evidence = self._search_similar_cases(analysis["sensor_evidence"])

        # Step 5: Generate diagnosis
        diagnosis = self._generate_diagnosis(analysis, rag_evidence, case_evidence)

        # Step 6: Create work order suggestion
        work_order = self._create_work_order_suggestion(diagnosis)

        # Save to DB
        result = AnalysisResult(
            device_id=self.device_id,
            diagnosis=diagnosis["diagnosis"],
            risk_level=diagnosis["risk_level"],
            risk_probability=diagnosis["risk_probability"],
            predicted_fault_type=diagnosis["predicted_fault_type"],
            maintenance_advice=diagnosis["maintenance_advice"],
            priority=diagnosis["priority"],
            sensor_evidence=[e for e in analysis["sensor_evidence"]],
            similar_case_evidence=[e for e in case_evidence],
            rag_evidence=[e for e in rag_evidence],
            work_order_suggestion=work_order,
        )
        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)

        return {
            "diagnosis": diagnosis["diagnosis"],
            "risk_level": diagnosis["risk_level"],
            "risk_probability": diagnosis["risk_probability"],
            "predicted_fault_type": diagnosis["predicted_fault_type"],
            "maintenance_advice": diagnosis["maintenance_advice"],
            "priority": diagnosis["priority"],
            "sensor_evidence": analysis["sensor_evidence"],
            "similar_case_evidence": case_evidence,
            "rag_evidence": rag_evidence,
            "work_order_suggestion": work_order,
        }

    def _collect_recent_logs(self, days: int = 7) -> list[dict]:
        """Step 1: Collect recent sensor logs."""
        logs = (
            self.db.query(SensorLog)
            .filter(SensorLog.device_id == self.device_id)
            .order_by(SensorLog.timestamp.desc())
            .limit(200)
            .all()
        )
        return [
            {
                "timestamp": log.timestamp.isoformat() if log.timestamp else "",
                "temperature": log.temperature,
                "vibration": log.vibration,
                "power_consumption": log.power_consumption,
                "fan_speed": log.fan_speed,
                "load": log.load,
                "alarm_code": log.alarm_code,
            }
            for log in reversed(logs)
        ]

    def _analyze_sensor_trends(self, logs: list[dict]) -> dict:
        """Step 2: Analyze sensor data with pandas rules."""
        return analyze_sensor_trends(logs)

    def _retrieve_rag_context(self, sensor_evidence: list[dict]) -> list[dict]:
        """Step 3: Retrieve relevant RAG documents based on anomalies."""
        queries = generate_search_queries(sensor_evidence)
        all_evidence = []
        seen_contents = set()

        for query in queries:
            results = retrieve(self.device_id, query, top_k=2)
            for r in results:
                if r["content"] not in seen_contents:
                    seen_contents.add(r["content"])
                    all_evidence.append(r)

        return all_evidence[:3]

    def _search_similar_cases(self, sensor_evidence: list[dict]) -> list[dict]:
        """Step 4: Search for similar historical fault cases."""
        anomaly_descs = []
        for e in sensor_evidence:
            if e["status"] in ("warning", "critical"):
                anomaly_descs.append(e["description"])

        if not anomaly_descs:
            return []

        query = " ".join(anomaly_descs)
        return search_similar_cases(self.device_id, query, top_k=2)

    def _generate_diagnosis(self, analysis: dict, rag_evidence: list, case_evidence: list) -> dict:
        """Step 5: Generate diagnosis using LLM or rule-based mock."""

        provider = os.getenv("LLM_PROVIDER", "mock").lower()

        if provider == "mock":
            return self._mock_diagnosis(analysis, rag_evidence, case_evidence)

        # Real LLM call
        try:
            return self._llm_diagnosis(analysis, rag_evidence, case_evidence, provider)
        except Exception as e:
            print(f"LLM call failed ({provider}), falling back to mock: {e}")
            return self._mock_diagnosis(analysis, rag_evidence, case_evidence)

    def _mock_diagnosis(self, analysis: dict, rag_evidence: list, case_evidence: list) -> dict:
        """Rule-based mock diagnosis for demo."""
        anomalies = [e for e in analysis["sensor_evidence"] if e["status"] in ("warning", "critical")]
        critical_count = sum(1 for e in anomalies if e["status"] == "critical")
        warning_count = sum(1 for e in anomalies if e["status"] == "warning")

        # Determine risk level
        if critical_count >= 2:
            risk_level = "critical"
            risk_prob = 0.80 + critical_count * 0.05
            priority = "critical"
        elif critical_count >= 1:
            risk_level = "high"
            risk_prob = 0.60 + warning_count * 0.05
            priority = "high"
        elif warning_count >= 2:
            risk_level = "medium"
            risk_prob = 0.35 + warning_count * 0.08
            priority = "medium"
        elif warning_count >= 1:
            risk_level = "low"
            risk_prob = 0.15 + warning_count * 0.05
            priority = "low"
        else:
            risk_level = "normal"
            risk_prob = 0.05
            priority = "low"

        risk_prob = min(risk_prob, 0.99)

        # Generate fault type based on anomaly patterns
        fault_type = "无明显故障风险"
        diagnosis_parts = []
        advice_parts = []

        for a in anomalies:
            if "温度" in a["metric"]:
                diagnosis_parts.append("温度异常升高")
                advice_parts.append("检查散热系统，清洁散热器/冷却器")
                fault_type = "散热系统异常"
            if "振动" in a["metric"]:
                diagnosis_parts.append("振动超标")
                advice_parts.append("检查轴承状态和机械连接")
                fault_type = "机械磨损风险"
            if "散热" in a["metric"]:
                diagnosis_parts.append("散热响应不足")
                advice_parts.append("检查风扇/冷却控制策略")
                fault_type = "冷却系统故障"
            if "能效" in a["metric"]:
                diagnosis_parts.append("能效下降")
                advice_parts.append("检查负载匹配和设备效率")

        if not diagnosis_parts:
            diagnosis = f"{self.device.name} 各项指标正常，设备运行状态良好"
            advice = "继续保持日常维护计划"
        else:
            diagnosis = f"{self.device.name} 检测到异常：{'、'.join(diagnosis_parts)}"
            if len(anomalies) >= 2:
                diagnosis += "，多项指标同时异常需重点关注"
            advice = "；".join(advice_parts) + "；建议安排预防性维护"

        return {
            "diagnosis": diagnosis,
            "risk_level": risk_level,
            "risk_probability": round(risk_prob, 2),
            "predicted_fault_type": fault_type,
            "maintenance_advice": advice,
            "priority": priority,
        }

    def _llm_diagnosis(self, analysis: dict, rag_evidence: list, case_evidence: list, provider: str) -> dict:
        """Call real LLM API for diagnosis."""
        import httpx

        # Provider configs
        configs = {
            "deepseek": {
                "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
                "base_url": os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
                "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            },
            "qwen": {
                "api_key": os.getenv("QWEN_API_KEY", ""),
                "base_url": os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
                "model": os.getenv("QWEN_MODEL", "qwen-plus"),
            },
            "kimi": {
                "api_key": os.getenv("KIMI_API_KEY", ""),
                "base_url": os.getenv("KIMI_BASE_URL", "https://api.moonshot.cn/v1"),
                "model": os.getenv("KIMI_MODEL", "moonshot-v1-8k"),
            },
        }

        config = configs.get(provider)
        if not config or not config["api_key"]:
            raise ValueError(f"Provider {provider} not configured")

        # Build prompt
        sensor_text = json.dumps(analysis["sensor_evidence"], ensure_ascii=False, indent=2)
        rag_text = "\n".join([f"- [{r['source']}] {r['content']}" for r in rag_evidence]) or "无"
        case_text = "\n".join([f"- [{c['source']}] {c['content']}" for c in case_evidence]) or "无"

        prompt = f"""你是一个设备预测性维护AI分析师。请根据以下信息对设备 {self.device.name}({self.device.device_type}) 进行健康评估。

## 传感器数据分析
{sensor_text}

## 相关技术文档
{rag_text}

## 历史故障案例
{case_text}

请以JSON格式输出诊断结果，包含以下字段：
- diagnosis: 诊断结论（一句话）
- risk_level: 风险等级（normal/low/medium/high/critical）
- risk_probability: 故障概率（0-1）
- predicted_fault_type: 预测故障类型
- maintenance_advice: 维护建议
- priority: 优先级（low/medium/high/critical）

只输出JSON，不要其他内容。"""

        response = httpx.post(
            f"{config['base_url']}/chat/completions",
            headers={
                "Authorization": f"Bearer {config['api_key']}",
                "Content-Type": "application/json",
            },
            json={
                "model": config["model"],
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 1000,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parse JSON from response
        # Try to extract JSON from markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        result = json.loads(content.strip())
        return result

    def _create_work_order_suggestion(self, diagnosis: dict) -> dict:
        """Step 6: Generate work order suggestion."""
        if diagnosis["risk_level"] in ("critical", "high"):
            return {
                "title": f"紧急维护：{self.device.name} {diagnosis['predicted_fault_type']}",
                "description": f"{diagnosis['diagnosis']}\n\n维护建议：{diagnosis['maintenance_advice']}",
                "priority": diagnosis["priority"],
            }
        elif diagnosis["risk_level"] == "medium":
            return {
                "title": f"预防性维护：{self.device.name}",
                "description": f"{diagnosis['diagnosis']}\n\n建议：{diagnosis['maintenance_advice']}",
                "priority": "medium",
            }
        else:
            return {
                "title": f"例行检查：{self.device.name}",
                "description": f"设备状态{diagnosis['risk_level']}，建议按计划进行例行维护",
                "priority": "low",
            }
