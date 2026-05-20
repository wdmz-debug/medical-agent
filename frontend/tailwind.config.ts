import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0a0e1a",
          card: "#111827",
          border: "#1e3a5f",
          cyan: "#00f0ff",
          green: "#00ff88",
          red: "#ff3366",
          yellow: "#ffaa00",
          purple: "#aa55ff",
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "agent-breathe": "agent-breathe 3s ease-in-out infinite",
        "critical-glow": "critical-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,240,255,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0,240,255,0.6)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "agent-breathe": {
          "0%, 100%": { opacity: "0.6", boxShadow: "0 0 4px rgba(0,255,136,0.3)" },
          "50%": { opacity: "1", boxShadow: "0 0 12px rgba(0,255,136,0.6)" },
        },
        "critical-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(255,51,102,0.3), inset 0 0 8px rgba(255,51,102,0.05)" },
          "50%": { boxShadow: "0 0 20px rgba(255,51,102,0.5), inset 0 0 12px rgba(255,51,102,0.1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
