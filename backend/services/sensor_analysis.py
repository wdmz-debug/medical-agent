import pandas as pd
import numpy as np
from typing import Optional


def analyze_sensor_trends(logs: list[dict]) -> dict:
    """Analyze sensor logs using pandas rule engine.

    Input: list of dicts with keys: timestamp, temperature, vibration,
           power_consumption, fan_speed, load, alarm_code

    Returns: {
        "summary": {...},
        "sensor_evidence": [...],
        "anomaly_count": int,
        "health_score_delta": float,
    }
    """
    if not logs:
        return {"summary": {}, "sensor_evidence": [], "anomaly_count": 0, "health_score_delta": 0}

    df = pd.DataFrame(logs)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp")

    # Use last 7 days for trend analysis
    recent = df.tail(28)  # ~4 points/day * 7 days
    historical = df.head(max(1, len(df) - 28))

    evidence = []
    anomaly_count = 0

    # --- Rule 1: Temperature anomaly ---
    if "temperature" in recent.columns and recent["temperature"].notna().any():
        recent_temp = recent["temperature"].dropna()
        hist_temp = historical["temperature"].dropna() if len(historical) > 0 else recent_temp

        temp_mean_hist = hist_temp.mean()
        temp_mean_recent = recent_temp.mean()
        temp_max_recent = recent_temp.max()
        temp_trend = _calc_trend(recent_temp.values)

        if temp_mean_hist > 0 and (temp_mean_recent - temp_mean_hist) / temp_mean_hist > 0.15:
            anomaly_count += 1
            evidence.append({
                "metric": "温度",
                "value": round(temp_mean_recent, 1),
                "threshold": round(temp_mean_hist * 1.15, 1),
                "status": "critical" if (temp_mean_recent - temp_mean_hist) / temp_mean_hist > 0.3 else "warning",
                "description": f"近期均温{temp_mean_recent:.1f}°C，较历史均值{temp_mean_hist:.1f}°C上升{(temp_mean_recent-temp_mean_hist)/temp_mean_hist*100:.1f}%"
            })
        elif temp_trend > 0.5:
            anomaly_count += 1
            evidence.append({
                "metric": "温度",
                "value": round(temp_mean_recent, 1),
                "threshold": round(temp_mean_hist, 1),
                "status": "warning",
                "description": f"温度呈上升趋势（斜率{temp_trend:.2f}），当前均温{temp_mean_recent:.1f}°C"
            })
        else:
            evidence.append({
                "metric": "温度",
                "value": round(temp_mean_recent, 1),
                "threshold": round(temp_mean_hist * 1.15, 1),
                "status": "normal",
                "description": f"温度正常，均值{temp_mean_recent:.1f}°C"
            })

    # --- Rule 2: Vibration threshold ---
    if "vibration" in recent.columns and recent["vibration"].notna().any():
        recent_vib = recent["vibration"].dropna()
        vib_max = recent_vib.max()
        vib_mean = recent_vib.mean()

        vib_threshold = 5.0  # generic threshold
        if vib_max > vib_threshold:
            anomaly_count += 1
            evidence.append({
                "metric": "振动",
                "value": round(vib_max, 2),
                "threshold": vib_threshold,
                "status": "critical",
                "description": f"振动峰值{vib_max:.2f} mm/s 超过阈值{vib_threshold} mm/s"
            })
        elif vib_mean > vib_threshold * 0.7:
            anomaly_count += 1
            evidence.append({
                "metric": "振动",
                "value": round(vib_mean, 2),
                "threshold": round(vib_threshold * 0.7, 2),
                "status": "warning",
                "description": f"振动均值{vib_mean:.2f} mm/s 接近警告阈值"
            })
        else:
            evidence.append({
                "metric": "振动",
                "value": round(vib_mean, 2),
                "threshold": vib_threshold,
                "status": "normal",
                "description": f"振动正常，均值{vib_mean:.2f} mm/s"
            })

    # --- Rule 3: Fan response lag ---
    if ("fan_speed" in recent.columns and "temperature" in recent.columns
            and recent["fan_speed"].notna().any() and recent["temperature"].notna().any()):
        recent_fan = recent["fan_speed"].dropna()
        recent_temp_for_fan = recent["temperature"].dropna()

        if recent_fan.mean() > 0:  # has fans
            temp_trend_val = _calc_trend(recent_temp_for_fan.values)
            fan_trend_val = _calc_trend(recent_fan.values)

            if temp_trend_val > 0.3 and fan_trend_val < 0:
                anomaly_count += 1
                evidence.append({
                    "metric": "散热响应",
                    "value": round(fan_trend_val, 2),
                    "threshold": 0,
                    "status": "warning",
                    "description": f"温度上升但风扇转速下降，散热响应异常"
                })
            elif temp_trend_val > 0.5 and abs(fan_trend_val) < 0.1:
                anomaly_count += 1
                evidence.append({
                    "metric": "散热响应",
                    "value": round(fan_trend_val, 2),
                    "threshold": 0.2,
                    "status": "warning",
                    "description": f"温度持续上升但风扇转速无明显变化"
                })
            else:
                evidence.append({
                    "metric": "散热响应",
                    "value": round(fan_trend_val, 2),
                    "threshold": 0,
                    "status": "normal",
                    "description": "风扇响应正常"
                })

    # --- Rule 4: Power efficiency ---
    if ("power_consumption" in recent.columns and "load" in recent.columns
            and recent["power_consumption"].notna().any() and recent["load"].notna().any()):
        recent_power = recent["power_consumption"].dropna()
        recent_load = recent["load"].dropna()
        hist_power = historical["power_consumption"].dropna() if len(historical) > 0 else recent_power
        hist_load = historical["load"].dropna() if len(historical) > 0 else recent_load

        power_change = (recent_power.mean() - hist_power.mean()) / max(hist_power.mean(), 1)
        load_change = (recent_load.mean() - hist_load.mean()) / max(hist_load.mean(), 1)

        if power_change > 0.15 and load_change < 0.05:
            anomaly_count += 1
            evidence.append({
                "metric": "能效",
                "value": round(recent_power.mean(), 1),
                "threshold": round(hist_power.mean() * 1.15, 1),
                "status": "warning",
                "description": f"功耗上升{power_change*100:.1f}%但负载无明显变化，效率异常"
            })
        else:
            evidence.append({
                "metric": "能效",
                "value": round(recent_power.mean(), 1),
                "threshold": round(hist_power.mean() * 1.15, 1),
                "status": "normal",
                "description": "功耗与负载匹配正常"
            })

    # --- Summary ---
    summary = {}
    for col in ["temperature", "vibration", "power_consumption", "fan_speed", "load"]:
        if col in recent.columns and recent[col].notna().any():
            summary[col] = {
                "mean": round(recent[col].mean(), 2),
                "max": round(recent[col].max(), 2),
                "min": round(recent[col].min(), 2),
                "std": round(recent[col].std(), 2),
                "trend": round(_calc_trend(recent[col].dropna().values), 3),
            }

    # Health score impact
    health_delta = 0
    for e in evidence:
        if e["status"] == "critical":
            health_delta -= 15
        elif e["status"] == "warning":
            health_delta -= 8

    return {
        "summary": summary,
        "sensor_evidence": evidence,
        "anomaly_count": anomaly_count,
        "health_score_delta": health_delta,
    }


def _calc_trend(values: np.ndarray) -> float:
    """Calculate linear trend slope. Positive = increasing."""
    if len(values) < 2:
        return 0.0
    x = np.arange(len(values))
    try:
        slope = np.polyfit(x, values, 1)[0]
        return float(slope)
    except:
        return 0.0


def generate_search_queries(sensor_evidence: list[dict]) -> list[str]:
    """Generate RAG search queries based on detected anomalies."""
    queries = []
    for e in sensor_evidence:
        if e["status"] in ("warning", "critical"):
            metric = e["metric"]
            if "温度" in metric:
                queries.append("温度过高 过热 散热故障 处理方法")
            elif "振动" in metric:
                queries.append("振动异常 轴承磨损 机械故障")
            elif "散热" in metric:
                queries.append("风扇故障 散热不良 温控异常")
            elif "能效" in metric:
                queries.append("功耗异常 效率下降 能耗升高")

    if not queries:
        queries.append("设备维护 日常检查 保养建议")

    return queries
