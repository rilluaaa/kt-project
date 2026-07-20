import type { Metadata } from "next";
import "./globals.css";
import "./video.css";

export const metadata: Metadata = {
  title: "熱熾葵青｜一滴墨，穿過山城與燈火",
  description: "以滾輪導演鏡頭，跟隨墨色由山城進入葵涌街巷，在綠霧與暖燈之間遇見葵青。",
};

export const dynamic = "force-static";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
