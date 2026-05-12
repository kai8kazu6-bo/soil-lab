-- =============================================================
--  soilラボ レポートの分析数値
--
--  - reports（メタデータ）の1件に紐づく、構造化された分析値
--  - 前回値と比較して「土壌回復ボーナス」を計算するための母体
--  - 比較ロジックはアプリ（TypeScript）側で実施
-- =============================================================

create table if not exists public.report_analyses (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null unique references public.reports(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  measured_at     date,

  -- 主要指標（全て任意。入力されたものだけを比較対象に）
  ph              numeric(3,1),      -- 例: 6.4
  cec             numeric(5,1),      -- 陽イオン交換容量 meq/100g
  humus_pct       numeric(4,1),      -- 腐植率 %
  nitrogen_mg     numeric(6,1),      -- mg/100g
  phosphorus_mg   numeric(6,1),
  potassium_mg    numeric(6,1),
  microbial_score numeric(5,1),      -- 0..100 の独自スコア

  created_at      timestamptz not null default now()
);

create index if not exists report_analyses_user_created_idx
  on public.report_analyses (user_id, created_at desc);

alter table public.report_analyses enable row level security;

drop policy if exists "Users select own analyses" on public.report_analyses;
drop policy if exists "Users insert own analyses" on public.report_analyses;
drop policy if exists "Users update own analyses" on public.report_analyses;

create policy "Users select own analyses"
  on public.report_analyses for select
  using (auth.uid() = user_id);

create policy "Users insert own analyses"
  on public.report_analyses for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.reports
        where id = report_id and user_id = auth.uid()
    )
  );

create policy "Users update own analyses"
  on public.report_analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.report_analyses is
  'reports に紐づく構造化された分析値。前回値との比較で土壌回復ボーナスのポイント付与に使用';
