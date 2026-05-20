"use client";

import { useState } from "react";
import {
  Upload, FileText, Plus, ClipboardList, Wrench, MessageSquare, Loader2,
} from "lucide-react";
import { uploadDocument, createLog } from "@/lib/api";

interface LeftPanelProps {
  device: any;
  onRefresh: () => void;
}

export default function LeftPanel({ device, onRefresh }: LeftPanelProps) {
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("manual");
  const [docContent, setDocContent] = useState("");
  const [logData, setLogData] = useState({ temperature: "", vibration: "", power_consumption: "", fan_speed: "", load: "" });
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleDocSubmit = async () => {
    if (!docContent.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("doc_name", docName || `文档_${Date.now()}`);
      formData.append("doc_type", docType);
      formData.append("content", docContent);
      await uploadDocument(device.id, formData);
      setMsg("文档上传成功");
      setDocContent("");
      setDocName("");
      onRefresh();
    } catch (e: any) {
      setMsg(`上传失败: ${e.message}`);
    }
    setUploading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_name", file.name);
      formData.append("doc_type", docType);
      await uploadDocument(device.id, formData);
      setMsg(`文件 ${file.name} 上传成功`);
      onRefresh();
    } catch (err: any) {
      setMsg(`上传失败: ${err.message}`);
    }
    setUploading(false);
  };

  const handleLogSubmit = async () => {
    const data: any = {};
    if (logData.temperature) data.temperature = parseFloat(logData.temperature);
    if (logData.vibration) data.vibration = parseFloat(logData.vibration);
    if (logData.power_consumption) data.power_consumption = parseFloat(logData.power_consumption);
    if (logData.fan_speed) data.fan_speed = parseFloat(logData.fan_speed);
    if (logData.load) data.load = parseFloat(logData.load);
    if (Object.keys(data).length === 0) return;

    try {
      await createLog(device.id, data);
      setMsg("日志录入成功");
      setLogData({ temperature: "", vibration: "", power_consumption: "", fan_speed: "", load: "" });
      onRefresh();
    } catch (e: any) {
      setMsg(`录入失败: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Device Info */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
          <ClipboardList size={14} /> 设备基础信息
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-gray-400">名称</span><span className="font-medium">{device.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">类型</span><span>{device.device_type}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">位置</span><span>{device.location}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">厂商</span><span>{device.meta_info?.manufacturer || "-"}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">型号</span><span>{device.meta_info?.model || "-"}</span></div>
          <p className="text-gray-400 mt-2 leading-relaxed">{device.description}</p>
        </div>
      </div>

      {/* Upload RAG Document */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
          <FileText size={14} /> 上传 RAG 资料
        </h3>
        <div className="space-y-2">
          <input
            placeholder="文档名称"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="w-full"
          />
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full">
            <option value="manual">维修手册</option>
            <option value="sop">SOP文档</option>
            <option value="fault_case">故障案例</option>
            <option value="repair_log">维修记录</option>
          </select>
          <textarea
            placeholder="粘贴文档内容..."
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            rows={4}
            className="w-full resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleDocSubmit} disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              提交文档
            </button>
            <label className="btn-primary flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Upload size={14} />
              上传文件
              <input type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Manual Log Input */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
          <Plus size={14} /> 手动录入监控日志
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="温度 °C" value={logData.temperature} onChange={(e) => setLogData({ ...logData, temperature: e.target.value })} />
          <input placeholder="振动 mm/s" value={logData.vibration} onChange={(e) => setLogData({ ...logData, vibration: e.target.value })} />
          <input placeholder="功耗 W" value={logData.power_consumption} onChange={(e) => setLogData({ ...logData, power_consumption: e.target.value })} />
          <input placeholder="风扇 RPM" value={logData.fan_speed} onChange={(e) => setLogData({ ...logData, fan_speed: e.target.value })} />
          <input placeholder="负载 %" value={logData.load} onChange={(e) => setLogData({ ...logData, load: e.target.value })} className="col-span-2" />
        </div>
        <button onClick={handleLogSubmit} className="btn-primary w-full mt-2 flex items-center justify-center gap-1.5">
          <Plus size={14} /> 录入日志
        </button>
      </div>

      {/* Maintenance Record */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
          <Wrench size={14} /> 维修记录 & 运行备注
        </h3>
        <textarea placeholder="记录维修操作或运行备注..." rows={3} className="w-full resize-none" />
        <button className="btn-primary w-full mt-2 flex items-center justify-center gap-1.5">
          <MessageSquare size={14} /> 保存记录
        </button>
      </div>

      {msg && (
        <div className="text-xs text-center py-2 px-3 rounded-lg bg-cyber-cyan/10 text-cyber-cyan animate-fade-in">
          {msg}
        </div>
      )}
    </div>
  );
}
