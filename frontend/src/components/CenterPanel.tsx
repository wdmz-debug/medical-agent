"use client";

import HealthGauge from "./HealthGauge";
import TrendChart from "./TrendChart";
import Timeline from "./Timeline";
import StatusBadge from "./StatusBadge";
import { Shield, Clock, Calendar, AlertTriangle } from "lucide-react";

interface CenterPanelProps {
  device: any;
  logs: any[];
  analysis: any;
}

export default function CenterPanel({ device, logs, analysis }: CenterPanelProps) {
  // Prepare chart data
  const chartData = (logs || []).slice(-60).map((log: any) => ({
    timestamp: log.timestamp,
    温度: log.temperature,
    振动: log.vibration,
    功耗: log.power_consumption ? log.power_consumption / 10 : null, // scale for chart
    风扇: log.fan_speed ? log.fan_speed / 100 : null, // scale for chart
  }));

  // Build timeline events from logs + analysis
  const timelineEvents: any[] = [];

  // Add alarm events from logs
  (logs || [])
    .filter((l: any) => l.alarm_code)
    .slice(-5)
    .forEach((l: any) => {
      timelineEvents.push({
        time: new Date(l.timestamp).toLocaleString("zh-CN"),
        type: "alarm",
        title: `报警: ${l.alarm_code}`,
        detail: `温度${l.temperature}°C / 振动${l.vibration}mm/s`,
      });
    });

  // Add analysis event
  if (analysis) {
    timelineEvents.push({
      time: analysis.created_at ? new Date(analysis.created_at).toLocaleString("zh-CN") : "刚刚",
      type: "diagnosis",
      title: "AI 诊断完成",
      detail: analysis.diagnosis,
    });
  }

  // Sort by time
  timelineEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Risk level config
  const riskConfig: Record<string, { label: string; color: string }> = {
    normal: { label: "低风险", color: "#00ff88" },
    low: { label: "低风险", color: "#00ff88" },
    medium: { label: "中风险", color: "#ffaa00" },
    high: { label: "高风险", color: "#ff5500" },
    critical: { label: "严重", color: "#ff3366" },
  };

  const risk = riskConfig[analysis?.risk_level] || riskConfig.normal;

  return (
    <div className="space-y-4">
      {/* Health Overview */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <HealthGauge score={device.health_score} size={100} />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{device.name}</h3>
            <StatusBadge status={device.status} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Shield size={12} style={{ color: risk.color }} />
                <span className="text-gray-400">风险等级:</span>
                <span style={{ color: risk.color }} className="font-medium">{risk.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-yellow-400" />
                <span className="text-gray-400">故障概率:</span>
                <span className="font-medium text-white">{((analysis?.risk_probability || 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-cyan-400" />
                <span className="text-gray-400">RUL:</span>
                <span className="font-medium text-white">{analysis?.risk_level === "critical" ? "紧急" : analysis?.risk_level === "high" ? "~7天" : "~30天"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-purple-400" />
                <span className="text-gray-400">维护窗口:</span>
                <span className="font-medium text-white">{analysis?.risk_level === "critical" ? "立即" : "本周内"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-cyber-cyan mb-3">多维趋势图</h3>
        <TrendChart
          data={chartData}
          height={220}
          dualAxis
          lines={[
            { key: "温度", color: "#ff3366", name: "温度 (°C)" },
            { key: "振动", color: "#ffaa00", name: "振动 (mm/s)" },
            { key: "功耗", color: "#00ff88", name: "功耗 (×10W)", yAxisId: "right" },
            { key: "风扇", color: "#00f0ff", name: "风扇 (×100RPM)", yAxisId: "right" },
          ]}
        />
      </div>

      {/* Timeline */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-cyber-cyan mb-3">病历时间轴</h3>
        <div className="max-h-64 overflow-y-auto">
          <Timeline events={timelineEvents} />
        </div>
      </div>
    </div>
  );
}
