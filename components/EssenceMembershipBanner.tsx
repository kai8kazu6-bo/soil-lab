import { Sparkles, ArrowUpRight } from "lucide-react";

type Props = {
  /** ロック中のEssenceレポートが何件あるか */
  lockedCount?: number;
};

export default function EssenceMembershipBanner({ lockedCount = 0 }: Props) {
  return (
    <article
      className="relative overflow-hidden p-5"
      style={{
        background: "linear-gradient(135deg, #2D5A27 0%, #1F3F1B 100%)",
        borderRadius: "1.25rem",
        boxShadow: "0 10px 30px -12px rgba(45, 90, 39, 0.45)",
      }}
    >
      {/* 装飾 */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-beige-50/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-beige-50/5" />

      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beige-50/15 text-beige-50">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wider text-beige-100/80">
            SOIL ESSENCE
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-beige-50">
            特別分析レポートで、土をさらに深く読む。
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-beige-100/85">
            微生物多様性のDNA解析、年次変動、土壌タイプ別の推奨アクションなど、
            Soil Essence 契約者だけの特別分析レポートをお届けします。
          </p>
        </div>
      </div>

      {lockedCount > 0 && (
        <p className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-beige-50/15 px-2.5 py-1 text-[11px] font-medium text-beige-50">
          <Sparkles size={11} />
          現在 {lockedCount} 件の特別レポートが届いています
        </p>
      )}

      <div className="relative mt-4 flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-beige-50 px-4 py-2 text-xs font-semibold text-forest hover:bg-beige-100 transition"
        >
          Soil Essence について
          <ArrowUpRight size={12} />
        </button>
        <p className="text-[11px] text-beige-100/70">
          ご契約は担当スタッフまで
        </p>
      </div>
    </article>
  );
}
