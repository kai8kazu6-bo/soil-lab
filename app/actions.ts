// Server Actions：ダッシュボード／マイレポート／ポイント消費画面から呼ばれるDB側の入口。
"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  REPORT_ACCEPT_MIME,
  REPORT_BUCKET,
  REPORT_MAX_BYTES,
} from "@/lib/reports";
import {
  ANALYSIS_KEYS,
  computeRecoveryBonus,
  METRIC_LABEL,
  type AnalysisKey,
  type AnalysisMetrics,
  type Improvement,
} from "@/lib/analyses";
import {
  DONATION_MIN_AMOUNT,
  MOOCAL_TICKET_COST,
} from "@/lib/gifts";
import type {
  PointCategory,
  ReportKind,
} from "@/lib/supabase/types";

// =============================================================
//  ポイント付与
// =============================================================
type AwardInput = {
  amount: number;
  category: PointCategory;
  reason: string;
  metadata?: Record<string, unknown>;
};

export async function awardPoints(input: AwardInput) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabaseが未設定です" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("award_points", {
    p_amount: input.amount,
    p_category: input.category,
    p_reason: input.reason,
    p_metadata: input.metadata ?? {},
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/");
  return { ok: true as const, data };
}

// =============================================================
//  レポートのアップロード（FormData経由）
//  - Storage へ保存し、reports に INSERT
//  - 分析値が入力されていれば report_analyses にも INSERT
//  - 前回値が存在し改善があれば、土壌回復ボーナスを付与
// =============================================================
function parseAnalysisFromFormData(
  formData: FormData
): Partial<AnalysisMetrics> {
  const out: Partial<AnalysisMetrics> = {};
  for (const k of ANALYSIS_KEYS) {
    const raw = formData.get(`analysis_${k}`);
    if (raw == null || String(raw).trim() === "") continue;
    const v = Number(raw);
    if (Number.isFinite(v)) (out as Record<AnalysisKey, number>)[k] = v;
  }
  return out;
}

export type UploadReportResult =
  | { ok: false; error: string }
  | {
      ok: true;
      recovery?: {
        totalBonus: number;
        improvements: Improvement[];
      };
    };

export async function uploadReport(
  formData: FormData
): Promise<UploadReportResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabaseが未設定です" };
  }

  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const labDate = String(formData.get("lab_date") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return { ok: false, error: "ファイルが選択されていません" };
  }
  if (!title) {
    return { ok: false, error: "タイトルを入力してください" };
  }
  if (
    !REPORT_ACCEPT_MIME.includes(
      file.type as (typeof REPORT_ACCEPT_MIME)[number]
    )
  ) {
    return {
      ok: false,
      error: "PDFまたは画像（png/jpeg/webp/heic）のみアップロードできます",
    };
  }
  if (file.size > REPORT_MAX_BYTES) {
    return { ok: false, error: "ファイルサイズは20MBまでです" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const safeName = file.name
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_.\-ぁ-んァ-ヶ一-龠]/g, "_");
  const yyyymm = new Date().toISOString().slice(0, 7);
  const storagePath = `${user.id}/${yyyymm}/${Date.now()}_${safeName}`;

  // 1) Storage に保存
  const upload = await supabase.storage
    .from(REPORT_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (upload.error) return { ok: false, error: upload.error.message };

  const kind: ReportKind = file.type === "application/pdf" ? "pdf" : "image";

  // 2) reports に INSERT
  const { data: inserted, error: insertError } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      title,
      description,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      kind,
      lab_date: labDate,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from(REPORT_BUCKET).remove([storagePath]);
    return { ok: false, error: insertError?.message ?? "登録に失敗しました" };
  }

  const reportId = inserted.id;

  // 3) 分析値が入力されていれば report_analyses に INSERT し、土壌回復ボーナスを判定
  const analysis = parseAnalysisFromFormData(formData);
  const hasAnyAnalysis = ANALYSIS_KEYS.some(
    (k) => analysis[k] != null && Number.isFinite(analysis[k] as number)
  );

  if (hasAnyAnalysis) {
    // 直近の前回分析（このレポート以前のもの）を取得
    const { data: prev } = await supabase
      .from("report_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: analysisRow } = await supabase
      .from("report_analyses")
      .insert({
        report_id: reportId,
        user_id: user.id,
        measured_at: labDate,
        ph: analysis.ph ?? null,
        cec: analysis.cec ?? null,
        humus_pct: analysis.humus_pct ?? null,
        nitrogen_mg: analysis.nitrogen_mg ?? null,
        phosphorus_mg: analysis.phosphorus_mg ?? null,
        potassium_mg: analysis.potassium_mg ?? null,
        microbial_score: analysis.microbial_score ?? null,
      })
      .select("*")
      .single();

    if (prev && analysisRow) {
      const { improvements, totalBonus } = computeRecoveryBonus(
        prev,
        analysisRow
      );

      if (totalBonus > 0) {
        const labels = improvements.map((i) => METRIC_LABEL[i.key]).join("・");
        await supabase.rpc("award_points", {
          p_amount: totalBonus,
          p_category: "bonus",
          p_reason: `土壌回復ボーナス：${labels} が改善`,
          p_metadata: {
            analysis_id: analysisRow.id,
            improvements: improvements.map((i) => ({
              key: i.key,
              prev: i.prev,
              next: i.next,
              bonus: i.bonus,
            })),
          },
        });

        revalidatePath("/reports");
        revalidatePath("/");
        return { ok: true, recovery: { totalBonus, improvements } };
      }
    }
  }

  revalidatePath("/reports");
  return { ok: true };
}

