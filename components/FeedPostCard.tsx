import { MessageCircle, MoreHorizontal } from "lucide-react";
import ReuseBadge from "./ReuseBadge";
import FeedMediaGallery from "./FeedMediaGallery";
import FeedReactionButton from "./FeedReactionButton";
import FeedCommentList from "./FeedCommentList";
import FeedCommentForm from "./FeedCommentForm";
import FeedPostDeleteButton from "./FeedPostDeleteButton";
import type { FeedPostWithDetails } from "@/lib/feed";

type Props = {
  post: FeedPostWithDetails;
  /** 現在ユーザーID（null = 未ログイン or デモ） */
  currentUserId: string | null;
  /** デモモード（Supabase未接続 or 未ログイン） */
  demoMode: boolean;
};

function authorName(post: FeedPostWithDetails) {
  return (
    post.author.display_name ??
    (post.author.handle ? `@${post.author.handle}` : "（匿名）")
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FeedPostCard({ post, currentUserId, demoMode }: Props) {
  const isOwn = currentUserId === post.author_id;
  const hiddenComments = Math.max(0, post.comment_count - post.comments.length);

  return (
    <article className="card p-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/15 text-forest font-semibold">
            {(post.author.display_name ?? post.author.handle ?? "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brown">
              <span className="truncate">{authorName(post)}</span>
              {post.author.reuse && <ReuseBadge size="xs" />}
            </p>
            <p className="text-[11px] text-brown-500">
              {formatRelative(post.created_at)}
            </p>
          </div>
        </div>
        {isOwn && (
          <FeedPostDeleteButton postId={post.id} demoMode={demoMode} />
        )}
        {!isOwn && (
          <button
            type="button"
            aria-label="その他"
            className="flex h-7 w-7 items-center justify-center rounded-full text-brown-500 hover:bg-brown/5"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>

      {/* 本文 */}
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-brown">
        {post.body}
      </p>

      {/* メディア */}
      {post.media.length > 0 && (
        <div className="mt-3">
          <FeedMediaGallery media={post.media} />
        </div>
      )}

      {/* アクション行 */}
      <div className="mt-3 flex items-center gap-2">
        <FeedReactionButton
          postId={post.id}
          initiallyReacted={post.reacted_by_me}
          initialCount={post.reaction_count}
          disabled={demoMode}
        />
        <span className="inline-flex items-center gap-1 rounded-full border border-brown/20 bg-transparent px-2.5 py-1 text-xs font-medium text-brown-500">
          <MessageCircle size={13} />
          {post.comment_count}
        </span>
      </div>

      {/* コメント */}
      {(post.comments.length > 0 || hiddenComments > 0) && (
        <div className="mt-3 border-t border-beige-200 pt-3">
          <FeedCommentList comments={post.comments} hiddenCount={hiddenComments} />
        </div>
      )}

      {/* コメント投稿 */}
      <div className="mt-3">
        <FeedCommentForm postId={post.id} disabled={demoMode} />
      </div>
    </article>
  );
}
