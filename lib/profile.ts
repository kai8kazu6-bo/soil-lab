// 現在ユーザーのプロフィール取得。
// Supabase 未設定時はモック（reuse_agreement=false）を返す。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { ProfileRow } from "./supabase/types";

export type CurrentProfile = {
  profile: ProfileRow | null;
  isMock: boolean;
  isAnonymous: boolean;
};

const MOCK_PROFILE: ProfileRow = {
  id: "demo",
  handle: "kazu",
  display_name: "鏡沼さん",
  reuse_agreement: false,
  agreement_date: null,
  is_staff: false,
  is_essence_member: false,
  essence_member_since: null,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  updated_at: new Date().toISOString(),
};

export async function getCurrentProfile(): Promise<CurrentProfile> {
  if (!isSupabaseConfigured()) {
    return { profile: MOCK_PROFILE, isMock: true, isAnonymous: false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: null, isMock: false, isAnonymous: true };

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { profile: data ?? null, isMock: false, isAnonymous: false };
}
