// 動画一覧の取得ロジック。
// Supabase 未設定時はモックでUIプレビューが動くようにフォールバック。

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type {
  VideoCommentRow,
  VideoRow,
} from "./supabase/types";

export type VideoCommentWithAuthor = VideoCommentRow & {
  author_handle: string | null;
  author_display_name: string | null;
  author_reuse: boolean;
};

export type VideoWithProgress = VideoRow & {
  /** 自分が視聴済みか */
  watched: boolean;
  /** 自分が既にコメントしているか（次のコメントでポイントが付かない） */
  commented: boolean;
  /** コメント一覧（新しい順、最大20件） */
  comments: VideoCommentWithAuthor[];
};

export type VideosPageData = {
  videos: VideoWithProgress[];
  isMock: boolean;
  isAnonymous: boolean;
};

// =============================================================
//  モックデータ（Supabase 未設定時のプレビュー）
// =============================================================
const MOCK: VideosPageData = {
  videos: [
    {
      id: "demo-v1",
      youtube_id: "dQw4w9WgXcQ",
      title: "soilラボ入門：土とは何か",
      description:
        "まず最初に見てほしい入門編です。土の成り立ち、なぜ分析が必要かを5分で。",
      thumbnail_url: null,
      points_for_watch: 20,
      points_for_first_comment: 30,
      is_published: true,
      display_order: 10,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      watched: false,
      commented: false,
      comments: [
        {
          id: "demo-c1",
          user_id: "u-mori",
          video_id: "demo-v1",
          body: "とても分かりやすかったです！土のpH、もっと意識してみます。",
          points_awarded: 30,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          author_handle: "mori_soil",
          author_display_name: "もりの土",
          author_reuse: true,
        },
      ],
    },
    {
      id: "demo-v2",
      youtube_id: "jNQXAC9IVRw",
      title: "pH測定のコツ",
      description: "3分で分かる簡単pH測定。ご家庭でも安全にできます。",
      thumbnail_url: null,
      points_for_watch: 20,
      points_for_first_comment: 30,
      is_published: true,
      display_order: 20,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      watched: true,
      commented: false,
      comments: [],
    },
  ],
  isMock: true,
  isAnonymous: false,
};

export async function getVideosPageData(): Promise<VideosPageData> {
  if (!isSupabaseConfigured()) return MOCK;

  const supabase = createClient();

  // 動画一覧（公開中のみ、display_order昇順）
  const { data: videoRows } = await supabase
    .from("videos")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!videoRows || videoRows.length === 0) {
    return { videos: [], isMock: false, isAnonymous: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAnonymous = !user;

  const videoIds = videoRows.map((v) => v.id);

  // 自分の視聴済みID
  const watchedIds = new Set<string>();
  if (user) {
    const { data: watches } = await supabase
      .from("video_watches")
      .select("video_id")
      .eq("user_id", user.id)
      .in("video_id", videoIds);
    (watches ?? []).forEach((w) => watchedIds.add(w.video_id));
  }

  // 自分が既にコメントした動画ID
  const commentedIds = new Set<string>();
  if (user) {
    const { data: myComments } = await supabase
      .from("video_comments")
      .select("video_id")
      .eq("user_id", user.id)
      .in("video_id", videoIds);
    (myComments ?? []).forEach((c) => commentedIds.add(c.video_id));
  }

  // 各動画の最新コメント20件
  const { data: allComments } = await supabase
    .from("video_comments")
    .select("*")
    .in("video_id", videoIds)
    .order("created_at", { ascending: false })
    .limit(200);

  // コメント著者のプロフィールをまとめて取得
  const authorIds = Array.from(
    new Set((allComments ?? []).map((c) => c.user_id))
  );
  const profiles =
    authorIds.length > 0
      ? (
          await supabase
            .from("profiles")
            .select("id, handle, display_name, reuse_agreement")
            .in("id", authorIds)
        ).data ?? []
      : [];
  const pmap = new Map(profiles.map((p) => [p.id, p]));

  const commentsByVideo = new Map<string, VideoCommentWithAuthor[]>();
  for (const c of allComments ?? []) {
    const arr = commentsByVideo.get(c.video_id) ?? [];
    const prof = pmap.get(c.user_id);
    arr.push({
      ...c,
      author_handle: prof?.handle ?? null,
      author_display_name: prof?.display_name ?? null,
      author_reuse: Boolean(prof?.reuse_agreement),
    });
    commentsByVideo.set(c.video_id, arr);
  }

  return {
    videos: videoRows.map((v) => ({
      ...v,
      watched: watchedIds.has(v.id),
      commented: commentedIds.has(v.id),
      comments: (commentsByVideo.get(v.id) ?? []).slice(0, 20),
    })),
    isMock: false,
    isAnonymous,
  };
}
