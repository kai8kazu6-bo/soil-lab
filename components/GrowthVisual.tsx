// 芽の成長ビジュアル。
// ポイントが増えるごとにステージが上がり、SVGの芽が伸び、背景の土の色が豊かになる。

export const GROWTH_THRESHOLDS = [0, 100, 500, 1000, 2000, 5000] as const;
export const GROWTH_LABELS = [
  "種",
  "発芽",
  "双葉",
  "若葉",
  "成長",
  "開花",
] as const;
export const GROWTH_DESCRIPTIONS = [
  "土と出会いはじめ",
  "最初の芽が出ました",
  "双葉がひらきました",
  "葉が増えてきました",
  "豊かに広がっています",
  "花が咲きました",
] as const;

// ステージごとの背景グラデーション（明るいクリームから深いアンバー寄りへ）
const STAGE_BG: Array<[string, string]> = [
  ["#FBFAF7", "#F5F2ED"],
  ["#F8F1E0", "#EAE3D7"],
  ["#F4E9D0", "#E0D2BA"],
  ["#EFDEBC", "#D0BFA5"],
  ["#E8D2A8", "#C4B091"],
  ["#DFC58F", "#B69E78"],
];

export function getGrowthStage(points: number): number {
  let s = 0;
  for (let i = 0; i < GROWTH_THRESHOLDS.length; i++) {
    if (points >= GROWTH_THRESHOLDS[i]) s = i;
  }
  return s;
}

export type NextStageInfo =
  | { isMax: true; progress: 1; remaining: 0; label: string }
  | { isMax: false; progress: number; remaining: number; label: string };

export function getNextStageInfo(points: number): NextStageInfo {
  const cur = getGrowthStage(points);
  const max = GROWTH_THRESHOLDS.length - 1;
  if (cur >= max) {
    return { isMax: true, progress: 1, remaining: 0, label: GROWTH_LABELS[cur] };
  }
  const start = GROWTH_THRESHOLDS[cur];
  const next = GROWTH_THRESHOLDS[cur + 1];
  const progress = Math.max(0, Math.min(1, (points - start) / (next - start)));
  return {
    isMax: false,
    progress,
    remaining: Math.max(0, next - points),
    label: GROWTH_LABELS[cur + 1],
  };
}

type Props = {
  points: number;
  size?: number;
  className?: string;
};

export default function GrowthVisual({ points, size = 116, className }: Props) {
  const stage = getGrowthStage(points);
  const [bgInner, bgOuter] = STAGE_BG[stage];

  // 茎の高さと先端y座標
  const stemHeights = [0, 8, 14, 24, 36, 50];
  const stemH = stemHeights[stage];
  const stemTop = 88 - stemH; // 88は土の表面

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`成長ステージ：${GROWTH_LABELS[stage]}`}
    >
      <defs>
        <radialGradient id={`gv-bg-${stage}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={bgInner} />
          <stop offset="100%" stopColor={bgOuter} />
        </radialGradient>
        <clipPath id="gv-clip">
          <circle cx="60" cy="60" r="56" />
        </clipPath>
      </defs>

      {/* 背景：ステージごとに豊かさが変化 */}
      <circle cx="60" cy="60" r="56" fill={`url(#gv-bg-${stage})`} />

      <g clipPath="url(#gv-clip)">
        {/* 土の層 */}
        <ellipse cx="60" cy="104" rx="52" ry="14" fill="#4E342E" />
        <ellipse cx="60" cy="96" rx="52" ry="10" fill="#6D4C45" />
        <ellipse cx="60" cy="92" rx="36" ry="2.5" fill="rgba(78,52,46,0.35)" />

        {/* ステージ0：種 */}
        {stage === 0 && (
          <g>
            <ellipse cx="60" cy="89" rx="3.5" ry="2.3" fill="#3F2A26" />
            <ellipse cx="60" cy="88.5" rx="2.2" ry="1.2" fill="#7A5A52" />
          </g>
        )}

        {/* 茎（ステージ1以上） */}
        {stage >= 1 && (
          <path
            d={`M60 88 Q57 ${88 - stemH * 0.55} 60 ${stemTop}`}
            stroke="#2D5A27"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* 双葉（ステージ1のみ：丸っこい子葉） */}
        {stage === 1 && (
          <g>
            <ellipse cx="55" cy={stemTop + 2} rx="5" ry="3.5" fill="#3D7A35" />
            <ellipse cx="65" cy={stemTop + 2} rx="5" ry="3.5" fill="#3D7A35" />
            <ellipse
              cx="55"
              cy={stemTop + 1}
              rx="2.4"
              ry="1.2"
              fill="rgba(255,255,255,0.18)"
            />
            <ellipse
              cx="65"
              cy={stemTop + 1}
              rx="2.4"
              ry="1.2"
              fill="rgba(255,255,255,0.18)"
            />
          </g>
        )}

        {/* 本葉ペア1（下段、ステージ2以上） */}
        {stage >= 2 && (
          <g>
            <ellipse
              cx="48"
              cy="78"
              rx="9.5"
              ry="4.2"
              fill="#3D7A35"
              transform="rotate(-22 48 78)"
            />
            <ellipse
              cx="72"
              cy="78"
              rx="9.5"
              ry="4.2"
              fill="#3D7A35"
              transform="rotate(22 72 78)"
            />
            <path
              d="M48 78 L40 73"
              stroke="#2D5A27"
              strokeWidth="0.7"
              opacity="0.6"
            />
            <path
              d="M72 78 L80 73"
              stroke="#2D5A27"
              strokeWidth="0.7"
              opacity="0.6"
            />
          </g>
        )}

        {/* 本葉ペア2（中段、ステージ3以上） */}
        {stage >= 3 && (
          <g>
            <ellipse
              cx="46"
              cy="64"
              rx="11"
              ry="5"
              fill="#2D5A27"
              transform="rotate(-25 46 64)"
            />
            <ellipse
              cx="74"
              cy="64"
              rx="11"
              ry="5"
              fill="#2D5A27"
              transform="rotate(25 74 64)"
            />
          </g>
        )}

        {/* 本葉ペア3（上段、ステージ4以上） */}
        {stage >= 4 && (
          <g>
            <ellipse
              cx="48"
              cy="50"
              rx="10"
              ry="4.5"
              fill="#3D7A35"
              transform="rotate(-30 48 50)"
            />
            <ellipse
              cx="72"
              cy="50"
              rx="10"
              ry="4.5"
              fill="#3D7A35"
              transform="rotate(30 72 50)"
            />
          </g>
        )}

        {/* 花（ステージ5：5枚花弁） */}
        {stage >= 5 && (
          <g transform={`translate(60 ${stemTop - 2})`}>
            {[0, 1, 2, 3, 4].map((i) => {
              const a = ((i * 72 - 90) * Math.PI) / 180;
              const cx = Math.cos(a) * 4.2;
              const cy = Math.sin(a) * 4.2;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="3.6"
                  fill="#FBFAF7"
                  stroke="#2D5A27"
                  strokeWidth="0.8"
                />
              );
            })}
            <circle r="2.4" fill="#C9962E" />
          </g>
        )}
      </g>

      {/* 周囲の柔らかいリング */}
      <circle
        cx="60"
        cy="60"
        r="56"
        fill="none"
        stroke="rgba(78,52,46,0.14)"
        strokeWidth="1"
      />
    </svg>
  );
}
