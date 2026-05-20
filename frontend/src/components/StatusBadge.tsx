"use client";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "正常", color: "#00ff88", bg: "rgba(0,255,136,0.15)" },
  warning: { label: "警告", color: "#ffaa00", bg: "rgba(255,170,0,0.15)" },
  critical: { label: "故障", color: "#ff3366", bg: "rgba(255,51,102,0.15)" },
  offline: { label: "离线", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status === "critical" ? "status-critical" : ""}`}
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}
