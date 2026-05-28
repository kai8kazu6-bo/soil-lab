import { Sprout, Shell, ArrowRight } from "lucide-react";
import type { Solution } from "@/lib/diagnose";

type Props = {
  solution: Solution;
};

export default function DiagnoseSolutionCard({ solution }: Props) {
  const isMoocal = solution.product === "moocal_700";
  // ブランドカラー：MOOCALはフォレストグリーン、貝粉末はブラウン基調
  const palette = isMoocal
    ? {
        bg: "linear-gradient(135deg, #2D5A27 0%, #1F3F1B 100%)",
        accentBg: "rgba(251, 250, 247, 0.18)",
        text: "#FBFAF7",
        sub: "rgba(251, 250, 247, 0.85)",
        chipBg: "#FBFAF7",
        chipText: "#1F3F1B",
      }
    : {
        bg: "linear-gradient(135deg, #6D4C45 0%, #3E211C 100%)",
        accentBg: "rgba(251, 250, 247, 0.18)",
        text: "#FBFAF7",
        sub: "rgba(251, 250, 247, 0.85)",
        chipBg: "#FBFAF7",
        chipText: "#3E211C",
      };

  return (
    <article
      className="relative overflow-hidden p-5"
      style={{
        background: palette.bg,
        borderRadius: "1.25rem",
        boxShadow: "0 10px 30px -12px rgba(78, 52, 46, 0.45)",
      }}
    >
      {/* 装飾 */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
        style={{ background: palette.accentBg }}
      />

      <div className="relative flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: palette.accentBg, color: palette.text }}
        >
          {isMoocal ? <Sprout size={20} /> : <Shell size={20} />}
        </span>
        <div className="min-w-0">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider"
            style={{ background: palette.chipBg, color: palette.chipText }}
          >
            {solution.productLabel}
          </span>
          <h3
            className="mt-1.5 text-base font-semibold leading-snug"
            style={{ color: palette.text }}
          >
            {solution.title}
          </h3>
        </div>
      </div>

      <p
        className="relative mt-3 text-xs leading-relaxed"
        style={{ color: palette.sub }}
      >
        {solution.description}
      </p>

      <div className="relative mt-4 flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition hover:opacity-90"
          style={{ background: palette.chipBg, color: palette.chipText }}
        >
          詳しく相談する
          <ArrowRight size={12} />
        </button>
        <p className="text-[11px]" style={{ color: palette.sub }}>
          担当スタッフがご案内します
        </p>
      </div>
    </article>
  );
}
