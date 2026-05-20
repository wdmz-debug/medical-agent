# 设备病历本 Agent - MVP Demo

AI驱动的设备预测性维护健康管理系统。

## 技术栈

**前端**: Next.js 14 + TypeScript + Tailwind CSS + Recharts + Lucide React
**后端**: Python FastAPI + LangChain + ChromaDB + SQLite + pandas

## 快速启动

### 1. 启动后端

```bash
cd backend

# 创建虚拟环境 (推荐)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制配置文件 (可选，使用真实 LLM 时需要)
cp .env.example .env

# 启动服务
python main.py
```

后端将运行在 http://localhost:8000

首次启动会自动:
- 创建 SQLite 数据库
- 内置 6 台设备的模拟数据
- 为每台设备生成 30 天的传感器日志
- 将示例文档索引到 RAG 向量库

### 2. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 http://localhost:3000

## 内置设备

| 编号 | 名称 | 类型 | 状态 | 说明 |
|------|------|------|------|------|
| 1 | CNC-01 | 数控机床 | 警告 | 温度渐升，疑似散热问题 |
| 2 | PUMP-02 | 工业泵 | 正常 | 冷却水泵 |
| 3 | FAN-03 | 工业风机 | 正常 | 通风风机 |
| 4 | COMP-04 | 空压机 | 故障 | 严重退化，需紧急维护 |
| 5 | SERVER-05 | 服务器 | 警告 | CPU/GPU温度升高，风扇响应不足 |
| 6 | MOTOR-06 | 电机 | 正常 | 传送带驱动电机 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/devices | 获取设备列表 |
| GET | /api/devices/{id} | 获取设备详情(含日志、文档、分析) |
| POST | /api/devices/{id}/logs | 新增监控日志 |
| POST | /api/devices/{id}/documents | 上传 RAG 文档 |
| POST | /api/devices/{id}/analyze | 触发 AI 预测分析 |
| POST | /api/devices/{id}/work-orders | 生成维护工单 |

## LLM 配置

默认使用 mock 模式（规则引擎），无需 API Key。

切换到真实 LLM：编辑 `backend/.env`

```bash
# 选择提供商
LLM_PROVIDER=deepseek  # 或 qwen / kimi

# 填入对应 API Key
DEEPSEEK_API_KEY=sk-xxx
QWEN_API_KEY=sk-xxx
KIMI_API_KEY=sk-xxx
```

## 项目结构

```
medical-agent/
├── frontend/           # Next.js 前端
│   └── src/
│       ├── app/        # 页面 (首页 + 设备详情)
│       ├── components/ # 组件 (卡片、图表、面板)
│       └── lib/        # API 客户端
├── backend/            # FastAPI 后端
│   ├── routers/        # API 路由
│   ├── services/       # 核心服务
│   │   ├── agent_pipeline.py   # Agent 流水线
│   │   ├── rag_service.py      # RAG 检索
│   │   └── sensor_analysis.py  # 传感器分析
│   ├── models.py       # 数据库模型
│   ├── schemas.py      # Pydantic 模型
│   └── mock_data.py    # 模拟数据
└── README.md
```
