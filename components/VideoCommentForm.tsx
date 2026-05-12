"use client";

import { useRef, useState, useTransition } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { postVideoComment } from "@/app/actions";

type Props = {
  videoId: string;
  /** ユーザーが当該動画に対し既にコメント済みか（true ならコメントしても付与なし） */
  alreadyCommented: boolean;
  pointsForFirstComment: number;
  disabled?: boolean;
};

export default function VideoCommentForm({
  videoId,
  alreadyCommented,
  pointsForFirstComment,
  disabled = false,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    if (disabled) {
      // モック動作
      setSuccess(
        alreadyCommented
          ? "コメントを送信しました（デモ）"
          : `+${pointsForFirstComment}pt 獲得（デモ）`
      );
      setText("");
      formRef.current?.reset();
      return;
    }

    formData.set("video_id", videoId);
    formData.set("body", text);
    startTransition(async () => {
      const res = await postVideoComment(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.firstComment && res.pointsAwarded > 0) {
        setSuccess(`+${res.pointsAwarded}pt 獲得`);
      } else {
        setSuccess("コメントを送信しました");
      }
      setText("");
      formRef.current?.reset();
    });
  }

  const willAward = !alreadyCommented;

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="rounded-organic border border-beige-200 bg-white/70 p-3"
    >
      <label
        htmlFor={`comment-${videoId}`}
        className="text-[11px] font-medium text-brown-500"
      >
        コメントを投稿
        {willAward && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest">
            <Sparkles size={9} />
            初回 +{pointsForFirstComment}pt
          </span>
        )}
      </label>
      <textarea
        id={`comment-${videoId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="気づいたこと、学んだことを書きましょう"
        disabled={disabled || pending}
        className="mt-1.5 w-full resize-none rounded-organic border border-beige-200 bg-white px-3 py-2 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
      />

      {error && (
        <p className="mt-2 rounded-organic bg-brown/5 px-2.5 py-1.5 text-[11px] text-brown">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-medium text-forest">
          <Sparkles size={11} />
          {success}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-brown-500">{text.length}/1000</span>
        <button
          type="submit"
          disabled={pending || text.trim().length === 0}
          className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              送信中
            </>
          ) : (
            <>
              <Send size={12} />
              送信
            </>
          )}
        </button>
      </div>
    </form>
  );
}
