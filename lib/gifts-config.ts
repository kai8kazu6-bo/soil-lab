// Client/Server 両方から安全に import できる、gifts 関連の定数と型。
// （ここに置くファイルは next/headers などのサーバー専用APIを参照しないこと）

export const MOOCAL_TICKET_COST = 700;
export const DONATION_MIN_AMOUNT = 100;
export const DONATION_PRESETS = [100, 300, 500, 1000] as const;

export type GiftKind = "moocal_700_shipping" | "donation";

export type DonationPoolSummary = {
  total_points: number;
  gift_count: number;
  contributor_count: number;
  last_contribution_at: string | null;
};
