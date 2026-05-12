// フィード投稿に添付されたメディアの表示。
// 1枚 → 大きく / 2〜4枚 → グリッド / 動画 → 再生可。

import type { FeedMediaItem } from "@/lib/feed";

type Props = {
  media: FeedMediaItem[];
};

export default function FeedMediaGallery({ media }: Props) {
  if (media.length === 0) return null;

  if (media.length === 1) {
    const m = media[0];
    return (
      <div className="overflow-hidden rounded-organic border border-beige-200 bg-beige-50">
        {m.kind === "image" ? (
          <img
            src={m.public_url}
            alt=""
            className="h-auto max-h-[420px] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <video
            src={m.public_url}
            controls
            playsInline
            preload="metadata"
            className="h-auto max-h-[420px] w-full"
          />
        )}
      </div>
    );
  }

  const cols = media.length === 2 ? "grid-cols-2" : "grid-cols-2";

  return (
    <div className={`grid gap-1.5 ${cols}`}>
      {media.map((m) => (
        <div
          key={m.id}
          className="relative aspect-square overflow-hidden rounded-organic border border-beige-200 bg-beige-50"
        >
          {m.kind === "image" ? (
            <img
              src={m.public_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <video
              src={m.public_url}
              controls
              playsInline
              preload="metadata"
              muted
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}
