import { Lightbulb, Target } from "lucide-react";
import SoilBalanceChart from "./SoilBalanceChart";
import { balanceScore, pickHint, type BalanceAxis } from "@/lib/balance";

type Props = {
  axes: BalanceAxis[];
};

export default function SoilBalanceCard({ axes }: Props) {
  const score = balanceScore(axes);
  const { message, worst } = pickHint(axes);

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-brown-500">
            土壌バランス
          </p>
          <h2 className="mt-1 text-base font-semibold text-brown">
            理想の六角形に近づけよう
          </h2>
          <p className="mt-0.5 text-xs text-brown-500">
            破線が理想の形、内側の塗りが現在の状態です
          </p>
        </div>

        <div className="flex flex-col items-end">
          <div className="rounded-organic bg-forest/10 px-3 py-1.5 text-right">
            <p className="text-[10px] font-medium tracking-wide text-forest">
              バランス
            </p>
            <p className="text-2xl font-bold leading-none text-forest tabular-nums">
              {score}
              <span className="ml-0.5 text-xs font-medium">点</span>
            </p>
          </div>
        </div>
      </div>

      {/* レーダーチャート */}
      <div className="mt-3 flex items-center justify-center">
        <div className="w-full max-w-[280px]">
          <SoilBalanceChart
            axes={axes}
            uid="dashboard-balance"
            highlightKey={worst?.key ?? null}
            size={240}
          />
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-brown-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="block h-0.5 w-4 border-t border-dashed border-forest" />
          理想
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-sm bg-forest/40 ring-1 ring-forest" />
          現在
        </span>
      </div>

      {/* 一言ヒント */}
      <div className="mt-4 flex items-start gap-2 rounded-organic bg-beige-50/80 px-3 py-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/15 text-forest">
          {worst ? <Lightbulb size={13} /> : <Target size={13} />}
        </span>
        <p className="text-xs leading-relaxed text-brown">{message}</p>
      </div>
    </article>
  );
}
