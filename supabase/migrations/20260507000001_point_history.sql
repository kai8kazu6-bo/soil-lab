-- =============================================================
--  soilラボ ポイント履歴テーブル
--  - ユーザーごとに獲得・使用ポイントの履歴を保存
--  - RLSにより、自分自身のレコードのみアクセス可能
--  - 合計値・週次集計はビューで提供しダッシュボードから直接参照
-- =============================================================

create extension if not exists "pgcrypto";

-- カテゴリ用の列挙型（拡張しやすくENUMで定義）
do $$
begin
  if not exists (select 1 from pg_type where typname = 'point_category') then
    create type public.point_category as enum (
      'lab_attendance',  -- ラボ参加
      'report_post',     -- レポート投稿
      'community',       -- コミュニティ貢献
      'redeem',          -- ポイント利用
      'bonus',           -- 運営付与
      'other'
    );
  end if;
end$$;

-- =============================================================
--  point_history テーブル
-- =============================================================
create table if not exists public.point_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       integer not null,                  -- 正：付与 / 負：利用
  category     public.point_category not null default 'other',
  reason       text not null,                     -- 表示用の理由（例: 「春のpHラボ参加」）
  metadata     jsonb not null default '{}'::jsonb, -- 任意の追加情報
  created_at   timestamptz not null default now()
);

comment on table public.point_history is
  'soilラボのユーザーごとのポイント獲得・利用履歴';
comment on column public.point_history.amount is
  '正の値で付与、負の値で利用を表す';

-- 取得最適化
create index if not exists point_history_user_created_idx
  on public.point_history (user_id, created_at desc);

create index if not exists point_history_user_category_idx
  on public.point_history (user_id, category);

-- =============================================================
--  Row Level Security（自分のレコードしか触れない）
-- =============================================================
alter table public.point_history enable row level security;

drop policy if exists "Users can read own point history"   on public.point_history;
drop policy if exists "Users can insert own point history" on public.point_history;
drop policy if exists "Users can update own point history" on public.point_history;
drop policy if exists "Users can delete own point history" on public.point_history;

create policy "Users can read own point history"
  on public.point_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own point history"
  on public.point_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own point history"
  on public.point_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 履歴は基本的に削除させない設計。必要ならコメントアウトを外す
-- create policy "Users can delete own point history"
--   on public.point_history for delete
--   using (auth.uid() = user_id);

-- =============================================================
--  合計値ビュー：ダッシュボード用に集計をDB側で完結
--  user_id は auth.uid() でフィルタ可能
-- =============================================================
create or replace view public.user_point_summary
  with (security_invoker = true) as
select
  user_id,
  coalesce(sum(amount), 0)::int                                            as total_points,
  coalesce(sum(amount) filter (where created_at >= now() - interval '7 days'), 0)::int  as weekly_delta,
  coalesce(sum(amount) filter (where amount > 0), 0)::int                  as lifetime_earned,
  coalesce(sum(-amount) filter (where amount < 0), 0)::int                 as lifetime_redeemed,
  max(created_at)                                                          as last_activity_at
from public.point_history
group by user_id;

comment on view public.user_point_summary is
  'ユーザーごとの現在ポイント・週次変化・累計を返すビュー（RLSは元テーブル経由）';

-- =============================================================
--  ポイント付与用RPC：サーバー側からの操作を一本化
--  （クライアントでも使えるが、auth.uid() のみ書き込み可）
-- =============================================================
create or replace function public.award_points(
  p_amount   integer,
  p_category public.point_category,
  p_reason   text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.point_history
language plpgsql
security invoker
as $$
declare
  v_row public.point_history;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.point_history (user_id, amount, category, reason, metadata)
  values (auth.uid(), p_amount, p_category, p_reason, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.award_points is
  'auth.uid() のユーザーにポイント履歴を1件追加するヘルパー';

-- =============================================================
--  サンプルシード（開発時のみ：サービスロールから実行する想定）
--  本番では実行しないでください
-- =============================================================
-- insert into public.point_history (user_id, amount, category, reason)
-- values
--   ('00000000-0000-0000-0000-000000000000', 200, 'lab_attendance', '春のpH測定ラボに参加'),
--   ('00000000-0000-0000-0000-000000000000', 150, 'report_post',    '畑Aの分析レポートを投稿'),
--   ('00000000-0000-0000-0000-000000000000', -50, 'redeem',         '解説動画と引き換え');
