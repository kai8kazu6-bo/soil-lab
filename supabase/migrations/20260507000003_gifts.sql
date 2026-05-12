-- =============================================================
--  soilラボ ポイント消費・プレゼント・寄付プール
--
--  - profiles: ハンドルでユーザーを指名できるよう最小限のプロフィール
--  - gift_kind: 'moocal_700_shipping' または 'donation'
--  - gifts: 1件 = 1プレゼント or 1寄付
--  - RPC: send_moocal_ticket / send_donation / redeem_moocal_ticket
--  - View: donation_pool_summary（コミュニティ寄付プール集計）
-- =============================================================

-- =============================================================
--  profiles（ハンドルで贈り先を指名するため）
-- =============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text not null unique
                  check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Anyone can read profiles"     on public.profiles;
drop policy if exists "Users insert own profile"     on public.profiles;
drop policy if exists "Users update own profile"     on public.profiles;

-- 贈り先検索のため、ログイン済み全員から SELECT 可
create policy "Anyone can read profiles"
  on public.profiles for select
  using (true);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =============================================================
--  gift_kind 列挙型
-- =============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'gift_kind') then
    create type public.gift_kind as enum (
      'moocal_700_shipping',  -- MOOCAL-700 発送チケット（700pt）
      'donation'              -- コミュニティ寄付プールへの送付
    );
  end if;
end$$;

-- =============================================================
--  gifts テーブル
-- =============================================================
create table if not exists public.gifts (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references auth.users(id) on delete cascade,
  recipient_id  uuid references auth.users(id) on delete set null,
  kind          public.gift_kind not null,
  points_spent  integer not null check (points_spent > 0),
  message       text,
  redeemed_at   timestamptz,                   -- チケットを受領者が利用したタイミング
  created_at    timestamptz not null default now(),

  -- ticket には受領者必須、donation には受領者なし
  constraint gifts_recipient_check check (
    (kind = 'moocal_700_shipping' and recipient_id is not null)
    or (kind = 'donation' and recipient_id is null)
  ),

  -- donation は redeemed_at 不要
  constraint gifts_redeemed_only_ticket check (
    redeemed_at is null or kind = 'moocal_700_shipping'
  )
);

create index if not exists gifts_recipient_idx on public.gifts (recipient_id, created_at desc);
create index if not exists gifts_sender_idx    on public.gifts (sender_id, created_at desc);
create index if not exists gifts_kind_idx      on public.gifts (kind);

alter table public.gifts enable row level security;

drop policy if exists "Users read sent or received gifts" on public.gifts;
drop policy if exists "Anyone reads donations"            on public.gifts;
drop policy if exists "Recipients redeem own ticket"      on public.gifts;

-- 自分が送ったもの or 受け取ったものを SELECT 可
create policy "Users read sent or received gifts"
  on public.gifts for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- 寄付プールはコミュニティ全体に可視（送信者は表示しても良いが、message のみマスクしたい場合はビュー側で対応）
create policy "Anyone reads donations"
  on public.gifts for select
  using (kind = 'donation');

-- 受領者だけが、自分のチケットの redeemed_at を更新できる（RPC 経由を推奨）
create policy "Recipients redeem own ticket"
  on public.gifts for update
  using (auth.uid() = recipient_id and kind = 'moocal_700_shipping')
  with check (auth.uid() = recipient_id and kind = 'moocal_700_shipping');

-- INSERT は RPC 経由のみとし、直接の INSERT ポリシーは作らない（= 一般ユーザーは不可）

-- =============================================================
--  定数：MOOCAL-700 発送チケットの価格
-- =============================================================
create or replace function public.moocal_ticket_cost()
returns integer language sql immutable parallel safe as $$
  select 700::integer
$$;

