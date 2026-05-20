"use client";

import { useState } from "react";
import {
  Activity, AlertTriangle, BookOpen, FileText, ClipboardCheck,
  ChevronDown, ChevronRight, Wrench, Clock, Package, CheckCircle,
  XCircle, Send,
} from "lucide-react";

interface EvidenceSource {
  source_name: string;
  excerpt: string;
  confidence: number;
}

interface DraftWorkOrder {
  title: string;
  description: string;
  suggested_parts: string[];
  estimated_time: string;
}

interface AgentActionPanelProps {
  analysis: {
    status: string;
    health_score: number;
    risk_probability?: number;
    remaining_useful_life_days?: number;
    evidence_sources: EvidenceSource[];
    draft_work_order: DraftWorkOrder;
  };
  analysisComplete?: boolean;
  onReject?: (feedback: string) => void;
}

export default function AgentActionPanel({ analysis, analysisComplete = false, onReject }: AgentActionPanelProps) {
  const [showEvidence, setShowEvidence] = useState(true);
  const [orderApproved, setOrderApproved] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const statusColor = analysis.status === "critical" ? "#ff3366" : analysis.status === "warning" ? "#ffaa00" : "#00ff88";
  const statusLabel = analysis.status === "critical" ? "高危" : analysis.status === "warning" ? "警告" : "健康";
  const riskPct = Math.round((analysis.risk_probability ?? (100 - analysis.health_score) / 100) * 100);
  const rulDays = analysis.remaining_useful_life_days;
  const evidenceSources = analysis.evidence_sources ?? [];
  const workOrder = analysis.draft_work_order ?? { title: "", description: "", suggested_parts: [], estimated_time: "" };
  const hasWorkOrder = analysisComplete && !!workOrder.title;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Big health score */}
      <div className="rounded-lg p-5 text-center shrink-0" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
        <div className="text-[11px] text-zinc-500 mb-1">健康评分</div>
        <div
          className="text-6xl font-black tabular-nums mb-1 transition-all duration-700"
          style={{ color: statusColor, textShadow: analysisComplete ? `0 0 30px ${statusColor}40` : "none" }}
        >
          {analysis.health_score}
        </div>
        <div
          className="text-[11px] font-medium px-3 py-0.5 rounded-full inline-block"
          style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}25` }}
        >
          {statusLabel}
        </div>

        {/* Risk bar */}
        <div className="mt-4 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <AlertTriangle size={11} /> 故障概率
            </span>
            <span className="text-xs font-bold tabular-nums" style={{ color: statusColor }}>{riskPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: analysisComplete ? `${riskPct}%` : "0%",
                background: `linear-gradient(90deg, #00ff88, ${statusColor})`,
                boxShadow: `0 0 8px ${statusColor}60`,
              }}
            />
          </div>
        </div>

        {/* RUL countdown */}
        {analysisComplete && rulDays != null && (
          <div className="mt-3 animate-fade-in">
            <div
              className="rounded-md px-3 py-2.5"
              style={{
                background: rulDays <= 7 ? "rgba(255,51,102,0.08)" : rulDays <= 14 ? "rgba(255,170,0,0.08)" : "rgba(0,240,255,0.05)",
                border: `1px solid ${rulDays <= 7 ? "rgba(255,51,102,0.25)" : rulDays <= 14 ? "rgba(255,170,0,0.25)" : "rgba(0,240,255,0.15)"}`,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Clock size={10} /> 预计剩余寿命
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums"
                  style={{
                    color: rulDays <= 7 ? "#ff3366" : rulDays <= 14 ? "#ffaa00" : "#00f0ff",
                    background: rulDays <= 7 ? "rgba(255,51,102,0.1)" : rulDays <= 14 ? "rgba(255,170,0,0.1)" : "rgba(0,240,255,0.1)",
                    border: `1px solid ${rulDays <= 7 ? "rgba(255,51,102,0.2)" : rulDays <= 14 ? "rgba(255,170,0,0.2)" : "rgba(0,240,255,0.2)"}`,
                  }}
                >
                  {rulDays <= 7 ? "紧急" : rulDays <= 14 ? "临近" : "安全"}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-black tabular-nums"
                  style={{
                    color: rulDays <= 7 ? "#ff3366" : rulDays <= 14 ? "#ffaa00" : "#00f0ff",
                    textShadow: rulDays <= 7 ? "0 0 20px rgba(255,51,102,0.3)" : rulDays <= 14 ? "0 0 20px rgba(255,170,0,0.3)" : "none",
                  }}
                >
                  {rulDays}
                </span>
                <span className="text-xs text-zinc-500">天</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                {rulDays <= 7
                  ? "建议立即安排停机维护，避免突发故障"
                  : rulDays <= 14
                    ? "建议在寿命耗尽前安排预防性维护"
                    : "设备运行稳定，按计划执行定期维护即可"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Evidence sources */}
      <div className="rounded-lg flex-1 min-h-0 flex flex-col" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="flex items-center justify-between px-4 py-3 w-full hover:bg-white/[0.02] transition-colors shrink-0"
          style={{ borderBottom: showEvidence ? "1px solid #27272a" : "none" }}
        >
          <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <BookOpen size={12} className="text-purple-400" />
            知识库证据引用
            <span className="text-[10px] text-zinc-600">({evidenceSources.length})</span>
          </span>
          {showEvidence ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />}
        </button>

        {showEvidence && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {evidenceSources.map((ev, i) => (
              <div
                key={i}
                style={{ animation: "fadeSlideIn 0.4s ease-out forwards", animationDelay: `${i * 100}ms`, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-purple-400" />
                    <span className="text-[11px] font-medium text-zinc-300">{ev.source_name}</span>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full tabular-nums"
                    style={{
                      color: ev.confidence > 0.9 ? "#00ff88" : ev.confidence > 0.8 ? "#ffaa00" : "#64748b",
                      background: ev.confidence > 0.9 ? "rgba(0,255,136,0.1)" : ev.confidence > 0.8 ? "rgba(255,170,0,0.1)" : "rgba(100,116,139,0.1)",
                      border: `1px solid ${ev.confidence > 0.9 ? "rgba(0,255,136,0.2)" : ev.confidence > 0.8 ? "rgba(255,170,0,0.2)" : "rgba(100,116,139,0.15)"}`,
                    }}
                  >
                    置信度 {(ev.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div
                  className="text-[11px] text-zinc-500 leading-relaxed pl-3"
                  style={{ borderLeft: "2px solid rgba(170,85,255,0.25)" }}
                >
                  <span className="text-zinc-400">&ldquo;</span>
                  {ev.excerpt}
                  <span className="text-zinc-400">&rdquo;</span>
                </div>
              </div>
            ))}

            {evidenceSources.length === 0 && (
              <div className="text-zinc-600 text-xs py-4 text-center">暂无证据引用</div>
            )}
          </div>
        )}
      </div>

      {/* Draft work order — only appears after analysis completes */}
      {hasWorkOrder && (
        <div
          className="rounded-lg p-4 shrink-0"
          style={{
            background: "rgba(24,24,27,0.8)",
            border: orderApproved ? "1px solid rgba(0,255,136,0.3)" : "1px solid #27272a",
            animation: "workOrderReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            opacity: 0,
          }}
        >
          <h3 className="text-[11px] font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
            <ClipboardCheck size={12} className="text-cyan-400" />
            待审批工单草稿
          </h3>

          <div className="rounded-md p-3 mb-3" style={{ background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.1)" }}>
            <div className="text-xs font-medium text-white mb-1.5">{workOrder.title}</div>
            <p className="text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap">
              {workOrder.description}
            </p>
          </div>

          {workOrder.suggested_parts.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-zinc-600 mb-1.5 flex items-center gap-1">
                <Package size={10} /> 建议备件
              </div>
              <div className="flex flex-wrap gap-1.5">
                {workOrder.suggested_parts.map((part, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.15)", color: "#67e8f9" }}
                  >
                    {part}
                  </span>
                ))}
              </div>
            </div>
          )}

          {workOrder.estimated_time && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-3">
              <Clock size={11} className="text-zinc-600" />
              {workOrder.estimated_time}
            </div>
          )}

          {/* Reject feedback input — shown when rejecting */}
          {rejecting && (
            <div className="mb-3 animate-fade-in">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="例如：请检查外部环境温度传感器"
                rows={3}
                className="w-full resize-none text-xs"
                style={{
                  background: "rgba(255,51,102,0.05)",
                  border: "1px solid rgba(255,51,102,0.2)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#e2e8f0",
                }}
                autoFocus
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Approve button */}
            <button
              onClick={() => setOrderApproved(true)}
              disabled={orderApproved}
              className="flex-1 py-2.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: orderApproved
                  ? "rgba(0,255,136,0.15)"
                  : "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,255,136,0.2))",
                border: orderApproved
                  ? "1px solid rgba(0,255,136,0.4)"
                  : "1px solid rgba(0,240,255,0.4)",
                color: orderApproved ? "#00ff88" : "#00f0ff",
                boxShadow: orderApproved ? "none" : "0 0 15px rgba(0,240,255,0.15)",
              }}
            >
              {orderApproved ? (
                <>
                  <CheckCircle size={14} /> 已派发
                </>
              ) : (
                <>
                  <Wrench size={14} /> Approve
                </>
              )}
            </button>

            {/* Reject button / Submit feedback */}
            {!orderApproved && (
              rejecting ? (
                <button
                  onClick={() => {
                    if (feedback.trim()) {
                      onReject?.(feedback.trim());
                      setRejecting(false);
                      setFeedback("");
                    }
                  }}
                  disabled={!feedback.trim()}
                  className="flex-1 py-2.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: feedback.trim()
                      ? "linear-gradient(135deg, rgba(255,51,102,0.25), rgba(255,100,50,0.2))"
                      : "rgba(255,51,102,0.08)",
                    border: feedback.trim()
                      ? "1px solid rgba(255,51,102,0.5)"
                      : "1px solid rgba(255,51,102,0.15)",
                    color: feedback.trim() ? "#ff5555" : "#666",
                    boxShadow: feedback.trim() ? "0 0 12px rgba(255,51,102,0.15)" : "none",
                  }}
                >
                  <Send size={13} /> 提交线索
                </button>
              ) : (
                <button
                  onClick={() => setRejecting(true)}
                  className="flex-1 py-2.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(255,51,102,0.08)",
                    border: "1px solid rgba(255,51,102,0.2)",
                    color: "#ff6b6b",
                  }}
                >
                  <XCircle size={14} /> Reject
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Pending state — analysis not done yet */}
      {!hasWorkOrder && evidenceSources.length === 0 && (
        <div className="rounded-lg p-6 text-center shrink-0" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
          <ClipboardCheck size={24} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-[11px] text-zinc-600">等待 Agent 完成诊断后生成工单</p>
        </div>
      )}

      <style jsx global>{`
        @keyframes workOrderReveal {
          0% { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
