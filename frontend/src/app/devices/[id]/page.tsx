"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Bot, FileText, Loader2, CheckCircle } from "lucide-react";
import DeviceRealityPanel from "@/components/DeviceRealityPanel";
import AgentThoughtTimeline from "@/components/AgentThoughtTimeline";
import AgentActionPanel from "@/components/AgentActionPanel";
import AgentChatDrawer from "@/components/AgentChatDrawer";
import { getDevice, analyzeDevice, dispatchWorkOrder } from "@/lib/api";

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = Number(params.id);

  const [device, setDevice] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchDevice = useCallback(async (signal?: AbortSignal) => {
    if (!deviceId || isNaN(deviceId)) {
      console.error("[DeviceDetail] Invalid deviceId:", params.id);
      setError("无效的设备 ID");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getDevice(deviceId, signal);
      if (signal?.aborted) return;
      setDevice(data);
      setLogs(data.recent_logs || []);
    } catch (e: any) {
      if (e.name === "AbortError" || signal?.aborted) return;
      console.error("[DeviceDetail] Failed to fetch device:", e);
      setError(e instanceof Error ? e.message : "设备数据加载失败");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [deviceId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDevice(controller.signal);
    return () => controller.abort();
  }, [fetchDevice]);

  // Safety timeout: force exit loading after 8s
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      console.warn("[DeviceDetail] Loading timeout — forcing exit");
      setLoading(false);
      if (!device) setError("加载超时，请检查后端服务是否运行在 localhost:8000");
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading, device]);

  const handleRunAnalysis = async (feedback?: string) => {
    setAnalyzing(true);
    setAnalysisComplete(false);
    setCurrentAnalysis(null);

    try {
      const result = await analyzeDevice(deviceId, feedback);
      setCurrentAnalysis({
        status: result.status,
        health_score: result.health_score,
        remaining_useful_life_days: result.remaining_useful_life_days ?? undefined,
        maintenance_cost: result.maintenance_cost ?? undefined,
        estimated_loss: result.estimated_loss ?? undefined,
        risk_probability: result.draft_work_order ? (100 - result.health_score) / 100 : 0,
        pipeline_steps: result.pipeline_steps || [],
        evidence_sources: result.evidence_sources || [],
        draft_work_order: result.draft_work_order || {
          title: "", description: "", suggested_parts: [], estimated_time: "",
        },
      });
    } catch (e) {
      console.error("[DeviceDetail] Analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalysisComplete = () => {
    setAnalysisComplete(true);
    fetchDevice();
  };

  const handleExportPDF = () => {
    setPdfLoading(true);
    const da = displayAnalysis;
    const statusLabel = da.status === "critical" ? "高危" : da.status === "warning" ? "警告" : "健康";
    const stepsHtml = da.pipeline_steps.length > 0
      ? da.pipeline_steps.map((s: any, i: number) => `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i + 1}</td><td style="padding:4px 8px;border:1px solid #ddd;">${s.action}</td><td style="padding:4px 8px;border:1px solid #ddd;">${s.tool_used}</td><td style="padding:4px 8px;border:1px solid #ddd;">${s.agent_role || "-"}</td></tr>`).join("")
      : '<tr><td colspan="4" style="padding:8px;text-align:center;color:#999;border:1px solid #ddd;">暂无推演步骤</td></tr>';
    const evidenceHtml = da.evidence_sources.length > 0
      ? da.evidence_sources.map((e: any) => `<li style="margin-bottom:6px;"><strong>${e.source_name}</strong>（置信度 ${(e.confidence * 100).toFixed(0)}%）<br/><span style="color:#555;">${e.excerpt}</span></li>`).join("")
      : '<li style="color:#999;">暂无证据引用</li>';

    const html = `
      <div id="pdf-content" style="font-family:'Microsoft YaHei',sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1a1a1a;">
        <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #0ea5e9;padding-bottom:20px;">
          <h1 style="font-size:24px;margin:0;">设备病历本 Agent · 诊断报告</h1>
          <p style="color:#666;margin:8px 0 0;">${device.name} | ${device.device_type} | ${device.location}</p>
        </div>
        <div style="display:flex;gap:20px;margin-bottom:24px;">
          <div style="flex:1;background:#f0f9ff;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#666;">健康评分</div>
            <div style="font-size:48px;font-weight:900;color:${da.health_score >= 80 ? '#22c55e' : da.health_score >= 60 ? '#f59e0b' : '#ef4444'};">${da.health_score}</div>
            <div style="font-size:12px;color:${da.status === 'critical' ? '#ef4444' : da.status === 'warning' ? '#f59e0b' : '#22c55e'};">${statusLabel}</div>
          </div>
          <div style="flex:1;background:#fef3c7;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#666;">剩余寿命</div>
            <div style="font-size:48px;font-weight:900;color:#f59e0b;">${da.remaining_useful_life_days ?? "-"}</div>
            <div style="font-size:12px;color:#666;">天</div>
          </div>
          ${da.maintenance_cost != null ? `
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#666;">维修成本</div>
            <div style="font-size:32px;font-weight:900;color:#22c55e;">¥${da.maintenance_cost.toLocaleString()}</div>
          </div>` : ""}
          ${da.estimated_loss != null ? `
          <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#666;">预测宕机损失</div>
            <div style="font-size:32px;font-weight:900;color:#ef4444;">¥${da.estimated_loss.toLocaleString()}</div>
          </div>` : ""}
        </div>
        <h2 style="font-size:16px;margin:20px 0 10px;border-left:4px solid #0ea5e9;padding-left:10px;">Agent 推演步骤</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">#</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">动作</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">工具</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Agent 角色</th>
          </tr></thead>
          <tbody>${stepsHtml}</tbody>
        </table>
        <h2 style="font-size:16px;margin:20px 0 10px;border-left:4px solid #8b5cf6;padding-left:10px;">知识库证据引用</h2>
        <ul style="padding-left:20px;margin-bottom:24px;">${evidenceHtml}</ul>
        ${da.draft_work_order?.title ? `
        <h2 style="font-size:16px;margin:20px 0 10px;border-left:4px solid #0ea5e9;padding-left:10px;">维护工单建议</h2>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <h3 style="font-size:14px;margin:0 0 8px;">${da.draft_work_order.title}</h3>
          <p style="font-size:13px;color:#555;white-space:pre-wrap;margin:0 0 8px;">${da.draft_work_order.description}</p>
          ${da.draft_work_order.suggested_parts.length > 0 ? `<p style="font-size:12px;color:#666;margin:0;"><strong>建议备件：</strong>${da.draft_work_order.suggested_parts.join("、")}</p>` : ""}
          ${da.draft_work_order.estimated_time ? `<p style="font-size:12px;color:#666;margin:4px 0 0;"><strong>预计工时：</strong>${da.draft_work_order.estimated_time}</p>` : ""}
        </div>` : ""}
        <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#999;text-align:center;">
          设备病历本 Agent · AI 驱动的预测性维护系统 | 报告生成时间：${new Date().toLocaleString("zh-CN")}
        </div>
      </div>
    `;
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    setTimeout(() => {
      window.print();
      document.body.removeChild(container);
      setPdfLoading(false);
    }, 200);
  };

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      await dispatchWorkOrder(deviceId);
      setToast("工单已飞书/钉钉通知车间主任及一线维保团队");
    } catch (e) {
      console.error("[Dispatch] Failed:", e);
      setToast("推送失败，请检查后端服务");
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <span className="absolute inset-0 rounded-full border-2 border-cyan-400/20" />
            <span className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
          </div>
          <div className="text-sm text-zinc-400">连接设备数据...</div>
          <div className="text-[10px] text-zinc-500 mt-2">Device ID: {params.id}</div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-400">
          <p className="mb-1 text-red-400 text-sm">{error || "设备未找到"}</p>
          <p className="mb-3 text-[11px] text-zinc-400">请确认后端服务已启动 (http://localhost:8000)</p>
          <button onClick={() => { setLoading(true); setError(null); fetchDevice(undefined); }} className="btn-primary mr-2">重试</button>
          <button onClick={() => router.push("/")} className="btn-primary">返回首页</button>
        </div>
      </div>
    );
  }

  // Build display analysis: prefer live pipeline result, fall back to device baseline
  const displayAnalysis = currentAnalysis || {
    status: device.status,
    health_score: device.health_score,
    risk_probability: 0,
    maintenance_cost: undefined,
    estimated_loss: undefined,
    pipeline_steps: [],
    evidence_sources: [],
    draft_work_order: { title: "", description: "", suggested_parts: [], estimated_time: "" },
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: "rgba(24,24,27,0.6)", borderBottom: "1px solid #3f3f46" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ border: "1px solid #3f3f46" }}
          >
            <ArrowLeft size={15} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-cyber-cyan" />
            <div>
              <h1 className="text-sm font-bold text-white">
                {device.name}
                <span className="text-zinc-400 font-normal ml-2">{device.device_type}</span>
              </h1>
              <p className="text-[10px] text-zinc-400">{device.location}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400">Device ID: {device.id}</span>
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:bg-white/5"
            style={{
              border: "1px solid #3f3f46",
              color: pdfLoading ? "#666" : "#a78bfa",
              opacity: pdfLoading ? 0.6 : 1,
            }}
          >
            {pdfLoading ? (
              <><Loader2 size={12} className="animate-spin" /> 生成中...</>
            ) : (
              <><FileText size={12} /> 导出报告</>
            )}
          </button>
          <button
            onClick={() => fetchDevice()}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ border: "1px solid #3f3f46" }}
          >
            <RefreshCw size={14} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 min-h-0 grid grid-cols-10 gap-px" style={{ background: "#2e2e33" }}>
        {/* Left: Device Reality (3/10) */}
        <div className="col-span-3 bg-zinc-950 overflow-y-auto p-3">
          <DeviceRealityPanel device={device} logs={logs} analysis={currentAnalysis} />
        </div>

        {/* Center: Agent Thought Timeline (4/10) */}
        <div className="col-span-4 bg-zinc-950 overflow-hidden flex flex-col">
          <AgentThoughtTimeline
            steps={displayAnalysis.pipeline_steps}
            onRunAnalysis={handleRunAnalysis}
            loading={analyzing}
            onComplete={handleAnalysisComplete}
          />
        </div>

        {/* Right: Agent Action Panel (3/10) */}
        <div className="col-span-3 bg-zinc-950 overflow-y-auto p-3">
          <AgentActionPanel
            analysis={displayAnalysis}
            analysisComplete={analysisComplete}
            onReject={(feedback) => handleRunAnalysis(feedback)}
            onApprove={handleDispatch}
            dispatching={dispatching}
          />
        </div>
      </div>

      {/* Floating chat drawer */}
      <AgentChatDrawer
        deviceId={device.id}
        deviceName={device.name}
        deviceStatus={device.status}
        healthScore={device.health_score}
      />

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-lg shadow-2xl"
          style={{
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,240,255,0.15))",
            border: "1px solid rgba(0,255,136,0.4)",
            backdropFilter: "blur(12px)",
            animation: "toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          <CheckCircle size={16} className="text-green-400 shrink-0" />
          <span className="text-sm font-medium text-green-300">{toast}</span>
        </div>
      )}

      {/* Print CSS for PDF export */}
      <style jsx global>{`
        @media print {
          body > *:not(#pdf-content) { display: none !important; }
          #pdf-content { display: block !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
