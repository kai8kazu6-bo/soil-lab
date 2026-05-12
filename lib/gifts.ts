// プレゼント／寄付プールのデータ取得ロジック。
// Supabase 未設定時はモックでUIプレビューが動くようにフォールバックする。

import { createClient, isSupabaseConfigured } from "./supabase/server";

// クライアントセーフな定数・型は gifts-config.ts に分離（next/headers経路の遮断のため）
export {
  MOOCAL_TICKET_COST,
  DONATION_MIN_AMOUNT,
  DONATION_PRESETS,
  type GiftKind,
  type DonationPoolSummary,
} from "./gifts-config";

export type GiftRow = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  kind: "moocal_700_shipping" | "donation";
  points_spent: number;
  message: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export type GiftWithProfile = GiftRow & {
  sender_handle: string | null;
  sender_display_name: string | null;
  sender_reuse: boolean;
  recipient_handle: string | null;
  recipient_display_name: string | null;
  recipient_reuse: boolean;
};

export type RedeemPageData = {
  pool: DonationPoolSummary;
  sent: GiftWithProfile[];
  inbox: GiftWithProfile[];
  isMock: boolean;
  isAnonymous: boolean;
};

const MOCK: RedeemPageData = {
  pool: {
    total_points: 4_820,
    gift_count: 17,
    contributor_count: 9,
    last_contribution_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  sent: [
    {
      id: "demo-s1",
      sender_id: "me",
      recipient_id: "u-aki",
      kind: "moocal_700_shipping",
      points_spent: 700,
      message: "新しい畑、楽しみですね！",
      redeemed_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      sender_handle: "kazu",
      sender_display_name: "鏡沼さん",
      sender_reuse: false,
      recipient_handle: "aki_farm",
      recipient_display_name: "あきの畑",
      recipient_reuse: true,
    },
  ],
  inbox: [
    {
      id: "demo-i1",
      sender_id: "u-mori",
      recipient_id: "me",
      kind: "moocal_700_shipping",
      points_spent: 700,
      message: "前回のレポート、参考にさせてもらいました！",
      redeemed_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      sender_handle: "mori_soil",
      sender_display_name: "もりの土",
      sender_reuse: true,
      recipient_handle: "kazu",
      recipient_display_name: "鏡沼さん",
      recipient_reuse: false,
    },
  ],
  isMock: true,
  isAnonymous: false,
};

export async function getRedeemPageData(): Promise<RedeemPageData> {
  if (!isSupabaseConfigured()) return MOCK;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ...MOCK, isMock: false, isAnonymous: true, sent: [], inbox: [] };
  }

  // 寄付プールの合計
  const { data: pool } = await supabase
    .from("donation_pool_summary")
    .select("*")
    .maybeSingle();

  // 自分が送ったプレゼント
  const { data: sentRows } = await supabase
    .from("gifts")
    .select("*")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // 受け取ったチケット
  const { data: inboxRows } = await supabase
    .from("gifts")
    .select("*")
    .eq("recipient_id", user.id)
    .eq("kind", "moocal_700_shipping")
    .order("created_at", { ascending: false })
    .limit(20);

  // 関連プロフィールをまとめて取得
  const ids = new Set<string>();
  (sentRows ?? []).forEach((g) => {
    ids.add(g.sender_id);
    if (g.recipient_id) ids.add(g.recipient_id);
  });
  (inboxRows ?? []).forEach((g) => {
    ids.add(g.sender_id);
    if (g.recipient_id) ids.add(g.recipient_id);
  });

  const profiles =
    ids.size > 0
      ? (
          await supabase
            .from("profiles")
            .select("id, handle, display_name, reuse_agreement")
            .in("id", Array.from(ids))
        ).data ?? []
      : [];
  const pmap = new Map(profiles.map((p) => [p.id, p]));

  function enrich(g: GiftRow): GiftWithProfile {
    const s = pmap.get(g.sender_id);
    const r = g.recipient_id ? pmap.get(g.recipient_id) : null;
    return {
      ...g,
      sender_handle: s?.handle ?? null,
      sender_display_name: s?.display_name ?? null,
      sender_reuse: Boolean(s?.reuse_agreement),
      recipient_handle: r?.handle ?? null,
      recipient_display_name: r?.display_name ?? null,
      recipient_reuse: Boolean(r?.reuse_agreement),
    };
  }

  return {
    pool: pool ?? {
      total_points: 0,
      gift_count: 0,
      contributor_count: 0,
      last_contribution_at: null,
    },
    sent: (sentRows ?? []).map(enrich),
    inbox: (inboxRows ?? []).map(enrich),
    isMock: false,
    isAnonymous: false,
  };
}
