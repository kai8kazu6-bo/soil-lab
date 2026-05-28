// 堆肥・スラリー診断ロジックとテキスト。
// Client/Server 両方から安全に import できる（純粋関数 + 定数のみ）。

export type ResourceType = "solid" | "liquid";
export type Status = "ideal" | "warn" | "danger";

export type SolidInput = {
  cn_ratio: number | null;
  moisture: number | null;
  ec: number | null;
  ph: number | null;
  ammonia: number | null;
};

export type LiquidInput = {
  ec: number | null;
  ammonia_ratio: number | null;
  ph: number | null;
  moisture: number | null;
};

export type DiagnoseRow = {
  /** 指標キー（例: "cn_ratio"） */
  metric: string;
  label: string;
  unit: string;
  value: number;
  status: Status;
  statusLabel: string; // 例: "理想（完熟）"
  message: string;
};

export type Solution = {
  id: string;
  product: "moocal_700" | "soil_kaiko_1";
  productLabel: string;
  title: string;
  description: string;
};

export type GaugeZone = { from: number; to: number; status: Status };

export type MetricMeta = {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  zones: GaugeZone[];
};

// =============================================================
//  カラーパレット（ステータス別）
// =============================================================
export const STATUS_STYLE: Record<
  Status,
  {
    bg: string;
    border: string;
    text: string;
    pillBg: string;
    pillText: string;
  }
> = {
  ideal: {
    bg: "rgba(45,90,39,0.08)",
    border: "rgba(45,90,39,0.55)",
    text: "#1F3F1B",
    pillBg: "#2D5A27",
    pillText: "#FBFAF7",
  },
  warn: {
    bg: "#FFF1D5",
    border: "#C9962E",
    text: "#7E5916",
    pillBg: "#C9962E",
    pillText: "#FBFAF7",
  },
  danger: {
    bg: "#F6DCD4",
    border: "#A8493C",
    text: "#7B2E25",
    pillBg: "#A8493C",
    pillText: "#FBFAF7",
  },
};

// =============================================================
//  入力メタ情報（ゲージ表示用の min/max/zones も含む）
// =============================================================
export const SOLID_METRICS: MetricMeta[] = [
  {
    key: "cn_ratio",
    label: "C/N比",
    unit: "",
    min: 5,
    max: 35,
    step: 0.1,
    zones: [
      { from: 5, to: 15, status: "warn" },
      { from: 15, to: 22, status: "ideal" },
      { from: 22, to: 35, status: "danger" },
    ],
  },
  {
    key: "moisture",
    label: "水分",
    unit: "%",
    min: 30,
    max: 90,
    step: 0.5,
    zones: [
      { from: 30, to: 55, status: "warn" },
      { from: 55, to: 70, status: "ideal" },
      { from: 70, to: 90, status: "danger" },
    ],
  },
  {
    key: "ec",
    label: "EC",
    unit: "ms/cm",
    min: 0,
    max: 10,
    step: 0.1,
    zones: [
      { from: 0, to: 2, status: "warn" },
      { from: 2, to: 6, status: "ideal" },
      { from: 6, to: 10, status: "warn" },
    ],
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    min: 4,
    max: 10,
    step: 0.1,
    zones: [
      { from: 4, to: 5.5, status: "warn" },
      { from: 5.5, to: 8.0, status: "ideal" },
      { from: 8.0, to: 10, status: "warn" },
    ],
  },
  {
    key: "ammonia",
    label: "アンモニア態N（乾物中）",
    unit: "ppm",
    min: 0,
    max: 6000,
    step: 10,
    zones: [
      { from: 0, to: 6000, status: "ideal" }, // 参考値のみ。判定なし
    ],
  },
];

export const LIQUID_METRICS: MetricMeta[] = [
  {
    key: "ec",
    label: "EC",
    unit: "ms/cm",
    min: 0,
    max: 12,
    step: 0.1,
    zones: [
      { from: 0, to: 3.5, status: "warn" },
      { from: 3.5, to: 6.0, status: "ideal" },
      { from: 6.0, to: 12, status: "ideal" },
    ],
  },
  {
    key: "ammonia_ratio",
    label: "アンモニア態Nの割合",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    zones: [
      { from: 0, to: 40, status: "warn" },
      { from: 40, to: 100, status: "ideal" },
    ],
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    min: 4,
    max: 10,
    step: 0.1,
    zones: [
      { from: 4, to: 7, status: "danger" },
      { from: 7, to: 8.5, status: "ideal" },
      { from: 8.5, to: 10, status: "warn" },
    ],
  },
  {
    key: "moisture",
    label: "水分",
    unit: "%",
    min: 80,
    max: 100,
    step: 0.1,
    zones: [{ from: 80, to: 100, status: "ideal" }], // 参考値のみ
  },
];

