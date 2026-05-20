"use client";

import { useState, useEffect, useRef } from "react";
import {
  Database, TrendingUp, Search, FileText, Brain, ClipboardList,
  ChevronDown, ChevronRight, Bot, Play, Loader2,
} from "lucide-react";

interface PipelineStep {
  timestamp: string;
  action: string;
  tool_used: string;
  content: string;
  icon_type: string;
}

interface AgentThoughtTimelineProps {
  steps: PipelineStep[];
  onRunAnalysis: () => void;
  loading: boolean;
  onComplete?: () => void;
}

const ICON_MAP: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  database:     { icon: Database,      color: "#00f0ff" },
  chart:        { icon: TrendingUp,    color: "#ffaa00" },
  search:       { icon: Search,        color: "#aa55ff" },
  "file-text":  { icon: FileText,      color: "#00ff88" },
  brain:        { icon: Brain,         color: "#ff3366" },
  clipboard:    { icon: ClipboardList, color: "#00f0ff" },
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString("zh-CN", {
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ts; }
}

const STEP_INTERVAL_MS = 1500;

export default function AgentThoughtTimeline({ steps, onRunAnalysis, loading, onComplete }: AgentThoughtTimelineProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(0);
  const [thinking, setThinking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLenRef = useRef(0);

  const toggle = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  // Staggered step reveal
  useEffect(() => {
    if (steps.length > 0 && prevLenRef.current === 0) {
      // New batch arrived — start stagger
      setVisibleCount(0);
      setThinking(true);
      setExpanded({});

      let count = 0;
      timerRef.current = setInterval(() => {
        count++;
        setVisibleCount(count);
        if (count >= steps.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setThinking(false);
          onComplete?.();
        }
      }, STEP_INTERVAL_MS);

      // Reveal first step immediately
      count = 1;
      setVisibleCount(1);
    }
    prevLenRef.current = steps.length;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [steps, onComplete]);

  const allRevealed = steps.length > 0 && visibleCount >= steps.length;
  const visibleSteps = steps.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #27272a" }}>
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-cyber-cyan" />
          <span className="text-sm font-semibold text-white">Agent 推理流</span>
          {steps.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {visibleCount}/{steps.length} 步
            </span>
          )}
        </div>
        <button
          onClick={() => onRunAnalysis()}
          disabled={loading || thinking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: (loading || thinking) ? "rgba(0,240,255,0.08)" : "rgba(0,240,255,0.15)",
            border: "1px solid rgba(0,240,255,0.3)",
            color: "#00f0ff",
            opacity: (loading || thinking) ? 0.5 : 1,
            cursor: (loading || thinking) ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" /> 调度中...
            </>
          ) : thinking ? (
            <>
              <Loader2 size={12} className="animate-spin" /> 推演中...
            </>
          ) : (
            <>
              <Play size={12} /> 运行诊断
            </>
          )}
        </button>
      </div>

      {/* Console body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Empty state */}
        {steps.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Bot size={40} className="mb-3 opacity-30" />
            <p className="text-sm mb-1">等待 Agent 启动分析...</p>
            <p className="text-[11px]">点击右上角 &ldquo;运行诊断&rdquo; 触发</p>
          </div>
        )}

        {/* Initial loading — API call in flight, no steps yet */}
        {loading && steps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-12 h-12 mb-4">
              <span className="absolute inset-0 rounded-full border-2 border-cyan-400/20" />
              <span className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
              <span className="absolute inset-2 rounded-full border-2 border-t-purple-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            </div>
            <p className="text-sm text-cyan-400 animate-pulse">Agent 正在接管系统并进行深度推演...</p>
          </div>
        )}

        {/* Thinking banner — steps are being revealed */}
        {thinking && visibleCount < steps.length && (
          <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 rounded-lg animate-fade-in" style={{ background: "rgba(0,240,255,0.05)", border: "1px solid rgba(0,240,255,0.1)" }}>
            <Loader2 size={14} className="text-cyan-400 animate-spin shrink-0" />
            <span className="text-xs text-cyan-400">Agent 正在接管系统并进行深度推演...</span>
            <span className="ml-auto text-[10px] text-zinc-600 tabular-nums">{visibleCount}/{steps.length}</span>
          </div>
        )}

        {/* Step timeline */}
        <div className="relative">
          {visibleSteps.length > 0 && (
            <div className="absolute left-[15px] top-4 bottom-4 w-px" style={{ background: "linear-gradient(to bottom, rgba(0,240,255,0.3), rgba(0,240,255,0.05))" }} />
          )}

          {visibleSteps.map((step, i) => {
            const config = ICON_MAP[step.icon_type] || { icon: Brain, color: "#00f0ff" };
            const Icon = config.icon;
            const isOpen = expanded[i] !== false;
            const isLatest = i === visibleCount - 1 && thinking;

            return (
              <div
                key={`${step.action}-${i}`}
                className="relative mb-3 last:mb-0"
                style={{
                  animation: "fadeSlideIn 0.5s ease-out forwards",
                  opacity: 0,
                }}
              >
                {/* Icon node */}
                <div
                  className="absolute left-0 top-1 w-[31px] h-[31px] rounded-full flex items-center justify-center z-10"
                  style={{
                    background: "rgba(10,14,26,0.9)",
                    border: `2px solid ${config.color}40`,
                    boxShadow: isLatest ? `0 0 10px ${config.color}30` : "none",
                  }}
                >
                  <Icon size={13} color={config.color} />
                </div>

                {/* Content card */}
                <div
                  className="ml-11 rounded-lg overflow-hidden transition-all duration-300"
                  style={{
                    background: "rgba(24,24,27,0.8)",
                    border: `1px solid ${isOpen ? config.color + "25" : "#27272a"}`,
                    boxShadow: isLatest ? `0 0 12px ${config.color}15` : "none",
                  }}
                >
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen
                        ? <ChevronDown size={12} className="text-zinc-500 shrink-0" />
                        : <ChevronRight size={12} className="text-zinc-500 shrink-0" />}
                      <span className="text-xs font-medium text-white truncate">{step.action}</span>
                      {isLatest && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: `${config.color}12`, color: config.color, border: `1px solid ${config.color}20` }}
                      >
                        {step.tool_used}
                      </span>
                      <span className="text-[10px] text-zinc-600">{formatTime(step.timestamp)}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 animate-fade-in">
                      <div
                        className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap rounded-md p-3 font-mono"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #1a1a1a" }}
                      >
                        {step.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion */}
        {allRevealed && !thinking && (
          <div
            className="flex items-center gap-2 mt-5 ml-11 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(0,255,136,0.05)",
              border: "1px solid rgba(0,255,136,0.15)",
              animation: "fadeSlideIn 0.6s ease-out forwards",
              opacity: 0,
            }}
          >
            <span className="text-sm">&#9989;</span>
            <span className="text-[12px] font-medium text-green-400">诊断与推演完成</span>
          </div>
        )}
      </div>

      {/* Global keyframe injected once */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
