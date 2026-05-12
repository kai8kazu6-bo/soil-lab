import ReuseBadge from "./ReuseBadge";
import type { VideoCommentWithAuthor } from "@/lib/videos";

type Props = {
  comments: VideoCommentWithAuthor[];
};

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

function authorName(c: VideoCommentWithAuthor) {
  return c.author_display_name ?? (c.author_handle ? `@${c.author_handle}` : "（不明）");
}

export default function VideoCommentList({ comments }: Props) {
  if (comments.length === 0) {
    return (
      <p className="rounded-organic border border-dashed border-beige-300 bg-beige-50/50 px-3 py-4 text-center text-xs text-brown-500">
        まだコメントはありません。最初のひとことを書いてみませんか？
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {comments.map((c) => (
        <li
          key={c.id}
          className="rounded-organic border border-beige-200 bg-white/70 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-brown">
              <span className="truncate">{authorName(c)}</span>
              {c.author_reuse && <ReuseBadge size="xs" />}
            </p>
            <span className="shrink-0 text-[10px] text-brown-500">
              {formatRelative(c.created_at)}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-brown">
            {c.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