// =============================================================
//  固体堆肥の判定
// =============================================================
export function diagnoseSolid(input: SolidInput): DiagnoseRow[] {
  const rows: DiagnoseRow[] = [];

  // C/N比
  const cn = input.cn_ratio;
  if (cn != null && Number.isFinite(cn)) {
    if (cn >= 22) {
      rows.push({
        metric: "cn_ratio",
        label: "C/N比",
        unit: "",
        value: cn,
        status: "danger",
        statusLabel: "危険（未熟）",
        message:
          "まだワラやオガクズなどの繊維が分解されていません。このまま畑に撒くと作物の栄養を横取りする「窒素飢餓」を起こし、生育不良になるリスクが高い状態です。",
      });
    } else if (cn >= 15) {
      rows.push({
        metric: "cn_ratio",
        label: "C/N比",
        unit: "",
        value: cn,
        status: "ideal",
        statusLabel: "理想（完熟）",
        message:
          "微生物による分解が絶妙なバランスで完了しています。今すぐ安心して畑に撒くことができ、土壌をふかふかにする効果も最大です。",
      });
    } else {
      rows.push({
        metric: "cn_ratio",
        label: "C/N比",
        unit: "",
        value: cn,
        status: "warn",
        statusLabel: "注意（分解過剰）",
        message:
          "発酵が進みすぎて、土をふかふかにする有機質（繊維）が目減りしています。肥料効果はありますが、土壌改良効果は薄めです。早めに使い切りましょう。",
      });
    }
  }

  // 水分
  const m = input.moisture;
  if (m != null && Number.isFinite(m)) {
    if (m >= 70) {
      rows.push({
        metric: "moisture",
        label: "水分",
        unit: "%",
        value: m,
        status: "danger",
        statusLabel: "危険（ベチャベチャ）",
        message:
          "水分が高すぎて山の中に空気が入っていません。悪臭を放つ腐敗（嫌気発酵）が起きやすく、植物の根を傷める有害な有機酸が出やすい状態です。",
      });
    } else if (m >= 55) {
      rows.push({
        metric: "moisture",
        label: "水分",
        unit: "%",
        value: m,
        status: "ideal",
        statusLabel: "理想（適正）",
        message:
          "水分バランスはバッチリです。作業性も良く、酸素を好む善玉微生物（好気性菌）が最も活発に働く環境です。",
      });
    } else {
      rows.push({
        metric: "moisture",
        label: "水分",
        unit: "%",
        value: m,
        status: "warn",
        statusLabel: "注意（乾燥すぎ）",
        message:
          "乾きすぎて微生物が動けず、発酵がストップしています。少し水を足して切り返すか、早めに散布してください。",
      });
    }
  }

  // EC
  const ec = input.ec;
  if (ec != null && Number.isFinite(ec)) {
    if (ec >= 6.0) {
      rows.push({
        metric: "ec",
        label: "EC",
        unit: "ms/cm",
        value: ec,
        status: "warn",
        statusLabel: "注意（濃厚）",
        message:
          "肥料成分（塩類）が非常に濃く詰まっています。一度に大量にドカ撒きすると作物の根を痛める（濃度障害）リスクがあるため、撒く量を調整するか、化学肥料をしっかり減らしてください。",
      });
    } else if (ec >= 2.0) {
      rows.push({
        metric: "ec",
        label: "EC",
        unit: "ms/cm",
        value: ec,
        status: "ideal",
        statusLabel: "理想（適正）",
        message:
          "使いやすく、土や作物の根にも優しい理想的な栄養濃度です。",
      });
    } else {
      rows.push({
        metric: "ec",
        label: "EC",
        unit: "ms/cm",
        value: ec,
        status: "warn",
        statusLabel: "注意（出がらし/未分解）",
        message:
          "雨ざらしで大事な栄養が逃げ出したか、もしくはまだ分解が全く始まっておらず栄養が溶け出していない可能性があります。",
      });
    }
  }

  return rows;
}

