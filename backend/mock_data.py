import random
import math
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models import Device, SensorLog, Document, AnalysisResult

DEVICES = [
    {
        "name": "CNC-01",
        "device_type": "数控机床",
        "status": "warning",
        "health_score": 72.0,
        "location": "A车间-1号线",
        "description": "五轴联动数控加工中心，用于精密零件加工",
        "meta_info": {"manufacturer": "DMG MORI", "model": "DMU 50", "install_date": "2022-03-15"},
    },
    {
        "name": "PUMP-02",
        "device_type": "工业泵",
        "status": "normal",
        "health_score": 91.0,
        "location": "B车间-冷却系统",
        "description": "离心式工业冷却水泵",
        "meta_info": {"manufacturer": "Grundfos", "model": "CR 32", "install_date": "2023-01-10"},
    },
    {
        "name": "FAN-03",
        "device_type": "工业风机",
        "status": "warning",
        "health_score": 74.0,
        "location": "C车间-通风系统",
        "description": "轴流式工业通风风机",
        "meta_info": {"manufacturer": "EBM-Papst", "model": "A4E800", "install_date": "2023-06-20"},
    },
    {
        "name": "COMP-04",
        "device_type": "空压机",
        "status": "critical",
        "health_score": 45.0,
        "location": "A车间-气源站",
        "description": "螺杆式空气压缩机",
        "meta_info": {"manufacturer": "Atlas Copco", "model": "GA 37", "install_date": "2021-11-05"},
    },
    {
        "name": "SERVER-05",
        "device_type": "服务器",
        "status": "warning",
        "health_score": 68.0,
        "location": "数据中心-Rack-A3",
        "description": "高性能计算服务器，运行AI训练和数据处理任务",
        "meta_info": {"manufacturer": "Dell", "model": "PowerEdge R750", "cpu": "Xeon Gold 6338", "gpu": "NVIDIA A100", "install_date": "2023-09-01"},
    },
    {
        "name": "MOTOR-06",
        "device_type": "电机",
        "status": "normal",
        "health_score": 85.0,
        "location": "B车间-传送带",
        "description": "三相异步驱动电机",
        "meta_info": {"manufacturer": "Siemens", "model": "SIMOTICS 1LE7", "install_date": "2022-08-12"},
    },
]

# Sensor baseline profiles per device type
SENSOR_PROFILES = {
    "数控机床": {"temp_base": 42, "temp_var": 8, "vib_base": 2.5, "vib_var": 1.5, "power_base": 15, "power_var": 5, "fan_base": 2800, "fan_var": 600, "load_base": 65, "load_var": 20},
    "工业泵": {"temp_base": 35, "temp_var": 5, "vib_base": 1.8, "vib_var": 0.8, "power_base": 22, "power_var": 4, "fan_base": 0, "fan_var": 0, "load_base": 70, "load_var": 15},
    "工业风机": {"temp_base": 30, "temp_var": 4, "vib_base": 3.0, "vib_var": 1.0, "power_base": 8, "power_var": 3, "fan_base": 1200, "fan_var": 300, "load_base": 55, "load_var": 15},
    "空压机": {"temp_base": 55, "temp_var": 12, "vib_base": 4.0, "vib_var": 2.5, "power_base": 35, "power_var": 8, "fan_base": 3200, "fan_var": 800, "load_base": 80, "load_var": 15},
    "服务器": {"temp_base": 48, "temp_var": 15, "vib_base": 0.5, "vib_var": 0.3, "power_base": 450, "power_var": 150, "fan_base": 5500, "fan_var": 2000, "load_base": 60, "load_var": 30},
    "电机": {"temp_base": 38, "temp_var": 6, "vib_base": 2.0, "vib_var": 1.2, "power_base": 18, "power_var": 5, "fan_base": 0, "fan_var": 0, "load_base": 50, "load_var": 25},
}

# Degradation patterns for devices that should show issues
DEGRADATION = {
    "CNC-01": {"temp_drift": 0.3, "vib_drift": 0.05, "start_day": 15},  # gradual temp rise
    "COMP-04": {"temp_drift": 0.8, "vib_drift": 0.15, "start_day": 5},  # severe degradation
    "SERVER-05": {"temp_drift": 0.4, "fan_lag": True, "start_day": 10},  # cooling issue
}

