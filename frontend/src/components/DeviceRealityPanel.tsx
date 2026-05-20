"use client";

import {
  Cpu, MapPin, Factory, Hash, Calendar, Thermometer, Activity, Zap, Fan, Gauge,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import HealthGauge from "./HealthGauge";
import TrendChart from "./TrendChart";

interface DeviceRealityPanelProps {
  device: any;
  logs: any[];
  analysis?: {
    status: string;
    health_score: number;
  } | null;
}

export default function DeviceRealityPanel({ device, logs, analysis }: DeviceRealityPanelProps) {
  // After analysis runs, override device status/score with analysis results
  const displayStatus = analysis?.status ?? device.status;
  const displayHealthScore = analysis?.health_score ?? device.health_score;
  const latestLog = logs?.[logs.length - 1];

  const chartData = (logs || []).slice(-40).map((log: any) => ({
    timestamp: log.timestamp,
    温度: log.temperature,
    振动: log.vibration,
  }));

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Device identity */}
      <div className="rounded-lg p-4" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.2)" }}>
            <Cpu size={18} className="text-cyber-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{device.name}</h2>
            <p className="text-[11px] text-zinc-500">{device.device_type}</p>
          </div>
          <StatusBadge status={displayStatus} />
        </div>

        <div className="space-y-2 text-xs">
          <InfoRow icon={<MapPin size={12} />} label="位置" value={device.location} />
          <InfoRow icon={<Factory size={12} />} label="厂商" value={device.meta_info?.manufacturer || "-"} />
          <InfoRow icon={<Hash size={12} />} label="型号" value={device.meta_info?.model || "-"} />
          <InfoRow icon={<Calendar size={12} />} label="安装日期" value={device.meta_info?.install_date || "-"} />
        </div>

        {/* Health score gauge — synced with analysis result */}
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #27272a" }}>
          <HealthGauge score={displayHealthScore} size={64} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-zinc-500">健康评分</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: displayHealthScore >= 80 ? "#00ff88" : displayHealthScore >= 60 ? "#ffaa00" : "#ff3366" }}>
              {Math.round(displayHealthScore)}
            </div>
          </div>
        </div>

        {device.description && (
          <p className="text-[11px] text-zinc-500 mt-3 pt-3 leading-relaxed" style={{ borderTop: "1px solid #27272a" }}>
            {device.description}
          </p>
        )}
      </div>

      {/* Mini trend chart */}
      <div className="rounded-lg p-4" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
        <h3 className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
          <Activity size={12} className="text-cyber-cyan" /> 传感器趋势 (近7天)
        </h3>
        <TrendChart
          data={chartData}
          height={140}
          lines={[
            { key: "温度", color: "#ff3366", name: "温度 °C" },
            { key: "振动", color: "#ffaa00", name: "振动 mm/s" },
          ]}
        />
      </div>

      {/* Current sensor readings */}
      <div className="rounded-lg p-4" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
        <h3 className="text-[11px] font-semibold text-zinc-400 mb-3">当前读数</h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile icon={<Thermometer size={13} />} color="#ff3366" label="温度" value={latestLog?.temperature?.toFixed(1) ?? "--"} unit="°C" />
          <MetricTile icon={<Activity size={13} />} color="#ffaa00" label="振动" value={latestLog?.vibration?.toFixed(2) ?? "--"} unit="mm/s" />
          <MetricTile icon={<Zap size={13} />} color="#00ff88" label="功耗" value={latestLog?.power_consumption?.toFixed(0) ?? "--"} unit="W" />
          <MetricTile icon={<Fan size={13} />} color="#00f0ff" label="风扇" value={latestLog?.fan_speed?.toFixed(0) ?? "--"} unit="RPM" />
        </div>
      </div>

      {/* Recent raw logs */}
      <div className="rounded-lg flex-1 min-h-0 flex flex-col" style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #27272a" }}>
        <h3 className="text-[11px] font-semibold text-zinc-400 px-4 pt-4 pb-2 flex items-center gap-1.5">
          <Gauge size={12} className="text-zinc-500" /> 原始日志流
        </h3>
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1.5">
          {logs.slice(-15).reverse().map((log: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[10px] py-1.5 px-2 rounded"
              style={{ background: log.alarm_code ? "rgba(255,51,102,0.06)" : "transparent" }}
            >
              <span className="text-zinc-600 w-20 shrink-0">
                {log.timestamp ? new Date(log.timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "--"}
              </span>
              <span className={log.temperature > 70 ? "text-red-400" : "text-zinc-400"}>
                {log.temperature?.toFixed(1)}°C
              </span>
              <span className={log.vibration > 4 ? "text-yellow-400" : "text-zinc-500"}>
                {log.vibration?.toFixed(2)}v
              </span>
              {log.alarm_code && (
                <span className="text-red-400 font-medium ml-auto">{log.alarm_code}</span>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-zinc-600 text-xs py-4 text-center">暂无日志数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600">{icon}</span>
      <span className="text-zinc-500 w-14">{label}</span>
      <span className="text-zinc-300 truncate">{value}</span>
    </div>
  );
}

function MetricTile({ icon, color, label, value, unit }: { icon: React.ReactNode; color: string; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md p-2.5" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] text-zinc-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
        <span className="text-[10px] text-zinc-600">{unit}</span>
      </div>
    </div>
  );
}
