// フィード一覧取得ロジック。
// Supabase 未設定時はモックでUIプレビューが動くようフォールバック。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import { FEED_BUCKET } from "./feed-config";
import type {
  FeedCommentRow,
  FeedPostMediaRow,
  FeedPostRow,
} from "./supabase/types";

export type FeedAuthor = {
  id: string;
  handle: string | null;
  display_name: string | null;
  reuse: boolean;
};

export type FeedMediaItem = FeedPostMediaRow & {
  /** Storageの公開URL */
  public_url: string;
};

export type FeedCommentWithAuthor = FeedCommentRow & {
  author: FeedAuthor;
};

export type FeedPostWithDetails = FeedPostRow & {
  author: FeedAuthor;
  media: FeedMediaItem[];
  reaction_count: number;
  /** ログイン中ユーザーが既にリアクション済みか */
  reacted_by_me: boolean;
  comments: FeedCommentWithAuthor[];
  comment_count: number;
};

export type FeedPageData = {
  posts: FeedPostWithDetails[];
  isMock: boolean;
  isAnonymous: boolean;
  /** 現在ユーザー（投稿フォームを出すかどうかの判定に使う） */
  currentUserId: string | null;
};

// =============================================================
//  モック
// =============================================================
const MOCK: FeedPageData = {
  posts: [
    {
      id: "demo-p1",
      author_id: "u-mori",
      body: "朝の畑、霜が降りた後の土の色がとても綺麗でした。pH測定の結果はバランス良好。みんな今年もよろしくお願いします🌱",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      author: {
        id: "u-mori",
        handle: "mori_soil",
        display_name: "もりの土",
        reuse: true,
      },
      media: [
        {
          id: "demo-m1",
          post_id: "demo-p1",
          storage_path: "demo/sample1.jpg",
          mime_type: "image/jpeg",
          kind: "image",
          display_order: 0,
          created_at: new Date().toISOString(),
          public_url:
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
        },
      ],
      reaction_count: 5,
      reacted_by_me: true,
      comments: [
        {
          id: "demo-c1",
          post_id: "demo-p1",
          author_id: "u-aki",
          body: "霜の朝の土、湿り気と冷たさが独特ですよね。今年もよろしくお願いします！",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          author: {
            id: "u-aki",
            handle: "aki_farm",
            display_name: "あきの畑",
            reuse: false,
          },
        },
      ],
      comment_count: 1,
    },
    {
      id: "demo-p2",
      author_id: "u-aki",
      body: "ミミズ大量発生してます、地力上がっているサインかな🪱 微生物スコアも先月より上がりました！",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      author: {
        id: "u-aki",
        handle: "aki_farm",
        display_name: "あきの畑",
        reuse: false,
      },
      media: [],
      reaction_count: 2,
      reacted_by_me: false,
      comments: [],
      comment_count: 0,
    },
  ],
  isMock: true,
  isAnonymous: false,
  currentUserId: "demo-me",
};

// =============================================================
//  本実装
// =============================================================
export async function getFeedPageData(): Promise<FeedPageData> {
  if (!isSupabaseConfigured()) return MOCK;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 投稿（最新50件）
  const { data: postRows } = await supabase
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!postRows || postRows.length === 0) {
    return {
      posts: [],
      isMock: false,
      isAnonymous: !user,
      currentUserId: user?.id ?? null,
    };
  }

  const postIds = postRows.map((p) => p.id);
  const authorIds = Array.from(new Set(postRows.map((p) => p.author_id)));

  // メディア
  const { data: mediaRows } = await supabase
    .from("feed_post_media")
    .select("*")
    .in("post_id", postIds)
    .order("display_order", { ascending: true });

  // メディアの公開URLを Storage SDK で生成
  const mediaByPost = new Map<string, FeedMediaItem[]>();
  for (const m of mediaRows ?? []) {
    const { data: pub } = supabase.storage.from(FEED_BUCKET).getPublicUrl(m.storage_path);
    const arr = mediaByPost.get(m.post_id) ?? [];
    arr.push({ ...m, public_url: pub.publicUrl });
    mediaByPost.set(m.post_id, arr);
  }

  // リアクション集計
  const { data: reactionRows } = await supabase
    .from("feed_reactions")
    .select("post_id, user_id")
    .in("post_id", postIds);

  const reactionCount = new Map<string, number>();
  const reactedByMe = new Set<string>();
  for (const r of reactionRows ?? []) {
    reactionCount.set(r.post_id, (reactionCount.get(r.post_id) ?? 0) + 1);
    if (user && r.user_id === user.id) reactedByMe.add(r.post_id);
  }

  // コメント（各投稿の直近5件＋総数）
  const { data: commentRows } = await supabase
    .from("feed_comments")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });

  const commentCount = new Map<string, number>();
  const commentsByPost = new Map<string, FeedCommentRow[]>();
  for (const c of commentRows ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
    if (!commentsByPost.has(c.post_id)) commentsByPost.set(c.post_id, []);
    commentsByPost.get(c.post_id)!.push(c);
    authorIds.push(c.author_id);
  }

  // 著者プロフィール
  const uniqueAuthorIds = Array.from(new Set(authorIds));
  const profiles =
    uniqueAuthorIds.length > 0
      ? (
          await supabase
            .from("profiles")
            .select("id, handle, display_name, reuse_agreement")
            .in("id", uniqueAuthorIds)
        ).data ?? []
      : [];
  const pmap = new Map(profiles.map((p) => [p.id, p]));

  function toAuthor(id: string): FeedAuthor {
    const p = pmap.get(id);
    return {
      id,
      handle: p?.handle ?? null,
      display_name: p?.display_name ?? null,
      reuse: Boolean(p?.reuse_agreement),
    };
  }

  const posts: FeedPostWithDetails[] = postRows.map((p) => {
    const allComments = commentsByPost.get(p.id) ?? [];
    // 投稿一覧では新しい順 → 表示順は古いものを上に並べたほうが読みやすいので reverse
    const visibleComments = allComments.slice(0, 5).reverse();
    return {
      ...p,
      author: toAuthor(p.author_id),
      media: mediaByPost.get(p.id) ?? [],
      reaction_count: reactionCount.get(p.id) ?? 0,
      reacted_by_me: reactedByMe.has(p.id),
      comments: visibleComments.map((c) => ({
        ...c,
        author: toAuthor(c.author_id),
      })),
      comment_count: commentCount.get(p.id) ?? 0,
    };
  });

  return {
    posts,
    isMock: false,
    isAnonymous: !user,
    currentUserId: user?.id ?? null,
  };
}
