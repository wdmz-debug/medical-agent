"use client";

import { useState } from "react";
import {
  Brain, AlertTriangle, Shield, Wrench, FileSearch, ChevronDown, ChevronUp,
  ClipboardList, Loader2, Zap, BookOpen, History,
} from "lucide-react";
import { analyzeDevice, createWorkOrder } from "@/lib/api";

interface RightPanelProps {
  deviceId: number;
  analysis: any;
  onAnalysisComplete: (result: any) => void;
}

export default function RightPanel({ deviceId, analysis, onAnalysisComplete }: RightPanelProps) {
  const [loading, setLoading] = useState(false);
  const [showSensor, setShowSensor] = useState(true);
  const [showCases, setShowCases] = useState(false);
  const [showRag, setShowRag] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeDevice(deviceId);
      onAnalysisComplete(result);
    } catch (e: any) {
      console.error("Analysis failed:", e);
    }
    setLoading(false);
  };

  const handleWorkOrder = async () => {
    if (!analysis?.work_order_suggestion) return;
    try {
      await createWorkOrder(deviceId, analysis.work_order_suggestion);
      setOrderMsg("工单已生成");
    } catch (e: any) {
      setOrderMsg(`生成失败: ${e.message}`);
    }
  };

  const priorityColors: Record<string, string> = {
    low: "#00ff88",
    medium: "#ffaa00",
    high: "#ff5500",
    critical: "#ff3366",
  };

  return (
    <div className="space-y-4">
      {/* AI Analysis Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: loading
            ? "rgba(0,240,255,0.1)"
            : "linear-gradient(135deg, rgba(0,240,255,0.25), rgba(170,85,255,0.25))",
          border: "1px solid rgba(0,240,255,0.4)",
          color: "#00f0ff",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> AI 分析中...
          </>
        ) : (
          <>
            <Brain size={16} /> 一键 AI 诊断分析
          </>
        )}
      </button>

      {analysis ? (
        <>
          {/* Diagnosis Result */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
              <Brain size={14} /> 诊断结论
            </h3>
            <p className="text-sm text-white leading-relaxed mb-3">{analysis.diagnosis}</p>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="evidence-section">
                <div className="text-gray-400 mb-1">预测故障</div>
                <div className="text-white font-medium">{analysis.predicted_fault_type}</div>
              </div>
              <div className="evidence-section">
                <div className="text-gray-400 mb-1">风险概率</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(analysis.risk_probability || 0) * 100}%`,
                        background: `linear-gradient(90deg, #00ff88, ${priorityColors[analysis.priority] || "#ffaa00"})`,
                      }}
                    />
                  </div>
                  <span className="text-white font-medium">{((analysis.risk_probability || 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="evidence-section mb-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Wrench size={12} /> 维护建议
              </div>
              <p className="text-xs text-gray-300">{analysis.maintenance_advice}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">优先级:</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  color: priorityColors[analysis.priority] || "#ffaa00",
                  background: `${priorityColors[analysis.priority] || "#ffaa00"}20`,
                  border: `1px solid ${priorityColors[analysis.priority] || "#ffaa00"}40`,
                }}
              >
                {(analysis.priority || "medium").toUpperCase()}
              </span>
            </div>
          </div>

          {/* Generate Work Order */}
          <button
            onClick={handleWorkOrder}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ClipboardList size={14} /> 一键生成工单
          </button>
          {orderMsg && (
            <div className="text-xs text-center text-cyber-green animate-fade-in">{orderMsg}</div>
          )}

          {/* Evidence Sections */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
              <FileSearch size={14} /> 推理依据
            </h3>

            {/* Sensor Evidence */}
            <EvidenceSection
              title="监控数据依据"
              icon={<Zap size={12} className="text-yellow-400" />}
              items={analysis.sensor_evidence || []}
              expanded={showSensor}
              onToggle={() => setShowSensor(!showSensor)}
              type="sensor"
            />

            {/* Case Evidence */}
            <EvidenceSection
              title="历史案例依据"
              icon={<History size={12} className="text-purple-400" />}
              items={analysis.similar_case_evidence || []}
              expanded={showCases}
              onToggle={() => setShowCases(!showCases)}
              type="case"
            />

            {/* RAG Evidence */}
            <EvidenceSection
              title="RAG 文档依据"
              icon={<BookOpen size={12} className="text-cyan-400" />}
              items={analysis.rag_evidence || []}
              expanded={showRag}
              onToggle={() => setShowRag(!showRag)}
              type="rag"
            />
          </div>
        </>
      ) : (
        <div className="glass-card p-8 text-center text-gray-500">
          <Brain size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">点击上方按钮开始 AI 诊断分析</p>
        </div>
      )}
    </div>
  );
}

function EvidenceSection({
  title,
  icon,
  items,
  expanded,
  onToggle,
  type,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  expanded: boolean;
  onToggle: () => void;
  type: "sensor" | "case" | "rag";
}) {
  return (
    <div className="mb-2 last:mb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {icon} {title}
          <span className="text-gray-500">({items.length})</span>
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && items.length > 0 && (
        <div className="space-y-2 mt-1 animate-fade-in">
          {items.map((item: any, i: number) => (
            <div key={i} className="evidence-section text-xs">
              {type === "sensor" ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 font-medium">{item.metric}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        color: item.status === "critical" ? "#ff3366" : item.status === "warning" ? "#ffaa00" : "#00ff88",
                        background: item.status === "critical" ? "#ff336620" : item.status === "warning" ? "#ffaa0020" : "#00ff8820",
                      }}
                    >
                      {item.status === "critical" ? "异常" : item.status === "warning" ? "警告" : "正常"}
                    </span>
                  </div>
                  <div className="text-gray-400">{item.description}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 font-medium">{item.source}</span>
                    {item.score > 0 && (
                      <span className="text-gray-500">相似度 {(item.score * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="text-gray-400 line-clamp-3">{item.content}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {expanded && items.length === 0 && (
        <div className="text-xs text-gray-500 py-2">暂无数据</div>
      )}
    </div>
  );
}