-- =============================================================
--  send_moocal_ticket：MOOCAL-700チケットを贈る
-- =============================================================
create or replace function public.send_moocal_ticket(
  p_recipient_handle text,
  p_message text default null
)
returns public.gifts
language plpgsql
security invoker
as $$
declare
  v_recipient uuid;
  v_balance   integer;
  v_cost      integer := moocal_ticket_cost();
  v_gift      public.gifts;
  v_handle    text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  v_handle := lower(trim(coalesce(p_recipient_handle, '')));
  if v_handle = '' then
    raise exception '受け取る人のハンドルを入力してください';
  end if;

  select id into v_recipient from public.profiles where handle = v_handle;
  if not found then
    raise exception 'ハンドル「%」のユーザーが見つかりませんでした', v_handle;
  end if;

  if v_recipient = auth.uid() then
    raise exception '自分自身にはプレゼントできません';
  end if;

  -- 残高チェック（簡易：同時実行は許容範囲のレースを想定）
  select coalesce(sum(amount), 0)::integer into v_balance
    from public.point_history
    where user_id = auth.uid();

  if v_balance < v_cost then
    raise exception 'ポイントが足りません（保有 %pt / 必要 %pt）', v_balance, v_cost;
  end if;

  -- 送信者から消費
  insert into public.point_history (user_id, amount, category, reason, metadata)
  values (
    auth.uid(),
    -v_cost,
    'redeem',
    'MOOCAL-700 発送チケットをプレゼント',
    jsonb_build_object(
      'gift_kind', 'moocal_700_shipping',
      'recipient_handle', v_handle,
      'recipient_id', v_recipient
    )
  );

  -- ギフトを作成
  insert into public.gifts (sender_id, recipient_id, kind, points_spent, message)
  values (auth.uid(), v_recipient, 'moocal_700_shipping', v_cost, nullif(trim(coalesce(p_message,'')), ''))
  returning * into v_gift;

  return v_gift;
end$$;

comment on function public.send_moocal_ticket is
  'auth.uid() から、ハンドル指定のユーザーへ MOOCAL-700 発送チケットを贈る。残高チェック・ポイント消費・ギフト作成を1トランザクションで実行。';

-- =============================================================
--  send_donation：寄付プールに送る
-- =============================================================
create or replace function public.send_donation(
  p_amount  integer,
  p_message text default null
)
returns public.gifts
language plpgsql
security invoker
as $$
declare
  v_balance integer;
  v_gift    public.gifts;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception '寄付額は1ポイント以上を指定してください';
  end if;
  if p_amount < 100 then
    raise exception '最少寄付額は100ポイントです';
  end if;

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.point_history
    where user_id = auth.uid();

  if v_balance < p_amount then
    raise exception 'ポイントが足りません（保有 %pt / 寄付 %pt）', v_balance, p_amount;
  end if;

  insert into public.point_history (user_id, amount, category, reason, metadata)
  values (
    auth.uid(),
    -p_amount,
    'redeem',
    'コミュニティ寄付プールへ送金',
    jsonb_build_object('gift_kind', 'donation')
  );

  insert into public.gifts (sender_id, recipient_id, kind, points_spent, message)
  values (auth.uid(), null, 'donation', p_amount, nullif(trim(coalesce(p_message,'')), ''))
  returning * into v_gift;

  return v_gift;
end$$;

comment on function public.send_donation is
  '寄付プールにポイントを送る。recipient_id は null、kind = donation。';

-- =============================================================
--  redeem_moocal_ticket：受取者がチケットを使用する
-- =============================================================
create or replace function public.redeem_moocal_ticket(p_gift_id uuid)
returns public.gifts
language plpgsql
security invoker
as $$
declare
  v_gift public.gifts;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.gifts
     set redeemed_at = now()
   where id = p_gift_id
     and recipient_id = auth.uid()
     and kind = 'moocal_700_shipping'
     and redeemed_at is null
  returning * into v_gift;

  if not found then
    raise exception 'チケットが見つからないか、既に利用済みです';
  end if;

  return v_gift;
end$$;

-- =============================================================
--  donation_pool_summary ビュー
-- =============================================================
create or replace view public.donation_pool_summary
  with (security_invoker = true) as
select
  coalesce(sum(points_spent), 0)::integer            as total_points,
  count(*)::integer                                  as gift_count,
  count(distinct sender_id)::integer                 as contributor_count,
  max(created_at)                                    as last_contribution_at
from public.gifts
where kind = 'donation';

comment on view public.donation_pool_summary is
  'コミュニティ寄付プールの合計ポイント・件数・貢献者数';
