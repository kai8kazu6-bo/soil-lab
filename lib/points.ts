// ダッシュボード向けポイント取得ロジック。
// Supabase未設定時はモックを返してUIを壊さない。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type {
  PointHistoryRow,
  UserPointSummary,
} from "./supabase/types";

export type DashboardPointData = {
  summary: UserPointSummary;
  history: PointHistoryRow[];
  /** Supabaseに接続できなかった場合に true。プレビュー用 */
  isMock: boolean;
  /** ログインしていない場合に true。CTAでログインへ誘導するのに使う */
  isAnonymous: boolean;
};

const MOCK: DashboardPointData = {
  summary: {
    user_id: "demo",
    total_points: 1280,
    weekly_delta: 120,
    lifetime_earned: 1480,
    lifetime_redeemed: 200,
    last_activity_at: new Date().toISOString(),
  },
  history: [
    {
      id: "demo-1",
      user_id: "demo",
      amount: 200,
      category: "lab_attendance",
      reason: "春のpH測定ラボに参加",
      metadata: {},
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "demo-2",
      user_id: "demo",
      amount: 150,
      category: "report_post",
      reason: "畑Aの分析レポートを投稿",
      metadata: {},
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: "demo-3",
      user_id: "demo",
      amount: -50,
      category: "redeem",
      reason: "解説動画と引き換え",
      metadata: {},
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ],
  isMock: true,
  isAnonymous: false,
};

export async function getDashboardPointData(): Promise<DashboardPointData> {
  if (!isSupabaseConfigured()) return MOCK;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ...MOCK, isMock: false, isAnonymous: true };
  }

  // 集計ビュー（自分の行は1件、なければ初期値）
  const { data: summaryRow } = await supabase
    .from("user_point_summary")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // 直近の履歴（最大10件）
  const { data: historyRows } = await supabase
    .from("point_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    summary:
      summaryRow ??
      {
        user_id: user.id,
        total_points: 0,
        weekly_delta: 0,
        lifetime_earned: 0,
        lifetime_redeemed: 0,
        last_activity_at: null,
      },
    history: historyRows ?? [],
    isMock: false,
    isAnonymous: false,
  };
}
