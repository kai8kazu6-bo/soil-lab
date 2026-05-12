import ReuseBadge from "./ReuseBadge";
import type { FeedCommentWithAuthor } from "@/lib/feed";

type Props = {
  comments: FeedCommentWithAuthor[];
  /** 隠れているコメントの数（totalCount - comments.length） */
  hiddenCount?: number;
};

function authorName(c: FeedCommentWithAuthor) {
  return (
    c.author.display_name ??
    (c.author.handle ? `@${c.author.handle}` : "（匿名）")
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
    month: "short",
    day: "numeric",
  });
}

export default function FeedCommentList({ comments, hiddenCount = 0 }: Props) {
  if (comments.length === 0 && hiddenCount === 0) return null;

  return (
    <div className="space-y-2">
      {hiddenCount > 0 && (
        <p className="text-[11px] text-brown-500">
          ほかに {hiddenCount} 件のコメントがあります
        </p>
      )}
      {comments.map((c) => (
        <div
          key={c.id}
          className="rounded-organic bg-beige-50/70 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-brown">
              <span className="truncate">{authorName(c)}</span>
              {c.author.reuse && <ReuseBadge size="xs" />}
            </p>
            <span className="shrink-0 text-[10px] text-brown-500">
              {formatRelative(c.created_at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-brown">
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}
