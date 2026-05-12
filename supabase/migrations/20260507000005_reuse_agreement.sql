-- =============================================================
--  soilラボ リユース宣言（20L容器の再利用に協力する意思表示）
--
--  - profiles に reuse_agreement / agreement_date を追加
--  - 初回宣言時のみ「理念共鳴ポイント」50ptを付与
--  - 宣言済みユーザーには UI 側で「リユース宣言バッジ」を表示
-- =============================================================

-- =============================================================
--  profiles への列追加
-- =============================================================
alter table public.profiles
  add column if not exists reuse_agreement boolean not null default false,
  add column if not exists agreement_date  timestamptz;

comment on column public.profiles.reuse_agreement is
  '20L容器の再利用に協力する意思表示。trueなら宣言済み';
comment on column public.profiles.agreement_date is
  'リユース宣言を行った日時';

-- 整合性：agreement_date は宣言済みの時だけ値を持つ
alter table public.profiles
  drop constraint if exists profiles_agreement_date_check;
alter table public.profiles
  add constraint profiles_agreement_date_check check (
    (reuse_agreement = false and agreement_date is null)
    or (reuse_agreement = true and agreement_date is not null)
  );

-- 宣言済みユーザー一覧の高速取得
create index if not exists profiles_reuse_agreement_idx
  on public.profiles (reuse_agreement)
  where reuse_agreement = true;

-- =============================================================
--  declare_reuse RPC
--  - 自分の profiles 行を確保（無ければ作成）
--  - reuse_agreement を true に、agreement_date を now() に更新
--  - 「未宣言 → 宣言済み」になった瞬間だけ 50pt の理念共鳴ポイントを付与
--  - 返り値: { granted_bonus, bonus_amount, agreement_date }
-- =============================================================
create or replace function public.declare_reuse()
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid     uuid := auth.uid();
  v_now     timestamptz := now();
  v_bonus   integer := 50;
  v_already boolean := false;
  v_granted boolean := false;
  v_handle  text;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  -- profiles 行を確保（auto-handle は user_xxxxxxxxxx 形式）
  v_handle := 'user_' || left(replace(v_uid::text, '-', ''), 10);
  insert into public.profiles (id, handle)
  values (v_uid, v_handle)
  on conflict (id) do nothing;

  -- 既に宣言済みかチェック
  select reuse_agreement into v_already from public.profiles where id = v_uid;
  v_already := coalesce(v_already, false);

  if not v_already then
    update public.profiles
       set reuse_agreement = true,
           agreement_date  = v_now,
           updated_at      = v_now
     where id = v_uid;

    -- 初回のみ 50pt 付与
    perform public.award_points(
      v_bonus,
      'bonus'::public.point_category,
      '理念共鳴ポイント：リユース宣言',
      jsonb_build_object(
        'reuse_declared_at', v_now,
        'kind', 'philosophy_resonance'
      )
    );
    v_granted := true;
  end if;

  return jsonb_build_object(
    'granted_bonus',  v_granted,
    'bonus_amount',   v_bonus,
    'agreement_date', v_now
  );
end$$;

comment on function public.declare_reuse is
  'リユース宣言を記録。初回のみ理念共鳴ポイント（50pt）を付与し、granted_bonusで通知する';
