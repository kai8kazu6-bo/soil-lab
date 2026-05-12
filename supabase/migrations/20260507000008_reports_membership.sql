-- =============================================================
--  soilラボ レポート仕様変更：スタッフがお客様にレポートを提供する形へ
--
--  - profiles.is_staff:           soilメンバー（スタッフ）かどうか
--  - profiles.is_essence_member:  Soil Essence 契約者かどうか
--  - profiles.essence_member_since
--  - reports.tier ('basic' | 'essence'): レポートの公開階層
--  - reports.uploaded_by: アップロードしたスタッフのID（監査用）
-- =============================================================

-- =============================================================
--  profiles に拡張
-- =============================================================
alter table public.profiles
  add column if not exists is_staff             boolean not null default false,
  add column if not exists is_essence_member    boolean not null default false,
  add column if not exists essence_member_since timestamptz;

comment on column public.profiles.is_staff is
  'soilメンバー（スタッフ）。レポートをアップロードできる権限を持つ';
comment on column public.profiles.is_essence_member is
  'Soil Essence 契約者。tier=essence のレポートを閲覧できる';

-- 整合性：essence_member_since は会員時のみ
alter table public.profiles
  drop constraint if exists profiles_essence_since_check;
alter table public.profiles
  add constraint profiles_essence_since_check check (
    (is_essence_member = false and essence_member_since is null)
    or (is_essence_member = true and essence_member_since is not null)
  );

create index if not exists profiles_is_staff_idx
  on public.profiles (is_staff) where is_staff = true;
create index if not exists profiles_essence_idx
  on public.profiles (is_essence_member) where is_essence_member = true;

-- =============================================================
--  report_tier 列挙型
-- =============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_tier') then
    create type public.report_tier as enum ('basic', 'essence');
  end if;
end$$;

-- =============================================================
--  reports に tier / uploaded_by を追加
-- =============================================================
alter table public.reports
  add column if not exists tier        public.report_tier not null default 'basic',
  add column if not exists uploaded_by uuid references auth.users(id);

create index if not exists reports_tier_idx on public.reports (tier);

comment on column public.reports.tier is
  'basic=全員閲覧可 / essence=Soil Essence会員のみ閲覧可';
comment on column public.reports.uploaded_by is
  'アップロードしたスタッフのid（監査用）';

-- =============================================================
--  reports の INSERT/UPDATE ポリシー：スタッフのみ
-- =============================================================
drop policy if exists "Users insert own reports" on public.reports;
drop policy if exists "Users update own reports" on public.reports;
drop policy if exists "Staff insert reports"     on public.reports;
drop policy if exists "Staff update reports"     on public.reports;

create policy "Staff insert reports"
  on public.reports for insert
  with check (
    coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
    and uploaded_by = auth.uid()
  );

create policy "Staff update reports"
  on public.reports for update
  using (
    coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
  )
  with check (
    coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
  );

-- SELECT/DELETE ポリシーはそのまま（顧客は user_id = 自分の行を見られる、自分の行を消せる）

-- =============================================================
--  Storage バケット reports の INSERT ポリシーをスタッフ限定に変更
--  （旧: 自分のフォルダのみ → 新: スタッフは任意の customer フォルダにアップ可）
-- =============================================================
drop policy if exists "Users upload own report files"  on storage.objects;
drop policy if exists "Users update own report files"  on storage.objects;
drop policy if exists "Users delete own report files"  on storage.objects;
drop policy if exists "Staff upload report files"      on storage.objects;
drop policy if exists "Staff update report files"      on storage.objects;
drop policy if exists "Staff delete report files"      on storage.objects;

-- SELECT は引き続き「reports/{auth.uid()}/...」を自分が読める形（既存）
-- INSERT/UPDATE/DELETE はスタッフだけ任意のフォルダで操作可
create policy "Staff upload report files"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
  );

create policy "Staff update report files"
  on storage.objects for update
  using (
    bucket_id = 'reports'
    and coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
  )
  with check (
    bucket_id = 'reports'
    and coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
  );

create policy "Staff delete report files"
  on storage.objects for delete
  using (
    bucket_id = 'reports'
    and coalesce(
      (select is_staff from public.profiles where id = auth.uid()),
      false
    ) = true
  );

-- =============================================================
--  ヘルパー：現在ユーザーの権限・会員ステータスを返すビュー
-- =============================================================
create or replace view public.current_user_status
  with (security_invoker = true) as
select
  p.id,
  p.handle,
  p.display_name,
  p.is_staff,
  p.is_essence_member,
  p.essence_member_since
from public.profiles p
where p.id = auth.uid();

comment on view public.current_user_status is
  'auth.uid()のスタッフ/会員ステータスを返す（行は1件or0件）';

-- =============================================================
--  管理者用：スタッフや会員ステータスを切り替えるサンプル
--  本番はSupabase Studioまたはサーバー管理画面から実行してください
-- =============================================================
-- update public.profiles set is_staff = true where handle = 'your_staff_handle';
-- update public.profiles
--   set is_essence_member = true, essence_member_since = now()
--   where handle = 'your_customer_handle';
