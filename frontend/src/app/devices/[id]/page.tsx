"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Bot } from "lucide-react";
import DeviceRealityPanel from "@/components/DeviceRealityPanel";
import AgentThoughtTimeline from "@/components/AgentThoughtTimeline";
import AgentActionPanel from "@/components/AgentActionPanel";
import AgentChatDrawer from "@/components/AgentChatDrawer";
import { getDevice, analyzeDevice } from "@/lib/api";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <span className="absolute inset-0 rounded-full border-2 border-cyan-400/20" />
            <span className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
          </div>
          <div className="text-sm text-zinc-500">连接设备数据...</div>
          <div className="text-[10px] text-zinc-700 mt-2">Device ID: {params.id}</div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-500">
          <p className="mb-1 text-red-400 text-sm">{error || "设备未找到"}</p>
          <p className="mb-3 text-[11px] text-zinc-600">请确认后端服务已启动 (http://localhost:8000)</p>
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
    pipeline_steps: [],
    evidence_sources: [],
    draft_work_order: { title: "", description: "", suggested_parts: [], estimated_time: "" },
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: "rgba(24,24,27,0.6)", borderBottom: "1px solid #27272a" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ border: "1px solid #27272a" }}
          >
            <ArrowLeft size={15} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-cyber-cyan" />
            <div>
              <h1 className="text-sm font-bold text-white">
                {device.name}
                <span className="text-zinc-600 font-normal ml-2">{device.device_type}</span>
              </h1>
              <p className="text-[10px] text-zinc-600">{device.location}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">Device ID: {device.id}</span>
          <button
            onClick={() => fetchDevice()}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ border: "1px solid #27272a" }}
          >
            <RefreshCw size={14} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 min-h-0 grid grid-cols-10 gap-px" style={{ background: "#1a1a1a" }}>
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
    </div>
  );
}
