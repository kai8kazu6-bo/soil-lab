import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import GrowthVisual, {
  GROWTH_DESCRIPTIONS,
  GROWTH_LABELS,
  getGrowthStage,
  getNextStageInfo,
} from "./GrowthVisual";

type PointsCardProps = {
  points: number;
  weeklyDelta: number;
};

// カード自体の背景もステージに合わせて少しずつリッチに変化させる
const CARD_GRADIENT: string[] = [
  "linear-gradient(135deg, rgba(255,255,255,0.78), rgba(245,242,237,0.78))",
  "linear-gradient(135deg, rgba(252,247,236,0.82), rgba(238,228,210,0.82))",
  "linear-gradient(135deg, rgba(248,238,222,0.85), rgba(228,212,189,0.85))",
  "linear-gradient(135deg, rgba(244,231,208,0.88), rgba(218,200,172,0.88))",
  "linear-gradient(135deg, rgba(238,222,189,0.90), rgba(204,184,150,0.90))",
  "linear-gradient(135deg, rgba(228,209,170,0.92), rgba(186,162,128,0.92))",
];

export default function PointsCard({ points, weeklyDelta }: PointsCardProps) {
  const stage = getGrowthStage(points);
  const stageLabel = GROWTH_LABELS[stage];
  const stageDesc = GROWTH_DESCRIPTIONS[stage];
  const next = getNextStageInfo(points);

  return (
    <article
      className="card relative overflow-hidden p-5"
      style={{ background: CARD_GRADIENT[stage] }}
    >
      {/* 装飾の柔らかい円 */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-forest/8" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-brown/5" />

      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-brown-500">
          現在のポイント
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-beige-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-forest">
          <Sparkles size={11} />
          {stageLabel}
        </span>
      </div>

      {/* メイン：芽のビジュアル + ポイント数値 */}
      <div className="relative mt-3 flex items-center gap-4">
        <GrowthVisual points={points} size={108} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold leading-none text-brown">
              {points.toLocaleString()}
            </span>
            <span className="text-sm font-medium text-brown-500">pt</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
            <ArrowUpRight size={12} />
            今週 +{weeklyDelta}pt
          </div>
          <p className="mt-2 text-xs text-brown-500">{stageDesc}</p>
        </div>
      </div>

      {/* 次ステージへの進捗 */}
      <div className="relative mt-4">
        {next.isMax ? (
          <p className="text-xs font-medium text-forest">
            最高ステージに到達しました。土づくりの達人です 🌱
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-brown-500">
              <span>
                次は <span className="font-semibold text-brown">{next.label}</span> まで
              </span>
              <span className="tabular-nums">あと {next.remaining.toLocaleString()}pt</span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-beige-200"
              role="progressbar"
              aria-valuenow={Math.round(next.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-forest transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(next.progress * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="relative mt-5 flex gap-2">
        <Link
          href="/redeem"
          className="btn-primary inline-flex items-center justify-center"
        >
          ポイントを使う
        </Link>
        <button
          type="button"
          className="rounded-full border border-brown/20 bg-transparent px-4 py-2.5 text-sm font-medium text-brown hover:bg-brown/5 transition"
        >
          履歴を見る
        </button>
      </div>
    </article>
  );
}
