-- =============================================================
--  soilラボ フィード機能（写真・動画つきタイムライン）
--
--  - feed_posts: 投稿本体（テキスト）
--  - feed_post_media: 1投稿に複数添付できる画像/動画メタ
--  - feed_reactions: 「Sprout（応援）」リアクション
--  - feed_comments: 投稿へのコメント
--  - Storage: feed-media バケット（公開、合計50MB/ファイル）
-- =============================================================

-- =============================================================
--  Storage Bucket: feed-media（コミュニティ可視のためpublic）
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-media',
  'feed-media',
  true,
  50 * 1024 * 1024,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
  set public              = excluded.public,
      file_size_limit     = excluded.file_size_limit,
      allowed_mime_types  = excluded.allowed_mime_types;

drop policy if exists "Anyone reads feed media"        on storage.objects;
drop policy if exists "Users upload own feed media"    on storage.objects;
drop policy if exists "Users update own feed media"    on storage.objects;
drop policy if exists "Users delete own feed media"    on storage.objects;

-- public バケットは誰でもオブジェクトURLを取得可能だが、明示的にも policy を置く
create policy "Anyone reads feed media"
  on storage.objects for select
  using (bucket_id = 'feed-media');

create policy "Users upload own feed media"
  on storage.objects for insert
  with check (
    bucket_id = 'feed-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own feed media"
  on storage.objects for update
  using (
    bucket_id = 'feed-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'feed-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own feed media"
  on storage.objects for delete
  using (
    bucket_id = 'feed-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================
--  feed_posts
-- =============================================================
create table if not exists public.feed_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references auth.users(id) on delete cascade,
  body         text not null
                 check (length(trim(body)) between 1 and 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists feed_posts_created_idx on public.feed_posts (created_at desc);
create index if not exists feed_posts_author_idx  on public.feed_posts (author_id, created_at desc);

drop trigger if exists feed_posts_touch_updated_at on public.feed_posts;
create trigger feed_posts_touch_updated_at
  before update on public.feed_posts
  for each row execute function public.touch_updated_at();

alter table public.feed_posts enable row level security;

drop policy if exists "Anyone reads posts"      on public.feed_posts;
drop policy if exists "Users insert own posts"  on public.feed_posts;
drop policy if exists "Users update own posts"  on public.feed_posts;
drop policy if exists "Users delete own posts"  on public.feed_posts;

create policy "Anyone reads posts"
  on public.feed_posts for select using (true);

create policy "Users insert own posts"
  on public.feed_posts for insert
  with check (auth.uid() = author_id);

create policy "Users update own posts"
  on public.feed_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Users delete own posts"
  on public.feed_posts for delete
  using (auth.uid() = author_id);

-- =============================================================
--  feed_post_media
-- =============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'feed_media_kind') then
    create type public.feed_media_kind as enum ('image', 'video');
  end if;
end$$;

create table if not exists public.feed_post_media (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.feed_posts(id) on delete cascade,
  storage_path    text not null,
  mime_type       text not null,
  kind            public.feed_media_kind not null,
  display_order   int  not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists feed_post_media_post_idx
  on public.feed_post_media (post_id, display_order);

alter table public.feed_post_media enable row level security;

drop policy if exists "Anyone reads post media"            on public.feed_post_media;
drop policy if exists "Users insert media for own posts"   on public.feed_post_media;
drop policy if exists "Users delete media for own posts"   on public.feed_post_media;

create policy "Anyone reads post media"
  on public.feed_post_media for select using (true);

create policy "Users insert media for own posts"
  on public.feed_post_media for insert
  with check (
    exists (
      select 1 from public.feed_posts
        where id = post_id and author_id = auth.uid()
    )
  );

create policy "Users delete media for own posts"
  on public.feed_post_media for delete
  using (
    exists (
      select 1 from public.feed_posts
        where id = post_id and author_id = auth.uid()
    )
  );

-- =============================================================
--  feed_reactions（1ユーザー×1投稿×1種類で unique）
-- =============================================================
create table if not exists public.feed_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.feed_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'sprout',
  created_at  timestamptz not null default now(),
  unique (post_id, user_id, kind)
);

create index if not exists feed_reactions_post_idx on public.feed_reactions (post_id);

alter table public.feed_reactions enable row level security;

drop policy if exists "Anyone reads reactions"     on public.feed_reactions;
drop policy if exists "Users insert own reactions" on public.feed_reactions;
drop policy if exists "Users delete own reactions" on public.feed_reactions;

create policy "Anyone reads reactions"
  on public.feed_reactions for select using (true);

create policy "Users insert own reactions"
  on public.feed_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users delete own reactions"
  on public.feed_reactions for delete
  using (auth.uid() = user_id);

-- =============================================================
--  feed_comments
-- =============================================================
create table if not exists public.feed_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.feed_posts(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null
                check (length(trim(body)) between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists feed_comments_post_idx
  on public.feed_comments (post_id, created_at desc);

drop trigger if exists feed_comments_touch_updated_at on public.feed_comments;
create trigger feed_comments_touch_updated_at
  before update on public.feed_comments
  for each row execute function public.touch_updated_at();

alter table public.feed_comments enable row level security;

drop policy if exists "Anyone reads feed comments"        on public.feed_comments;
drop policy if exists "Users insert own feed comments"    on public.feed_comments;
drop policy if exists "Users update own feed comments"    on public.feed_comments;
drop policy if exists "Users delete own feed comments"    on public.feed_comments;

create policy "Anyone reads feed comments"
  on public.feed_comments for select using (true);

create policy "Users insert own feed comments"
  on public.feed_comments for insert
  with check (auth.uid() = author_id);

create policy "Users update own feed comments"
  on public.feed_comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Users delete own feed comments"
  on public.feed_comments for delete
  using (auth.uid() = author_id);
