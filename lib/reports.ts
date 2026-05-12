// マイレポート画面向け：Storage + reports テーブルの取得ロジック。
// Supabase 未設定時はモックでUIプレビューが動くようにフォールバック。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { ReportRow } from "./supabase/types";

// クライアントセーフな定数は reports-config.ts に分離（next/headers経路の遮断のため）
export {
  REPORT_BUCKET,
  REPORT_MAX_BYTES,
  REPORT_ACCEPT_MIME,
} from "./reports-config";

export type ReportListItem = ReportRow & {
  /** 一覧表示用に発行した短期 signed URL（30分） */
  signed_url: string | null;
};

export type ReportListResult = {
  items: ReportListItem[];
  isMock: boolean;
  isAnonymous: boolean;
};

const MOCK_ITEMS: ReportListItem[] = [
  {
    id: "demo-r1",
    user_id: "demo",
    title: "畑Aの春の土壌分析",
    description: "pH 6.4 / 窒素やや高め",
    storage_path: "demo/2026-04/sample.pdf",
    mime_type: "application/pdf",
    file_size: 1_240_000,
    kind: "pdf",
    lab_date: "2026-04-10",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    signed_url: null,
  },
  {
    id: "demo-r2",
    user_id: "demo",
    title: "棚田Bの色味スナップ",
    description: "色合いを記録",
    storage_path: "demo/2026-04/snap.jpg",
    mime_type: "image/jpeg",
    file_size: 820_000,
    kind: "image",
    lab_date: "2026-04-22",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    signed_url: null,
  },
];

export async function listReports(): Promise<ReportListResult> {
  if (!isSupabaseConfigured()) {
    return { items: MOCK_ITEMS, isMock: true, isAnonymous: false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [], isMock: false, isAnonymous: true };
  }

  const { data: rows, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return { items: [], isMock: false, isAnonymous: false };
  }

  // 30分有効な署名付きURLをまとめて発行
  const paths = rows.map((r) => r.storage_path);
  const items: ReportListItem[] = await Promise.all(
    rows.map(async (row, idx) => {
      const { data: signed } = await supabase.storage
        .from(REPORT_BUCKET)
        .createSignedUrl(paths[idx], 60 * 30);
      return { ...row, signed_url: signed?.signedUrl ?? null };
    })
  );

  return { items, isMock: false, isAnonymous: false };
}

/** Storageパスをユーザー単位で安全に組み立てる */
export function buildStoragePath(userId: string, fileName: string): string {
  const safe = fileName
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_.\-ぁ-んァ-ヶ一-龠]/g, "_");
  const yyyymm = new Date().toISOString().slice(0, 7); // 2026-05
  return `${userId}/${yyyymm}/${Date.now()}_${safe}`;
}