SAMPLE_DOCUMENTS = [
    {
        "device_name": "CNC-01",
        "doc_name": "CNC-01 维护手册.txt",
        "doc_type": "manual",
        "content": """DMG MORI DMU 50 五轴数控加工中心维护手册

日常维护要点：
1. 主轴轴承润滑：每500小时检查润滑脂状态，必要时补充
2. 导轨清洁：每日工作结束后清洁XYZ导轨，涂抹导轨油
3. 冷却系统：检查冷却液液位和浓度，每两周更换一次
4. 刀库检查：确认刀具夹紧力正常，换刀机构无异常

温度报警阈值：
- 主轴温度超过65°C时系统自动降速
- 超过75°C时自动停机保护
- 环境温度应保持在20-30°C

振动标准：
- 正常运行振动值应低于3.0 mm/s
- 3.0-5.0 mm/s为警告区间
- 超过5.0 mm/s需要立即停机检查

常见故障及处理：
1. 主轴过热：检查润滑系统、冷却水路、轴承磨损
2. 加工精度下降：检查丝杠间隙、导轨磨损、热变形
3. 换刀故障：检查刀库定位、气压、夹紧机构
""",
    },
    {
        "device_name": "CNC-01",
        "doc_name": "CNC-01 历史故障案例.txt",
        "doc_type": "fault_case",
        "content": """故障案例记录 - CNC-01

案例1: 2024-08-15 主轴过热停机
现象：主轴温度持续上升至78°C触发停机保护
原因：冷却水路堵塞导致散热效率下降
处理：清洗冷却水路，更换冷却液，检查水泵
预防：每月检查冷却水路流量

案例2: 2024-10-22 加工尺寸偏差
现象：加工零件尺寸偏差超过0.05mm
原因：X轴丝杠螺母磨损导致反向间隙增大
处理：更换丝杠螺母，重新补偿反向间隙
预防：每2000小时检查丝杠间隙

案例3: 2025-01-08 振动报警
现象：加工过程中振动值达到5.2 mm/s
原因：主轴轴承内圈剥落
处理：更换主轴轴承组件
预防：定期监测振动频谱，关注轴承特征频率
""",
    },
    {
        "device_name": "SERVER-05",
        "doc_name": "服务器运维SOP.txt",
        "doc_type": "sop",
        "content": """Dell PowerEdge R750 服务器运维标准操作流程

温度监控标准：
- CPU温度正常范围：35-75°C
- GPU温度正常范围：40-80°C
- 进风口温度：18-27°C
- 出风口温度不应超过进风口15°C

风扇策略：
- 正常负载下风扇转速3000-5000 RPM
- 高负载时应自动提升至6000-8000 RPM
- 如果温度升高但风扇转速未增加，检查iDRAC风扇策略设置

功耗监控：
- 正常待机功耗：200-350W
- 满载功耗：800-1200W
- 功耗异常升高可能指示散热问题或硬件故障

负载指标：
- CPU使用率持续超过90%需要扩容评估
- GPU使用率持续超过95%检查任务调度
- 内存使用率超过85%检查是否有内存泄漏

故障处理流程：
1. 温度报警：检查风扇转速 → 检查散热器 → 检查导热硅脂
2. 功耗异常：检查PSU状态 → 检查硬件健康 → 检查BIOS设置
3. 性能下降：检查温度降频 → 检查进程占用 → 检查存储IO
""",
    },
    {
        "device_name": "COMP-04",
        "doc_name": "空压机维修手册.txt",
        "doc_type": "manual",
        "content": """Atlas Copco GA 37 螺杆式空压机维修手册

关键参数监控：
- 排气温度正常范围：70-95°C
- 排气温度报警值：100°C
- 排气温度停机值：110°C
- 振动标准：低于5.0 mm/s
- 油压正常范围：2.5-4.5 bar

维护周期：
- 空气滤芯：每2000小时更换
- 油滤芯：每2000小时更换
- 油气分离器：每4000小时更换
- 润滑油：每4000小时更换
- 主机轴承：每20000小时检查

常见故障：
1. 排气温度过高：检查油位、油冷却器、温控阀
2. 振动异常：检查主机轴承、联轴器、地脚螺栓
3. 功耗升高：检查进气阀、卸载阀、管路泄漏
""",
    },
    {
        "device_name": "PUMP-02",
        "doc_name": "冷却水泵操作手册.txt",
        "doc_type": "manual",
        "content": """Grundfos CR 32 离心式冷却水泵操作手册

运行参数：
- 正常流量：32 m³/h
- 扬程：25m
- 电机功率：5.5kW
- 正常电流：11A
- 振动标准：低于2.5 mm/s

启停操作：
1. 启动前检查：进出口阀门状态、密封水、轴承润滑
2. 启动：确认阀门开启后启动，观察电流和压力
3. 运行监控：每小时记录流量、压力、温度、振动
4. 停机：先关出口阀，再停泵

维护要点：
- 机械密封：每8000小时检查或更换
- 轴承润滑：每2000小时补充润滑脂
- 联轴器对中：每年检查一次
""",
    },
    {
        "device_name": "FAN-03",
        "doc_name": "工业风机维护SOP.txt",
        "doc_type": "sop",
        "content": """EBM-Papst A4E800 轴流风机维护标准操作流程

运行标准：
- 额定转速：1200 RPM
- 风量：8000 m³/h
- 功率：2.2kW
- 振动标准：低于3.5 mm/s

日常检查：
1. 观察运行电流是否在额定范围内
2. 听运转声音有无异常
3. 检查振动是否正常
4. 检查防护网是否完好

定期维护：
- 每月：清洁叶片积尘，检查紧固件
- 每季度：检查轴承润滑状态
- 每年：叶轮动平衡校验，电机绝缘测试
""",
    },
    {
        "device_name": "MOTOR-06",
        "doc_name": "电机维护手册.txt",
        "doc_type": "manual",
        "content": """Siemens SIMOTICS 1LE7 三相异步电机维护手册

额定参数：
- 功率：15kW
- 额定电流：30A
- 额定转速：1475 RPM
- 绝缘等级：F
- 防护等级：IP55

温度监控：
- 绕组温度正常范围：60-100°C
- 报警温度：120°C
- 停机温度：140°C
- 轴承温度不应超过80°C

振动标准：
- 正常：低于2.8 mm/s
- 警告：2.8-7.1 mm/s
- 危险：超过7.1 mm/s

维护周期：
- 每月：外观检查、清洁散热片
- 每季度：检查轴承润滑、绝缘电阻
- 每年：全面检查、更换轴承润滑脂
""",
    },
    {
        "device_name": "MOTOR-06",
        "doc_name": "电机故障案例集.txt",
        "doc_type": "fault_case",
        "content": """电机常见故障案例集

案例1: 轴承过热
现象：轴承温度持续升高超过85°C
原因：润滑脂不足或变质
处理：补充或更换润滑脂
预防：定期检查润滑状态

案例2: 绝缘降低
现象：绝缘电阻低于1MΩ
原因：绕组受潮或绝缘老化
处理：烘干处理或重新浸漆
预防：保持环境干燥，定期检测绝缘

案例3: 异常振动
现象：振动值超过4.0 mm/s
原因：转子不平衡或轴承损坏
处理：做动平衡或更换轴承
预防：定期监测振动频谱
""",
    },
]


