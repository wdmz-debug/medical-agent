import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "设备病历本 Agent",
  description: "AI驱动的设备预测性维护健康管理系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen grid-bg">
        {children}
      </body>
    </html>
  );
}