// =============================================================
//  レポート削除
// =============================================================
export async function deleteReport(reportId: string) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabaseが未設定です" };
  }

  const supabase = createClient();
  const { data: row, error: fetchError } = await supabase
    .from("reports")
    .select("storage_path")
    .eq("id", reportId)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false as const, error: "レポートが見つかりません" };
  }

  const { error: removeError } = await supabase.storage
    .from(REPORT_BUCKET)
    .remove([row.storage_path]);
  if (removeError) {
    return { ok: false as const, error: removeError.message };
  }

  const { error: deleteError } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);
  if (deleteError) {
    return { ok: false as const, error: deleteError.message };
  }

  revalidatePath("/reports");
  return { ok: true as const };
}

// =============================================================
//  MOOCAL-700 発送チケットを贈る
// =============================================================
export async function sendMoocalTicket(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabaseが未設定です" };
  }

  const handle = String(formData.get("recipient_handle") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!handle) {
    return { ok: false as const, error: "受け取る人のハンドルを入力してください" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_moocal_ticket", {
    p_recipient_handle: handle,
    p_message: message || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/redeem");
  revalidatePath("/");
  return { ok: true as const, gift: data, cost: MOOCAL_TICKET_COST };
}

// =============================================================
//  寄付プールへ送る
// =============================================================
export async function sendDonation(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabaseが未設定です" };
  }

  const amountStr = String(formData.get("amount") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const amount = Number(amountStr);

  if (!Number.isFinite(amount) || amount < DONATION_MIN_AMOUNT) {
    return {
      ok: false as const,
      error: `最少寄付額は${DONATION_MIN_AMOUNT}ポイントです`,
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_donation", {
    p_amount: Math.floor(amount),
    p_message: message || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/redeem");
  revalidatePath("/");
  return { ok: true as const, gift: data, amount };
}

// =============================================================
//  リユース宣言（初回のみ理念共鳴ポイント50ptを付与）
// =============================================================
export async function declareReuse() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      error: "Supabaseが未設定です",
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("declare_reuse");

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/redeem");

  const payload = (data ?? {}) as {
    granted_bonus?: boolean;
    bonus_amount?: number;
    agreement_date?: string;
  };

  return {
    ok: true as const,
    grantedBonus: Boolean(payload.granted_bonus),
    bonusAmount: payload.bonus_amount ?? 0,
    agreementDate: payload.agreement_date ?? new Date().toISOString(),
  };
}

// =============================================================
//  受け取ったチケットを利用済みにする
// =============================================================
export async function redeemMoocalTicket(giftId: string) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabaseが未設定です" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_moocal_ticket", {
    p_gift_id: giftId,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/redeem");
  return { ok: true as const, gift: data };
}
