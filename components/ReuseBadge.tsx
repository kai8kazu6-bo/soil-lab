// リユース宣言済みバッジ。
// 葉っぱ＋リサイクル循環を一つのSVGで表現し、緑のピル形ラベルとして表示する。

type Size = "xs" | "sm" | "md";

const SIZE_MAP: Record<Size, { px: number; iconScale: number }> = {
  xs: { px: 14, iconScale: 1.0 },
  sm: { px: 16, iconScale: 1.0 },
  md: { px: 20, iconScale: 1.05 },
};

type Props = {
  size?: Size;
  /** ラベル "Reuse" を一緒に表示するか */
  showLabel?: boolean;
  className?: string;
};

export default function ReuseBadge({
  size = "sm",
  showLabel = false,
  className = "",
}: Props) {
  const { px } = SIZE_MAP[size];

  return (
    <span
      role="img"
      aria-label="リユース宣言済み"
      title="リユース宣言済み"
      className={
        "inline-flex shrink-0 items-center gap-1 " +
        (showLabel
          ? "rounded-full bg-forest/10 pl-0.5 pr-2 py-0.5 text-[10px] font-semibold text-forest "
          : "") +
        className
      }
    >
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        aria-hidden="true"
      >
        {/* 緑のディスク背景 */}
        <circle cx="12" cy="12" r="11" fill="#2D5A27" />
        {/* リサイクルを示す薄い破線リング */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="#C7DBC1"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        {/* 葉っぱ本体（左下→右上の伸び） */}
        <path
          d="M7.2 16.8 C6.6 11 11 6.6 17 6.4 C17.2 12.4 12.6 17 6.8 17.2 C6.6 17 7.2 16.8 7.2 16.8 Z"
          fill="#C7DBC1"
        />
        {/* 葉脈 */}
        <path
          d="M7.5 16.5 L16.2 7.8"
          stroke="#FBFAF7"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
        />
        {/* リサイクル矢印の先端：循環の示唆 */}
        <path
          d="M16 5 L18 4.5 L17.6 6.6"
          stroke="#FBFAF7"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showLabel && <span>Reuse</span>}
    </span>
  );
}