// =============================================================
//  液体スラリーの判定
// =============================================================
export function diagnoseLiquid(input: LiquidInput): DiagnoseRow[] {
  const rows: DiagnoseRow[] = [];

  // EC
  const ec = input.ec;
  if (ec != null && Number.isFinite(ec)) {
    if (ec >= 6.0) {
      rows.push({
        metric: "ec",
        label: "EC",
        unit: "ms/cm",
        value: ec,
        status: "ideal",
        statusLabel: "特級液肥",
        message:
          "化成肥料並みに濃い最高の液肥に仕上がっています！少量でも強烈に効くため、これを活用すれば確実に化学肥料を30%〜50%削減し、大きなコストカットが可能です。",
      });
    } else if (ec >= 3.5) {
      rows.push({
        metric: "ec",
        label: "EC",
        unit: "ms/cm",
        value: ec,
        status: "ideal",
        statusLabel: "良質液肥",
        message:
          "標準的で非常に使いやすい液肥です。十分に化学肥料の代わりに使えますので、減肥を計画しましょう。",
      });
    } else {
      rows.push({
        metric: "ec",
        label: "EC",
        unit: "ms/cm",
        value: ec,
        status: "warn",
        statusLabel: "注意（薄まりすぎ）",
        message:
          "雨水や牛舎の洗浄水が混ざって薄まっています。トラクターで何往復も撒く手間の割に栄養が少ないため、散布効率の低下に注意が必要です。",
      });
    }
  }

  // アンモニア態Nの割合
  const ar = input.ammonia_ratio;
  if (ar != null && Number.isFinite(ar)) {
    if (ar >= 40) {
      rows.push({
        metric: "ammonia_ratio",
        label: "アンモニア態Nの割合",
        unit: "%",
        value: ar,
        status: "ideal",
        statusLabel: "超・速効性",
        message:
          "尿素や硫安などの化学肥料と全く同じ、今すぐ作物の根から吸われる速効性窒素がたっぷり含まれています。化成窒素の投入を今すぐ減らせる動かぬ証拠です。",
      });
    } else {
      rows.push({
        metric: "ammonia_ratio",
        label: "アンモニア態Nの割合",
        unit: "%",
        value: ar,
        status: "warn",
        statusLabel: "注意（遅効性）",
        message:
          "窒素の即効性が低いため、撒いてから草が湧くまで（初期生育）に少し時間がかかるタイプです。",
      });
    }
  }

  // pH
  const ph = input.ph;
  if (ph != null && Number.isFinite(ph)) {
    if (ph >= 7.0 && ph <= 8.5) {
      rows.push({
        metric: "ph",
        label: "pH",
        unit: "",
        value: ph,
        status: "ideal",
        statusLabel: "正常アルカリ",
        message:
          "アンモニア発酵が正常に進んでおり、液体として非常に安定しています。安心して散布できます。",
      });
    } else if (ph < 7.0) {
      rows.push({
        metric: "ph",
        label: "pH",
        unit: "",
        value: ph,
        status: "danger",
        statusLabel: "危険（腐敗酸敗）",
        message:
          "タンク内で悪い腐敗が起きています。撒くと強烈な悪臭を放ち、デントコーンや牧草の根を直接傷める（有機酸障害）リスクがあります。",
      });
    } else {
      // 8.5 < ph
      rows.push({
        metric: "ph",
        label: "pH",
        unit: "",
        value: ph,
        status: "warn",
        statusLabel: "注意（アルカリ偏重）",
        message:
          "pHがやや高めです。アンモニア揮散（窒素ロス）と、一部微量要素（鉄・マンガン等）の吸収阻害に注意してください。",
      });
    }
  }

  return rows;
}

// =============================================================
//  ソリューション派生
// =============================================================
export function deriveSolutions(
  type: ResourceType,
  input: SolidInput | LiquidInput,
  lowPh: boolean
): Solution[] {
  const out: Solution[] = [];

  const MOOCAL_FERMENT: Solution = {
    id: "moocal-fermentation",
    product: "moocal_700",
    productLabel: "MOOCAL-700",
    title: "発酵を正常化させる「MOOCAL-700」の仕込み提案",
    description:
      "現在、資材の分解が足踏みしているか、腐敗リスクがあります。切り返しやタンクへの充填時に『MOOCAL-700』を投入してください。強力な土壌菌が一気に息を吹き返し、未分解の繊維を高速分解して水分を飛ばし、最速で『最高級の完熟資材』へと進化させます。",
  };

  const MOOCAL_EC_REFORM: Solution = {
    id: "moocal-ec-reform",
    product: "moocal_700",
    productLabel: "MOOCAL-700",
    title: "化学肥料を30%削減し「MOOCAL-700」へ構造改革",
    description:
      "あなたの持っているスラリーは、タダで手に入る高級化学肥料そのものです。今すぐ高い化学肥料を30%カットして年間数百万円を浮かせましょう。浮いたお金で『MOOCAL-700』を牛の口やタンクから投入すれば、濃すぎるスラリーの塩類ストレスから土壌を守り、栄養を120%作物の根に届けるプレミアム液肥に変身します。",
  };

  const SOIL_KAIKO: Solution = {
    id: "soil-kaiko-ph",
    product: "soil_kaiko_1",
    productLabel: "soil貝粉末1号",
    title: "難溶性炭カルを卒業し「soil貝粉末1号」へ切り替え",
    description:
      "土壌の酸性・ミネラル不足を直すなら、溶けない石の粉（炭カル）は卒業しましょう。多孔質生物由来の『soil貝粉末1号』なら、MOOCALの土壌菌の最高の住処（マンション）になり、土の中で眠ることなく一瞬で溶けてpHを改善。不足しがちなマグネシウムもこれ1本で同時に補給できます。",
  };

  if (type === "solid") {
    const s = input as SolidInput;
    if (
      (s.cn_ratio != null && s.cn_ratio >= 22) ||
      (s.moisture != null && s.moisture >= 70)
    ) {
      out.push(MOOCAL_FERMENT);
    }
  } else {
    const l = input as LiquidInput;
    if (l.ph != null && l.ph < 7.0) out.push(MOOCAL_FERMENT);
    if (
      l.ec != null &&
      l.ec >= 6.0 &&
      l.ammonia_ratio != null &&
      l.ammonia_ratio >= 40
    ) {
      out.push(MOOCAL_EC_REFORM);
    }
  }

  if (lowPh) out.push(SOIL_KAIKO);

  // 同じソリューションが万一重複した場合はユニーク化
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}
