import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "soilラボ｜土壌分析コミュニティ",
  description:
    "土と向き合うすべての人へ。土壌分析でつながる、学べるコミュニティアプリ「soilラボ」",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-beige font-sans text-brown">
        {/* モバイルファースト：中央寄せの最大幅コンテナ */}
        <div className="relative mx-auto min-h-screen max-w-md bg-beige pb-24">
          {children}
        </div>
      </body>
    </html>
  );
}
