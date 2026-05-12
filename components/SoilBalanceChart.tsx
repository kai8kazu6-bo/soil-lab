// 土壌バランスを「円形（レーダー）チャート」で可視化。
// 理想は均等な六角形＝中心からの距離が全軸で同じ。
// 現在の形が理想に近いほど、対称的でなめらかな多角形になる。

import type { BalanceAxis } from "@/lib/balance";

type Props = {
  axes: BalanceAxis[];
  /** 凡例表示などに使うID（同一ページ複数描画時のSVG ID衝突回避用） */
  uid?: string;
  /** チャートの一辺サイズ */
  size?: number;
  /** 強調する軸（最も不足しているもの等） */
  highlightKey?: string | null;
};

const GRID_RATIOS = [0.25, 0.5, 0.75, 1];

export default function SoilBalanceChart({
  axes,
  uid = "balance",
  size = 240,
  highlightKey = null,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.34;
  const N = axes.length;

  function pt(i: number, ratio: number): [number, number] {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    return [cx + Math.cos(a) * R * ratio, cy + Math.sin(a) * R * ratio];
  }

  function poly(getRatio: (i: number) => number): string {
    return axes.map((_, i) => pt(i, getRatio(i)).join(",")).join(" ");
  }

  const idealPoints = poly((i) => axes[i].ideal);
  const currentPoints = poly((i) => axes[i].value);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height={size}
      role="img"
      aria-label="土壌バランス円形チャート"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FBFAF7" />
          <stop offset="100%" stopColor="#F0EBE0" />
        </radialGradient>
        <linearGradient id={`${uid}-current`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3D7A35" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2D5A27" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* 背景の薄い円 */}
      <circle cx={cx} cy={cy} r={R + 6} fill={`url(#${uid}-bg)`} />

      {/* グリッド：4段の同心多角形 */}
      {GRID_RATIOS.map((g) => (
        <polygon
          key={g}
          points={poly(() => g)}
          fill="none"
          stroke="#EAE3D7"
          strokeWidth="1"
        />
      ))}

      {/* 軸線 */}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#EAE3D7"
            strokeWidth="1"
          />
        );
      })}

      {/* 理想の形（破線の正多角形） */}
      <polygon
        points={idealPoints}
        fill="none"
        stroke="#2D5A27"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />

      {/* 現在の形（塗りあり） */}
      <polygon
        points={currentPoints}
        fill={`url(#${uid}-current)`}
        stroke="#2D5A27"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 各軸の頂点 */}
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.value);
        const isHi = highlightKey && a.key === highlightKey;
        return (
          <g key={a.key}>
            {isHi && (
              <circle
                cx={x}
                cy={y}
                r="7"
                fill="#C9962E"
                fillOpacity="0.18"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={isHi ? 4 : 3}
              fill={isHi ? "#C9962E" : "#2D5A27"}
              stroke="#FBFAF7"
              strokeWidth="1.5"
            />
          </g>
        );
      })}

      {/* 軸ラベル */}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1.22);
        const isHi = highlightKey && a.key === highlightKey;
        return (
          <g key={`label-${a.key}`}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight={isHi ? 700 : 600}
              fill={isHi ? "#8A5A1A" : "#4E342E"}
            >
              {a.label}
            </text>
            {a.display && (
              <text
                x={x}
                y={y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="#6D4C45"
              >
                {a.display}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