def generate_sensor_data(device_name, profile, days=30, points_per_day=4):
    """Generate simulated sensor data with optional degradation pattern."""
    logs = []
    now = datetime.now()
    deg = DEGRADATION.get(device_name, {})
    deg_start = deg.get("start_day", 999)

    for day in range(days, 0, -1):
        for point in range(points_per_day):
            ts = now - timedelta(days=day, hours=point * 6)
            day_idx = days - day

            # Base values with daily variation (sine wave for realism)
            daily_factor = math.sin(day_idx * 0.3) * 0.15
            hour_factor = math.sin(point * math.pi / 2) * 0.1

            temp = profile["temp_base"] + profile["temp_var"] * (daily_factor + hour_factor + random.gauss(0, 0.1))
            vib = max(0.1, profile["vib_base"] + profile["vib_var"] * (daily_factor + random.gauss(0, 0.15)))
            power = max(1, profile["power_base"] + profile["power_var"] * (hour_factor + random.gauss(0, 0.1)))
            fan = max(0, profile["fan_base"] + profile["fan_var"] * (hour_factor + random.gauss(0, 0.1)))
            load = max(0, min(100, profile["load_base"] + profile["load_var"] * (hour_factor + random.gauss(0, 0.15))))

            # Apply degradation for specific devices
            if day_idx >= deg_start:
                days_degraded = day_idx - deg_start
                temp += deg.get("temp_drift", 0) * days_degraded
                vib += deg.get("vib_drift", 0) * days_degraded
                if deg.get("fan_lag") and temp > profile["temp_base"] + 5:
                    fan = max(0, fan - days_degraded * 50)  # fan doesn't ramp up

            alarm = None
            if temp > profile["temp_base"] + profile["temp_var"] * 2:
                alarm = "TEMP_HIGH"
            elif vib > profile["vib_base"] + profile["vib_var"] * 2.5:
                alarm = "VIB_HIGH"

            logs.append({
                "device_name": device_name,
                "timestamp": ts,
                "temperature": round(temp, 1),
                "vibration": round(vib, 2),
                "power_consumption": round(power, 1),
                "fan_speed": round(fan, 0),
                "load": round(load, 1),
                "alarm_code": alarm,
            })

    return logs


