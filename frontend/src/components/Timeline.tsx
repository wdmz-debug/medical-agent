"use client";

import { AlertTriangle, Wrench, FileText, Brain, Clock } from "lucide-react";

interface TimelineEvent {
  time: string;
  type: "alarm" | "maintenance" | "document" | "diagnosis" | "note";
  title: string;
  detail?: string;
}

const ICON_MAP = {
  alarm: { icon: AlertTriangle, color: "#ff3366" },
  maintenance: { icon: Wrench, color: "#ffaa00" },
  document: { icon: FileText, color: "#00f0ff" },
  diagnosis: { icon: Brain, color: "#aa55ff" },
  note: { icon: Clock, color: "#64748b" },
};

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <div className="text-gray-500 text-sm py-4 text-center">暂无事件记录</div>;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-cyber-cyan/30 via-cyber-cyan/10 to-transparent" />
      {events.map((event, i) => {
        const config = ICON_MAP[event.type] || ICON_MAP.note;
        const Icon = config.icon;
        return (
          <div key={i} className="relative mb-4 last:mb-0 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div
              className="absolute -left-4 top-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: `${config.color}20`, border: `1px solid ${config.color}40` }}
            >
              <Icon size={10} color={config.color} />
            </div>
            <div className="ml-2">
              <div className="text-xs text-gray-500">{event.time}</div>
              <div className="text-sm font-medium" style={{ color: config.color }}>
                {event.title}
              </div>
              {event.detail && (
                <div className="text-xs text-gray-400 mt-0.5">{event.detail}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
