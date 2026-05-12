import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

type Trend = "up" | "down" | "stable";

type TrendItem = {
  label: string;
  value: string;
  trend: Trend;
  note: string;
};

type TrendsCardProps = {
  trends: TrendItem[];
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up")
    return <TrendingUp size={14} className="text-forest" />;
  if (trend === "down")
    return <TrendingDown size={14} className="text-brown" />;
  return <Minus size={14} className="text-brown-500" />;
}

export default function TrendsCard({ trends }: TrendsCardProps) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-brown-500">
          最新の分析トレンド
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-forest hover:underline"
        >
          すべて見る
          <ChevronRight size={14} />
        </button>
      </div>

      <ul className="mt-3 divide-y divide-beige-200">
        {trends.map((t) => (
          <li
            key={t.label}
            className="flex items-center justify-between py-3 first:pt-2 last:pb-1"
          >
            <div>
              <p className="text-sm font-medium text-brown">{t.label}</p>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-brown-500">
                <TrendIcon trend={t.trend} />
                <span>{t.note}</span>
              </div>
            </div>
            <span
              className={
                "text-base font-semibold tabular-nums " +
                (t.trend === "up"
                  ? "text-forest"
                  : t.trend === "down"
                    ? "text-brown"
                    : "text-brown-700")
              }
            >
              {t.value}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
