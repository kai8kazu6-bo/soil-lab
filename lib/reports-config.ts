// Client/Server 両方から安全に import できる、reports 関連の定数。
// （ここに置くファイルは next/headers などのサーバー専用APIを参照しないこと）

export const REPORT_BUCKET = "reports";
export const REPORT_MAX_BYTES = 20 * 1024 * 1024;
export const REPORT_ACCEPT_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
] as const;
