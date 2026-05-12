-- =============================================================
--  soilラボ 動画機能
--
--  - videos: 管理者が YouTube ID を登録する公開カタログ
--  - video_watches: ユーザー×動画 = 1行（重複視聴を防ぎ、初回のみポイント付与）
--  - video_comments: 動画ごとのコメント
--  - RPC: record_video_watch / post_video_comment（残高加算は award_points 経由）
-- =============================================================

-- =============================================================
--  videos: 動画カタログ
-- =============================================================
create table if not exists public.videos (
  id                       uuid primary key default gen_random_uuid(),
  youtube_id               text not null unique
                             check (youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title                    text not null,
  description              text,
  thumbnail_url            text,
  -- 初回視聴で付与するポイント
  points_for_watch         integer not null default 20
                             check (points_for_watch >= 0),
  -- 初回コメント投稿で付与するポイント
  points_for_first_comment integer not null default 30
                             check (points_for_first_comment >= 0),
  is_published             boolean not null default true,
  display_order            integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists videos_touch_updated_at on public.videos;
create trigger videos_touch_updated_at
  before update on public.videos
  for each row execute function public.touch_updated_at();

alter table public.videos enable row level security;

drop policy if exists "Anyone reads published videos" on public.videos;
create policy "Anyone reads published videos"
  on public.videos for select
  using (is_published = true);

-- INSERT/UPDATE/DELETE は管理者のみ（service_role 経由）

-- =============================================================
--  video_watches: 視聴履歴。1ユーザー×1動画で1行（unique）
-- =============================================================
create table if not exists public.video_watches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  video_id        uuid not null references public.videos(id) on delete cascade,
  points_awarded  integer not null default 0,
  watched_at      timestamptz not null default now(),
  unique (user_id, video_id)
);

create index if not exists video_watches_user_idx
  on public.video_watches (user_id, watched_at desc);

alter table public.video_watches enable row level security;

drop policy if exists "Users select own watches" on public.video_watches;
create policy "Users select own watches"
  on public.video_watches for select
  using (auth.uid() = user_id);

-- INSERT は RPC 経由のみ

-- =============================================================
--  video_comments: 動画コメント
-- =============================================================
create table if not exists public.video_comments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  video_id        uuid not null references public.videos(id) on delete cascade,
  body            text not null
                    check (length(trim(body)) between 1 and 1000),
  points_awarded  integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists video_comments_video_idx
  on public.video_comments (video_id, created_at desc);

alter table public.video_comments enable row level security;

drop policy if exists "Anyone reads comments"        on public.video_comments;
drop policy if exists "Users insert own comments"    on public.video_comments;
drop policy if exists "Users update own comments"    on public.video_comments;
drop policy if exists "Users delete own comments"    on public.video_comments;

-- コメントはコミュニティ全員に可視
create policy "Anyone reads comments"
  on public.video_comments for select
  using (true);

-- 直接 INSERT は RPC 経由（ポイント付与と整合性のため）に統一するが、
-- ユーザーが自分のコメントを編集・削除できるようにポリシーは置く
create policy "Users update own comments"
  on public.video_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own comments"
  on public.video_comments for delete
  using (auth.uid() = user_id);

-- =============================================================
--  record_video_watch: 視聴を記録し、初回なら points_for_watch を付与
-- =============================================================
create or replace function public.record_video_watch(p_video_id uuid)
returns jsonb
language plpgsql security invoker as $$
declare
  v_uid      uuid := auth.uid();
  v_video    public.videos;
  v_existing public.video_watches;
  v_awarded  integer := 0;
  v_already  boolean := false;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select * into v_video from public.videos where id = p_video_id and is_published;
  if not found then raise exception '動画が見つかりませんでした'; end if;

  select * into v_existing
    from public.video_watches
    where user_id = v_uid and video_id = p_video_id;

  if found then
    v_already := true;
  else
    insert into public.video_watches (user_id, video_id, points_awarded)
    values (v_uid, p_video_id, v_video.points_for_watch);

    if v_video.points_for_watch > 0 then
      perform public.award_points(
        v_video.points_for_watch,
        'community'::public.point_category,
        '動画視聴：' || v_video.title,
        jsonb_build_object('video_id', p_video_id, 'kind', 'video_watch')
      );
      v_awarded := v_video.points_for_watch;
    end if;
  end if;

  return jsonb_build_object(
    'already_watched', v_already,
    'points_awarded',  v_awarded
  );
end$$;

comment on function public.record_video_watch is
  'ユーザーが動画を視聴済みとして記録。初回のみ points_for_watch を付与';

-- =============================================================
--  post_video_comment: コメントを投稿し、当該ユーザーの初コメントなら付与
-- =============================================================
create or replace function public.post_video_comment(
  p_video_id uuid,
  p_body     text
)
returns jsonb
language plpgsql security invoker as $$
declare
  v_uid           uuid := auth.uid();
  v_video         public.videos;
  v_count         integer;
  v_points        integer := 0;
  v_comment_id    uuid;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'コメントを入力してください';
  end if;
  if length(trim(p_body)) > 1000 then
    raise exception 'コメントは1000字以内です';
  end if;

  select * into v_video from public.videos where id = p_video_id and is_published;
  if not found then raise exception '動画が見つかりませんでした'; end if;

  -- このユーザーが当該動画に対して既にコメントしたか
  select count(*) into v_count
    from public.video_comments
    where user_id = v_uid and video_id = p_video_id;

  if v_count = 0 then
    v_points := v_video.points_for_first_comment;
  end if;

  insert into public.video_comments (user_id, video_id, body, points_awarded)
  values (v_uid, p_video_id, trim(p_body), v_points)
  returning id into v_comment_id;

  if v_points > 0 then
    perform public.award_points(
      v_points,
      'community'::public.point_category,
      'コメント投稿：' || v_video.title,
      jsonb_build_object(
        'video_id', p_video_id,
        'comment_id', v_comment_id,
        'kind', 'video_comment'
      )
    );
  end if;

  return jsonb_build_object(
    'comment_id',     v_comment_id,
    'points_awarded', v_points,
    'first_comment',  v_count = 0
  );
end$$;

comment on function public.post_video_comment is
  '動画コメントを投稿。ユーザーが当該動画への初コメントなら points_for_first_comment を付与';

-- =============================================================
--  デモ用シード（必要に応じて Studio で手動投入してください）
--  ※ youtube_id は YouTube URL の v= の値（11文字程度）
-- =============================================================
-- insert into public.videos (youtube_id, title, description, points_for_watch, points_for_first_comment, display_order)
-- values
--   ('dQw4w9WgXcQ', 'soilラボ入門：土とは何か', 'まず最初に見てほしい入門編', 20, 30, 10),
--   ('jNQXAC9IVRw', 'pH測定のコツ',           '3分で分かる簡単pH測定',     20, 30, 20);
