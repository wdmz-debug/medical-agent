"use client";

import { useRouter } from "next/navigation";
import { Thermometer, Activity, Zap, Fan, FileText, Stethoscope } from "lucide-react";
import StatusBadge from "./StatusBadge";
import HealthGauge from "./HealthGauge";

interface DeviceCardProps {
  device: {
    id: number;
    name: string;
    device_type: string;
    status: string;
    health_score: number;
    location: string;
    meta_info: any;
    document_count?: number;
    analysis_count?: number;
    latest_diagnosis?: string | null;
  };
}

const TAG_RENAME_MAP: Record<string, string> = {
  "fallback-index": "本地离线知识库",
};

function sanitizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => t !== "fallback-index")
    .map((t) => TAG_RENAME_MAP[t] || t);
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const router = useRouter();
  const isCritical = device.status === "critical";

  const tags = sanitizeTags(device.meta_info?.tags);
  const docCount = device.document_count ?? 0;
  const diagnosis = device.latest_diagnosis;

  // Generate mock mini sparkline data
  const sparkData = Array.from({ length: 12 }, (_, i) =>
    Math.sin(i * 0.5 + device.id) * 10 + device.health_score
  );

  return (
    <div
      className={`
        glass-card p-4 cursor-pointer group animate-fade-in
        ${isCritical ? "border-red-500 critical-glow" : ""}
      `}
      onClick={() => router.push(`/devices/${device.id}`)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-cyber-cyan text-glow-cyan truncate">
              {device.name}
            </h3>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {device.device_type} | {device.location}
          </p>
        </div>
      </div>

      {/* Health + metrics row */}
      <div className="flex items-center gap-4 mb-3">
        <HealthGauge score={device.health_score} size={72} />
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Thermometer size={12} className="text-red-400" />
            <span>--</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Activity size={12} className="text-yellow-400" />
            <span>--</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Zap size={12} className="text-green-400" />
            <span>--</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Fan size={12} className="text-cyan-400" />
            <span>--</span>
          </div>
        </div>
      </div>

      {/* Agent diagnosis section */}
      <div className="mb-3 px-3 py-2.5 rounded-lg" style={{ background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.08)" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Stethoscope size={13} className="text-cyber-cyan" />
          <span className="text-[11px] font-medium text-cyber-cyan">Agent 主治诊断意见</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
          {diagnosis || "尚未进行诊断分析"}
        </p>
      </div>

      {/* Bottom meta row: document count + tags */}
      <div className="flex items-center justify-between">
        {/* Document count badge */}
        <div className="flex items-center gap-3">
          {docCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <FileText size={12} className="text-purple-400" />
              <span>{docCount} 份历史病历</span>
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(170,85,255,0.1)",
                    border: "1px solid rgba(170,85,255,0.2)",
                    color: "#c084fc",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="sparkline-container mt-2">
        <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={isCritical ? "rgba(255,51,102,0.4)" : "rgba(0,240,255,0.4)"}
            strokeWidth="1.5"
            points={sparkData
              .map((v, i) => {
                const x = (i / (sparkData.length - 1)) * 200;
                const y = 32 - ((v - Math.min(...sparkData)) / (Math.max(...sparkData) - Math.min(...sparkData) || 1)) * 28;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        </svg>
      </div>
    </div>
  );
}
