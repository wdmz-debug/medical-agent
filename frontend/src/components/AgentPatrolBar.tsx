"use client";

import { Shield, Scan } from "lucide-react";

interface AgentPatrolBarProps {
  deviceCount: number;
}

export default function AgentPatrolBar({ deviceCount }: AgentPatrolBarProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-4"
      style={{
        background: "rgba(0, 255, 136, 0.04)",
        border: "1px solid rgba(0, 255, 136, 0.12)",
      }}
    >
      {/* Breathing dot */}
      <div className="relative flex items-center justify-center w-5 h-5">
        <span className="absolute w-5 h-5 rounded-full bg-green-500/20 agent-breathing" />
        <span className="relative w-2 h-2 rounded-full bg-green-400 agent-dot" />
      </div>

      {/* Icon */}
      <Shield size={15} className="text-green-400/80" />

      {/* Text */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs font-medium text-green-400/90">
          Agent 守护中
        </span>
        <span className="text-[11px] text-gray-500 patrol-text">
          ：正在对 {deviceCount} 台设备进行 24 小时高频巡检...
        </span>
      </div>

      {/* Scan icon animation */}
      <Scan size={14} className="text-green-400/50 animate-pulse" />

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,136,0.1)" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-green-400 font-medium tracking-wider">LIVE</span>
      </div>
    </div>
  );
}