def init_mock_data():
    """Initialize database with mock data."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if data already exists
    existing = db.query(Device).count()
    if existing > 0:
        db.close()
        return

    # Create devices
    device_map = {}
    for d in DEVICES:
        device = Device(**d)
        db.add(device)
        db.flush()
        device_map[d["name"]] = device.id

    # Create sensor logs - map device types to device names
    type_to_name = {d["device_type"]: d["name"] for d in DEVICES}
    for device_type, profile in SENSOR_PROFILES.items():
        device_name = type_to_name.get(device_type)
        if not device_name:
            continue
        logs = generate_sensor_data(device_name, profile)
        for log in logs:
            db.add(SensorLog(
                device_id=device_map[log["device_name"]],
                timestamp=log["timestamp"],
                temperature=log["temperature"],
                vibration=log["vibration"],
                power_consumption=log["power_consumption"],
                fan_speed=log["fan_speed"],
                load=log["load"],
                alarm_code=log["alarm_code"],
            ))

    # Create documents
    for doc in SAMPLE_DOCUMENTS:
        db.add(Document(
            device_id=device_map[doc["device_name"]],
            doc_name=doc["doc_name"],
            doc_type=doc["doc_type"],
            content=doc["content"],
            chunk_count=doc["content"].count("\n") // 3 + 1,
        ))

    # Create a sample analysis for COMP-04 (critical device)
    db.add(AnalysisResult(
        device_id=device_map["COMP-04"],
        diagnosis="排气温度持续升高，振动值超标，疑似主机轴承磨损导致压缩效率下降和散热异常",
        risk_level="critical",
        risk_probability=0.85,
        predicted_fault_type="主机轴承磨损",
        maintenance_advice="建议立即停机检查主机轴承状态，检查润滑油品质和油位，检查油冷却器是否堵塞",
        priority="critical",
        sensor_evidence=[
            {"metric": "排气温度", "value": 78.5, "threshold": 70.0, "status": "critical", "description": "温度持续上升，超出正常范围"},
            {"metric": "振动", "value": 6.2, "threshold": 5.0, "status": "critical", "description": "振动超标，可能轴承异常"},
            {"metric": "功耗", "value": 42.0, "threshold": 35.0, "status": "warning", "description": "功耗升高但负载未明显增加"},
        ],
        similar_case_evidence=[
            {"source": "空压机故障案例库", "doc_type": "fault_case", "content": "案例：排气温度升高+振动异常，原因为主机轴承内圈剥落", "score": 0.92},
        ],
        rag_evidence=[
            {"source": "空压机维修手册.txt", "doc_type": "manual", "content": "排气温度报警值：100°C，振动标准：低于5.0 mm/s", "score": 0.88},
        ],
        work_order_suggestion={
            "title": "紧急维修：COMP-04 空压机主机轴承检查",
            "description": "设备健康评分45分，排气温度和振动均超标，建议立即停机检修",
            "priority": "critical",
        },
    ))

    db.commit()
    db.close()
    print(f"Mock data initialized: {len(DEVICES)} devices created")
