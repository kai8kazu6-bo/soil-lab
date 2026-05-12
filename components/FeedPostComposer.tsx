"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import { createFeedPost } from "@/app/actions";
import {
  FEED_ACCEPT_MIME,
  FEED_BODY_MAX,
  FEED_MAX_BYTES_PER_FILE,
  FEED_MAX_FILES,
  mimeToKind,
} from "@/lib/feed-config";

type Props = {
  disabled?: boolean;
};

const ACCEPT = FEED_ACCEPT_MIME.join(",");

type Picked = {
  file: File;
  previewUrl: string;
  kind: "image" | "video";
};

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function FeedPostComposer({ disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    setSuccess(null);
    const incoming = Array.from(list);
    const next: Picked[] = [...picked];
    for (const f of incoming) {
      if (next.length >= FEED_MAX_FILES) {
        setError(`添付は${FEED_MAX_FILES}ファイルまでです`);
        break;
      }
      const kind = mimeToKind(f.type);
      if (!kind) {
        setError(`${f.name} は対応していない形式です`);
        continue;
      }
      if (f.size > FEED_MAX_BYTES_PER_FILE) {
        setError(`${f.name} は50MBを超えています`);
        continue;
      }
      next.push({ file: f, previewUrl: URL.createObjectURL(f), kind });
    }
    setPicked(next);
  }

  function removeAt(i: number) {
    setPicked((arr) => {
      const target = arr[i];
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = arr.slice();
      next.splice(i, 1);
      return next;
    });
  }

  async function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    if (text.trim().length === 0 && picked.length === 0) {
      setError("テキストまたはメディアを追加してください");
      return;
    }

    if (disabled) {
      setSuccess("投稿しました（デモ表示。実際は保存されていません）");
      setText("");
      picked.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPicked([]);
      formRef.current?.reset();
      return;
    }

    formData.set("body", text);
    formData.delete("files");
    picked.forEach(({ file }) => formData.append("files", file));

    startTransition(async () => {
      const res = await createFeedPost(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess("投稿しました");
      setText("");
      picked.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPicked([]);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="card p-4"
      aria-label="フィードに投稿"
    >
      <p className="text-xs font-medium tracking-wide text-brown-500">
        いま、土とどんな時間ですか？
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={FEED_BODY_MAX}
        placeholder="今日の気づき、写真、ちょっとした疑問など"
        disabled={disabled || pending}
        className="mt-2 w-full resize-none rounded-organic border border-beige-200 bg-white/80 px-3 py-2 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
      />

      {/* メディアプレビュー */}
      {picked.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {picked.map((p, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-organic border border-beige-200 bg-beige-50"
            >
              {p.kind === "image" ? (
                <img
                  src={p.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={p.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                />
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="削除"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brown/85 text-beige-50 hover:bg-brown"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-brown/70 px-1.5 py-0.5 text-[10px] font-medium text-beige-50">
                {p.kind === "image" ? "画像" : "動画"} · {fmtSize(p.file.size)}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-organic bg-brown/5 px-3 py-2 text-xs text-brown">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 inline-flex items-center rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
          {success}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || pending || picked.length >= FEED_MAX_FILES}
          className="inline-flex items-center gap-1.5 rounded-full border border-brown/20 bg-transparent px-3 py-1.5 text-xs font-medium text-brown hover:bg-brown/5 disabled:opacity-50"
        >
          <ImageIcon size={14} />
          写真・動画
          <span className="text-[10px] text-brown-500">
            {picked.length}/{FEED_MAX_FILES}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-brown-500">
            {text.length}/{FEED_BODY_MAX}
          </span>
          <button
            type="submit"
            disabled={pending || (text.trim().length === 0 && picked.length === 0)}
            className="btn-accent inline-flex items-center gap-1.5 px-4 py-1.5 text-xs disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                投稿中…
              </>
            ) : (
              <>
                <Send size={12} />
                投稿する
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
