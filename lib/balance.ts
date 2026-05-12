// 土壌バランス（理想の六角形）データの取得とユーティリティ。
// 実データ連携時は最新の reports/解析結果を集計するロジックに差し替え可能。

export type BalanceAxis = {
  /** 内部キー */
  key: string;
  /** 表示ラベル */
  label: string;
  /** 現在値 0..1（1 = 上限） */
  value: number;
  /** 理想値 0..1（基本は同じ値で正六角形を作る） */
  ideal: number;
  /** ホバー/凡例用の単位（例 "pH 6.4"） */
  display?: string;
};

const MOCK_AXES: BalanceAxis[] = [
  { key: "ph", label: "pH",       value: 0.85, ideal: 0.8, display: "6.4" },
  { key: "n",  label: "窒素",      value: 0.72, ideal: 0.8, display: "中" },
  { key: "p",  label: "リン",      value: 0.55, ideal: 0.8, display: "やや低" },
  { key: "k",  label: "カリウム",   value: 0.78, ideal: 0.8, display: "適正" },
  { key: "om", label: "有機物",    value: 0.88, ideal: 0.8, display: "高" },
  { key: "mb", label: "微生物",    value: 0.65, ideal: 0.8, display: "改善余地" },
];

export async function getLatestBalance(): Promise<BalanceAxis[]> {
  // TODO: 認証ユーザーの最新レポート（PDF/画像 + 解析結果）から集計
  return MOCK_AXES;
}

/** 理想からの平均偏差を 0..100 のスコアに変換 */
export function balanceScore(axes: BalanceAxis[]): number {
  if (axes.length === 0) return 0;
  const dev =
    axes.reduce((s, a) => s + Math.abs(a.value - a.ideal), 0) / axes.length;
  return Math.round(Math.max(0, Math.min(1, 1 - dev)) * 100);
}

/** 一番不足している軸からヒントを生成 */
export function pickHint(axes: BalanceAxis[]): {
  message: string;
  worst: BalanceAxis | null;
} {
  if (axes.length === 0) return { message: "データがまだありません。", worst: null };

  let worst = axes[0];
  let worstDelta = axes[0].value - axes[0].ideal;
  for (const a of axes) {
    const d = a.value - a.ideal;
    if (d < worstDelta) {
      worst = a;
      worstDelta = d;
    }
  }

  if (worstDelta >= -0.05) {
    return {
      message: "理想のバランスにとても近づいています。今の手入れを続けていきましょう。",
      worst: null,
    };
  }
  return {
    message: `${worst.label}を少し補ってみましょう。バランスがさらに整います。`,
    worst,
  };
}
