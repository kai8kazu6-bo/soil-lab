// Client/Server 両方から安全に import できる、フィード関連の定数と型。
// （ここに置くファイルは next/headers などのサーバー専用APIを参照しないこと）

export const FEED_BUCKET = "feed-media";
export const FEED_MAX_FILES = 4;
export const FEED_MAX_BYTES_PER_FILE = 50 * 1024 * 1024;
export const FEED_BODY_MAX = 4000;
export const FEED_COMMENT_MAX = 1000;

export const FEED_ACCEPT_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type FeedMediaKind = "image" | "video";

export function mimeToKind(mime: string): FeedMediaKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}
