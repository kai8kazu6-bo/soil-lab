-- =============================================================
--  soilラボ レポート機能（Supabase Storage + メタデータテーブル）
--
--  - private bucket "reports" を作成
--  - 各ユーザーは reports/{user_id}/... のフォルダにのみアクセス可
--  - reports テーブルに表示用のメタデータを保存し、画面側はここを起点に一覧
-- =============================================================

-- =============================================================
--  Storage Bucket
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,                             -- 非公開バケット。閲覧は signed URL 経由
  20 * 1024 * 1024,                  -- 1ファイル最大 20MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic'
  ]
)
on conflict (id) do update
set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;

-- =============================================================
--  Storage RLS：自分のフォルダ（reports/{auth.uid()}/...）のみ操作可
--  storage.objects.name は "user_id/filename" のような形式を想定
-- =============================================================
drop policy if exists "Users read own report files"   on storage.objects;
drop policy if exists "Users upload own report files" on storage.objects;
drop policy if exists "Users update own report files" on storage.objects;
drop policy if exists "Users delete own report files" on storage.objects;

create policy "Users read own report files"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users upload own report files"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own report files"
  on storage.objects for update
  using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own report files"
  on storage.objects for delete
  using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================
--  reports テーブル（表示用メタデータ）
-- =============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_kind') then
    create type public.report_kind as enum ('pdf', 'image');
  end if;
end$$;

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  storage_path text not null unique,           -- 例: "{user_id}/2026-05/sample.pdf"
  mime_type    text not null,
  file_size    bigint not null,                -- bytes
  kind         public.report_kind not null,
  lab_date     date,                           -- 採取・測定日
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.reports is
  'soilラボにアップロードされた土壌分析レポートのメタデータ。実体はStorageのreportsバケット。';

create index if not exists reports_user_created_idx
  on public.reports (user_id, created_at desc);

-- updated_at の自動更新
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end$$ language plpgsql;

drop trigger if exists reports_touch_updated_at on public.reports;
create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute function public.touch_updated_at();

-- =============================================================
--  reports テーブル RLS
-- =============================================================
alter table public.reports enable row level security;

drop policy if exists "Users select own reports" on public.reports;
drop policy if exists "Users insert own reports" on public.reports;
drop policy if exists "Users update own reports" on public.reports;
drop policy if exists "Users delete own reports" on public.reports;

create policy "Users select own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users insert own reports"
  on public.reports for insert
  with check (
    auth.uid() = user_id
    -- storage_path の先頭が auth.uid()/ で始まることを強制
    and storage_path like (auth.uid()::text || '/%')
  );

create policy "Users update own reports"
  on public.reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);
