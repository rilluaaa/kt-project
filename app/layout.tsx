import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "墨脈葵青｜一滴墨，流過山城與海港",
  description: "跟隨一滴有記憶的墨，由山脊走過屋邨、工業區、海港與青衣，重新遇見葵青的人與非物質文化遺產。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
