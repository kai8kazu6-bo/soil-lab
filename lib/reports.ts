// マイレポート画面向け：Storage + reports テーブルの取得ロジック。
// スタッフがアップロードした顧客向け分析結果を表示する。
// tier='essence' のレポートは Soil Essence 会員のみ閲覧可能（signed URL未生成）。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type {
  ReportAnalysisRow,
  ReportResourceType,
  ReportRow,
  ReportTier,
} from "./supabase/types";
import type { AnalysisOption } from "./diagnose";

// クライアントセーフな定数は reports-config.ts に分離
export {
  REPORT_BUCKET,
  REPORT_MAX_BYTES,
  REPORT_ACCEPT_MIME,
} from "./reports-config";

export type ReportListItem = ReportRow & {
  /** 閲覧権限がある場合に発行される signed URL（30分） */
  signed_url: string | null;
  /** ユーザーが閲覧権限を持つか（基本=常にtrue、エッセンス=会員のみtrue） */
  has_access: boolean;
};

export type ReportListResult = {
  items: ReportListItem[];
  isMock: boolean;
  isAnonymous: boolean;
  /** 現在ユーザーが Soil Essence 会員か */
  isEssenceMember: boolean;
  /** 現在ユーザーがスタッフか（アップロード権限を持つか） */
  isStaff: boolean;
  /** 診断ツールに渡せる「分析結果から取り込み」候補 */
  diagnoseOptions: AnalysisOption[];
};

/** report_analyses 行 + 親レポートの簡易情報を AnalysisOption に変換 */
function analysisToOption(
  row: ReportAnalysisRow,
  parentReport: { title: string; lab_date: string | null } | undefined
): AnalysisOption | null {
  // soil タイプは堆肥/スラリー診断には使わないので除外
  if (row.resource_type === "soil") return null;

  const dateStr = row.measured_at ?? parentReport?.lab_date ?? row.created_at;
  const datePart = dateStr
    ? new Date(dateStr).toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
      })
    : null;
  const titlePart = parentReport?.title ?? "分析結果";
  const label = datePart ? `${titlePart}（${datePart}）` : titlePart;

  const resourceType: "solid" | "liquid" =
    row.resource_type === "solid_compost" ? "solid" : "liquid";

  return {
    id: row.id,
    label,
    resourceType,
    values: {
      cn_ratio: row.cn_ratio,
      moisture: row.moisture,
      ec: row.ec,
      ph: row.ph,
      ammonia: row.ammonia_ppm,
      ammonia_ratio: row.ammonia_ratio,
    },
  };
}

const MOCK_ITEMS: ReportListItem[] = [
  {
    id: "demo-r1",
    user_id: "demo",
    title: "畑Aの春の土壌分析（基本結果）",
    description: "pH 6.4 / 窒素やや高め / カリウム適正",
    storage_path: "demo/2026-04/sample-basic.pdf",
    mime_type: "application/pdf",
    file_size: 820_000,
    kind: "pdf",
    lab_date: "2026-04-10",
    tier: "basic",
    uploaded_by: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    signed_url: null,
    has_access: true,
  },
  {
    id: "demo-r2",
    user_id: "demo",
    title: "Soil Essence 特別分析：微生物多様性レポート",
    description: "DNA解析による微生物群集の年次変動と推奨アクション",
    storage_path: "demo/2026-04/sample-essence.pdf",
    mime_type: "application/pdf",
    file_size: 1_640_000,
    kind: "pdf",
    lab_date: "2026-04-22",
    tier: "essence",
    uploaded_by: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    signed_url: null,
    has_access: false, // モックでは非会員想定
  },
];

const MOCK_DIAGNOSE_OPTIONS: AnalysisOption[] = [
  {
    id: "demo-a1",
    label: "畑Aの堆肥分析（4/10）",
    resourceType: "solid",
    values: {
      cn_ratio: 18.2,
      moisture: 62,
      ec: 3.4,
      ph: 7.0,
      ammonia: 1200,
    },
  },
  {
    id: "demo-a2",
    label: "牛舎スラリー分析（4/22）",
    resourceType: "liquid",
    values: {
      ec: 6.8,
      ammonia_ratio: 48,
      ph: 7.6,
      moisture: 95,
    },
  },
];

export async function listReports(): Promise<ReportListResult> {
  if (!isSupabaseConfigured()) {
    return {
      items: MOCK_ITEMS,
      isMock: true,
      isAnonymous: false,
      isEssenceMember: false,
      isStaff: false,
      diagnoseOptions: MOCK_DIAGNOSE_OPTIONS,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      items: [],
      isMock: false,
      isAnonymous: true,
      isEssenceMember: false,
      isStaff: false,
      diagnoseOptions: [],
    };
  }

  // 現在ユーザーのプロフィールから会員/スタッフ判定
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_essence_member, is_staff")
    .eq("id", user.id)
    .maybeSingle();
  const isEssenceMember = Boolean(prof?.is_essence_member);
  const isStaff = Boolean(prof?.is_staff);

  // レポート本体
  const { data: rows, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !rows) {
    return {
      items: [],
      isMock: false,
      isAnonymous: false,
      isEssenceMember,
      isStaff,
      diagnoseOptions: [],
    };
  }

  // 自分宛ての堆肥/スラリー分析値を取得
  const { data: analyses } = await supabase
    .from("report_analyses")
    .select("*")
    .eq("user_id", user.id)
    .in("resource_type", ["solid_compost", "liquid_slurry"])
    .order("created_at", { ascending: false })
    .limit(50);

  const reportById = new Map(rows.map((r) => [r.id, r]));
  const diagnoseOptions: AnalysisOption[] = (analyses ?? [])
    .map((a) => {
      const parent = reportById.get(a.report_id);
      return analysisToOption(a, parent);
    })
    .filter((x): x is AnalysisOption => x !== null);

  // 30分有効な signed URL を「閲覧可能なレポート」だけに発行
  const items: ReportListItem[] = await Promise.all(
    rows.map(async (row) => {
      const accessible: boolean =
        row.tier === "basic" || isEssenceMember || isStaff;
      if (!accessible) {
        return { ...row, signed_url: null, has_access: false };
      }
      const { data: signed } = await supabase.storage
        .from("reports")
        .createSignedUrl(row.storage_path, 60 * 30);
      return {
        ...row,
        signed_url: signed?.signedUrl ?? null,
        has_access: true,
      };
    })
  );

  return {
    items,
    isMock: false,
    isAnonymous: false,
    isEssenceMember,
    isStaff,
    diagnoseOptions,
  };
}

/** Storageパスを顧客単位で安全に組み立てる（スタッフが顧客フォルダにアップロード） */
export function buildStoragePath(
  customerId: string,
  fileName: string
): string {
  const safe = fileName
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_.\-ぁ-んァ-ヶ一-龠]/g, "_");
  const yyyymm = new Date().toISOString().slice(0, 7); // 2026-05
  return `${customerId}/${yyyymm}/${Date.now()}_${safe}`;
}

export const REPORT_TIER_LABEL: Record<ReportTier, string> = {
  basic: "Basic",
  essence: "Soil Essence",
};
