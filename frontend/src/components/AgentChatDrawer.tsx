"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatDrawerProps {
  deviceId: number;
  deviceName: string;
  deviceStatus: string;
  healthScore: number;
}

export default function AgentChatDrawer({ deviceId, deviceName, deviceStatus, healthScore }: AgentChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(deviceId, text, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，请求失败，请检查网络连接或后端服务状态。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const statusColor =
    deviceStatus === "critical" ? "#ff3366" : deviceStatus === "warning" ? "#ffaa00" : "#00ff88";

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, rgba(0,240,255,0.25), rgba(170,85,255,0.25))",
            border: "1px solid rgba(0,240,255,0.4)",
            boxShadow: "0 0 20px rgba(0,240,255,0.2), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <MessageSquare size={22} className="text-cyan-400" />
        </button>
      )}

      {/* Drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="relative w-full max-w-md h-full flex flex-col"
            style={{
              background: "rgba(10,10,14,0.97)",
              borderLeft: "1px solid #3f3f46",
              animation: "drawerSlideIn 0.25s ease-out forwards",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid #3f3f46" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(170,85,255,0.15))",
                    border: "1px solid rgba(0,240,255,0.25)",
                  }}
                >
                  <Bot size={15} className="text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">设备诊断助手</div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                    <span>{deviceName}</span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: statusColor }}
                    />
                    <span style={{ color: statusColor }}>
                      {healthScore}分
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                style={{ border: "1px solid #3f3f46" }}
              >
                <X size={15} className="text-zinc-400" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                  <Bot size={36} className="mb-3 opacity-30" />
                  <p className="text-sm mb-1">向 Agent 提问</p>
                  <p className="text-[11px] text-center leading-relaxed">
                    基于设备 <span className="text-zinc-400">{deviceName}</span> 的实时状态和诊断数据，
                    为你提供专业的分析建议
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  style={{ animation: "fadeSlideIn 0.3s ease-out forwards" }}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "rgba(170,85,255,0.15)", border: "1px solid rgba(170,85,255,0.25)" }}
                    >
                      <Bot size={12} className="text-purple-400" />
                    </div>
                  )}

                  <div
                    className="max-w-[85%] rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                    style={
                      msg.role === "user"
                        ? {
                            background: "rgba(0,240,255,0.1)",
                            border: "1px solid rgba(0,240,255,0.2)",
                            color: "#e2e8f0",
                          }
                        : {
                            background: "rgba(24,24,27,0.8)",
                            border: "1px solid #3f3f46",
                            color: "#a1a1aa",
                          }
                    }
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

                  {msg.role === "user" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "rgba(0,240,255,0.15)", border: "1px solid rgba(0,240,255,0.25)" }}
                    >
                      <User size={12} className="text-cyan-400" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 justify-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: "rgba(170,85,255,0.15)", border: "1px solid rgba(170,85,255,0.25)" }}
                  >
                    <Bot size={12} className="text-purple-400" />
                  </div>
                  <div
                    className="rounded-lg px-3 py-2.5 text-xs flex items-center gap-2"
                    style={{ background: "rgba(24,24,27,0.8)", border: "1px solid #3f3f46" }}
                  >
                    <Loader2 size={12} className="text-purple-400 animate-spin" />
                    <span className="text-zinc-400">分析中...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              className="px-4 py-3 shrink-0"
              style={{ borderTop: "1px solid #3f3f46", background: "rgba(15,15,20,0.8)" }}
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="询问设备状态、故障原因..."
                  disabled={loading}
                  className="flex-1 text-xs"
                  style={{
                    background: "rgba(24,24,27,0.8)",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#e2e8f0",
                    outline: "none",
                    opacity: loading ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0"
                  style={{
                    background:
                      input.trim() && !loading
                        ? "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(170,85,255,0.2))"
                        : "rgba(24,24,27,0.5)",
                    border:
                      input.trim() && !loading
                        ? "1px solid rgba(0,240,255,0.3)"
                        : "1px solid #3f3f46",
                    cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                    opacity: input.trim() && !loading ? 1 : 0.4,
                  }}
                >
                  {loading ? (
                    <Loader2 size={14} className="text-zinc-400 animate-spin" />
                  ) : (
                    <Send size={14} className={input.trim() ? "text-cyan-400" : "text-zinc-400"} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes drawerSlideIn {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
