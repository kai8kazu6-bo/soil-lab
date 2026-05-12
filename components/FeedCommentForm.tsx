"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { createFeedComment } from "@/app/actions";
import { FEED_COMMENT_MAX } from "@/lib/feed-config";

type Props = {
  postId: string;
  disabled?: boolean;
};

export default function FeedCommentForm({ postId, disabled = false }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    if (text.trim().length === 0) return;
    if (disabled) {
      setText("");
      formRef.current?.reset();
      return;
    }
    formData.set("post_id", postId);
    formData.set("body", text);
    startTransition(async () => {
      const res = await createFeedComment(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="flex items-end gap-2 rounded-organic border border-beige-200 bg-white/70 px-2.5 py-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        maxLength={FEED_COMMENT_MAX}
        placeholder="返信を書く…"
        disabled={disabled || pending}
        className="min-h-[28px] flex-1 resize-none bg-transparent text-sm text-brown placeholder:text-brown-200 focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={pending || text.trim().length === 0}
        aria-label="送信"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-beige-50 hover:bg-forest-400 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Send size={12} />
        )}
      </button>
      {error && (
        <p className="absolute -mb-6 text-[11px] text-brown">{error}</p>
      )}
    </form>
  );
}
