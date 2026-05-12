import { Sparkles } from "lucide-react";
import type { ReportTier } from "@/lib/supabase/types";

type Props = {
  tier: ReportTier;
  /** ロック状態（閲覧不可なEssenceレポート）として表示するか */
  locked?: boolean;
};

export default function ReportTierBadge({ tier, locked = false }: Props) {
  if (tier === "essence") {
    return (
      <span
        className={
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide " +
          (locked
            ? "bg-brown/10 text-brown"
            : "bg-forest text-beige-50")
        }
      >
        <Sparkles size={10} />
        Soil Essence
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-beige-200/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brown">
      Basic
    </span>
  );
}
