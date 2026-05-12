import {
  Sprout,
  FileText,
  Users,
  Gift,
  Coins,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  POINT_CATEGORY_LABEL,
  type PointCategory,
  type PointHistoryRow,
} from "@/lib/supabase/types";

type Props = {
  history: PointHistoryRow[];
};

const CATEGORY_ICON: Record<PointCategory, LucideIcon> = {
  lab_attendance: Sprout,
  report_post: FileText,
  community: Users,
  bonus: Gift,
  redeem: Coins,
  other: Coins,
};

function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 60) return `${Math.max(1, m)}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  return new Date(isoDate).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export default function PointHistoryList({ history }: Props) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-brown-500">
          ポイント履歴
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-forest hover:underline"
        >
          すべて見る
          <ChevronRight size={14} />
        </button>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-brown-500">
          まだポイント履歴がありません。ラボに参加して最初のポイントを獲得しましょう。
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-beige-200">
          {history.slice(0, 6).map((row) => {
            const Icon = CATEGORY_ICON[row.category];
            const isPositive = row.amount >= 0;
            return (
              <li
                key={row.id}
                className="flex items-center justify-between py-3 first:pt-2 last:pb-1"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-full " +
                      (isPositive
                        ? "bg-forest/10 text-forest"
                        : "bg-brown/10 text-brown")
                    }
                  >
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-brown">
                      {row.reason}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-brown-500">
                      <span>{POINT_CATEGORY_LABEL[row.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelative(row.created_at)}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={
                    "text-sm font-semibold tabular-nums " +
                    (isPositive ? "text-forest" : "text-brown")
                  }
                >
                  {isPositive ? "+" : ""}
                  {row.amount.toLocaleString()}pt
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
