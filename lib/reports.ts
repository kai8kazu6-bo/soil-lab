// マイレポート画面向け：Storage + reports テーブルの取得ロジック。
// スタッフがアップロードした顧客向け分析結果を表示する。
// tier='essence' のレポートは Soil Essence 会員のみ閲覧可能（signed URL未生成）。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { ReportRow, ReportTier } from "./supabase/types";

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
};

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

export async function listReports(): Promise<ReportListResult> {
  if (!isSupabaseConfigured()) {
    return {
      items: MOCK_ITEMS,
      isMock: true,
      isAnonymous: false,
      isEssenceMember: false,
      isStaff: false,
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
    };
  }

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
