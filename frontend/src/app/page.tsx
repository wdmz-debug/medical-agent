"use client";

import { useEffect, useState } from "react";
import { Search, Activity, Server, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import DeviceCard from "@/components/DeviceCard";
import AgentPatrolBar from "@/components/AgentPatrolBar";
import { getDevices } from "@/lib/api";

export default function HomePage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDevices()
      .then(setDevices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const types = Array.from(new Set(devices.map((d) => d.device_type)));

  const filtered = devices.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.device_type.includes(search)) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (typeFilter !== "all" && d.device_type !== typeFilter) return false;
    return true;
  });

  const stats = {
    total: devices.length,
    normal: devices.filter((d) => d.status === "normal").length,
    warning: devices.filter((d) => d.status === "warning").length,
    critical: devices.filter((d) => d.status === "critical").length,
    avgScore: devices.length
      ? Math.round(devices.reduce((s, d) => s + d.health_score, 0) / devices.length)
      : 0,
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #00f0ff30, #aa55ff30)",
              border: "1px solid #00f0ff40",
            }}
          >
            <Activity size={20} className="text-cyber-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-cyber-cyan text-glow-cyan">
              设备病历本 Agent
            </h1>
            <p className="text-xs text-gray-500">
              AI驱动的设备预测性维护健康管理系统
            </p>
          </div>
        </div>
      </header>

      {/* Compact stats bar */}
      <div className="flex items-center gap-4 mb-4 px-4 py-2.5 rounded-lg" style={{ background: "rgba(17,24,39,0.6)", border: "1px solid rgba(0,240,255,0.08)" }}>
        <div className="flex items-center gap-1.5">
          <Server size={13} className="text-gray-500" />
          <span className="text-xs text-gray-400">设备</span>
          <span className="text-sm font-bold text-cyber-cyan">{stats.total}</span>
        </div>

        <span className="w-px h-4 bg-gray-700" />

        <div className="flex items-center gap-1.5">
          <CheckCircle size={13} className="text-green-400" />
          <span className="text-xs text-gray-400">健康</span>
          <span className="text-sm font-bold text-green-400">{stats.normal}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-yellow-400" />
          <span className="text-xs text-gray-400">关注</span>
          <span className="text-sm font-bold text-yellow-400">{stats.warning}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <XCircle size={13} className="text-red-400" />
          <span className="text-xs text-gray-400">高危</span>
          <span className="text-sm font-bold text-red-400">{stats.critical}</span>
        </div>

        <span className="w-px h-4 bg-gray-700" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">综合评分</span>
          <span
            className="text-sm font-bold"
            style={{
              color:
                stats.avgScore >= 80
                  ? "#00ff88"
                  : stats.avgScore >= 60
                  ? "#ffaa00"
                  : "#ff3366",
            }}
          >
            {stats.avgScore}
          </span>
        </div>
      </div>

      {/* Agent patrol status */}
      <AgentPatrolBar deviceCount={devices.length} />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="搜索设备名称或类型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-32"
        >
          <option value="all">全部状态</option>
          <option value="normal">正常</option>
          <option value="warning">警告</option>
          <option value="critical">故障</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-32"
        >
          <option value="all">全部类型</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Device Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <div className="spinner mx-auto mb-3" />
          加载中...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-500">
              未找到匹配的设备
            </div>
          )}
        </div>
      )}
    </div>
  );
}
