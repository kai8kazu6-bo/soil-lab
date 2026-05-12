// 土壌分析の指標と「土壌回復ボーナス」計算ロジック。
// 前回の分析値と比較して、各指標が「理想値」に近づいた場合にポイントを付与する。

export type AnalysisKey =
  | "ph"
  | "cec"
  | "humus_pct"
  | "nitrogen_mg"
  | "phosphorus_mg"
  | "potassium_mg"
  | "microbial_score";

export type AnalysisMetrics = {
  [K in AnalysisKey]: number | null;
};

/** 各指標の「理想値」。回復ボーナスはこの値への接近を基準に判定する */
export const METRIC_IDEAL: Record<AnalysisKey, number> = {
  ph: 6.5,            // 弱酸性〜中性
  cec: 25,            // meq/100g （高いほど保肥力◎）
  humus_pct: 6,       // 腐植率 %
  nitrogen_mg: 20,    // mg/100g
  phosphorus_mg: 10,
  potassium_mg: 20,
  microbial_score: 80,
};

export const METRIC_LABEL: Record<AnalysisKey, string> = {
  ph: "pH",
  cec: "CEC",
  humus_pct: "腐植",
  nitrogen_mg: "窒素",
  phosphorus_mg: "リン",
  potassium_mg: "カリウム",
  microbial_score: "微生物",
};

export const METRIC_UNIT: Record<AnalysisKey, string> = {
  ph: "",
  cec: "meq",
  humus_pct: "%",
  nitrogen_mg: "mg",
  phosphorus_mg: "mg",
  potassium_mg: "mg",
  microbial_score: "",
};

export const METRIC_STEP: Record<AnalysisKey, number> = {
  ph: 0.1,
  cec: 0.1,
  humus_pct: 0.1,
  nitrogen_mg: 0.1,
  phosphorus_mg: 0.1,
  potassium_mg: 0.1,
  microbial_score: 1,
};

export const ANALYSIS_KEYS: AnalysisKey[] = [
  "ph",
  "cec",
  "humus_pct",
  "nitrogen_mg",
  "phosphorus_mg",
  "potassium_mg",
  "microbial_score",
];

/** 指標ごとのボーナス上限・全体上限。改善幅に応じて 0〜PER_METRIC_BONUS ポイント */
export const PER_METRIC_BONUS = 30;
export const MAX_RECOVERY_BONUS = 300;

export type Improvement = {
  key: AnalysisKey;
  label: string;
  prev: number;
  next: number;
  ideal: number;
  /** 0..1：理想までの距離が縮まった割合 */
  ratio: number;
  bonus: number;
};

/**
 * 前回値と今回値を比較し、各指標について理想値に近づいたものを抽出。
 * 改善割合に応じて1指標あたり 0〜PER_METRIC_BONUS pt のボーナスを計算する。
 */
export function computeRecoveryBonus(
  prev: Partial<AnalysisMetrics>,
  next: Partial<AnalysisMetrics>
): { improvements: Improvement[]; totalBonus: number } {
  const improvements: Improvement[] = [];

  for (const key of ANALYSIS_KEYS) {
    const p = prev[key];
    const n = next[key];
    if (p == null || n == null) continue;

    const ideal = METRIC_IDEAL[key];
    const prevDist = Math.abs(p - ideal);
    const nextDist = Math.abs(n - ideal);
    if (nextDist >= prevDist) continue; // 改善なし

    // 理想までの距離がどれだけ縮まったか (0..1)
    const ratio = (prevDist - nextDist) / Math.max(prevDist, 0.0001);
    const clampedRatio = Math.min(1, Math.max(0, ratio));
    const bonus = Math.round(PER_METRIC_BONUS * clampedRatio);
    if (bonus <= 0) continue;

    improvements.push({
      key,
      label: METRIC_LABEL[key],
      prev: p,
      next: n,
      ideal,
      ratio: clampedRatio,
      bonus,
    });
  }

  let totalBonus = improvements.reduce((s, i) => s + i.bonus, 0);

  // 全体上限に達した場合は比例配分でクリップ
  if (totalBonus > MAX_RECOVERY_BONUS) {
    const factor = MAX_RECOVERY_BONUS / totalBonus;
    for (const imp of improvements) {
      imp.bonus = Math.round(imp.bonus * factor);
    }
    totalBonus = improvements.reduce((s, i) => s + i.bonus, 0);
  }

  return { improvements, totalBonus };
}
