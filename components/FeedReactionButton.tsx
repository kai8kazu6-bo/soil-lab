"use client";

import { useState, useTransition } from "react";
import { Sprout } from "lucide-react";
import { toggleFeedReaction } from "@/app/actions";

type Props = {
  postId: string;
  initiallyReacted: boolean;
  initialCount: number;
  disabled?: boolean;
};

export default function FeedReactionButton({
  postId,
  initiallyReacted,
  initialCount,
  disabled = false,
}: Props) {
  const [reacted, setReacted] = useState(initiallyReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (disabled) {
      // モード：UI上だけ反映
      setReacted((r) => {
        const nr = !r;
        setCount((c) => c + (nr ? 1 : -1));
        return nr;
      });
      return;
    }
    // 楽観更新
    const nextReacted = !reacted;
    setReacted(nextReacted);
    setCount((c) => c + (nextReacted ? 1 : -1));
    startTransition(async () => {
      const res = await toggleFeedReaction(postId);
      if (!res.ok) {
        // 失敗したら戻す
        setReacted(!nextReacted);
        setCount((c) => c + (nextReacted ? -1 : 1));
      } else {
        // サーバー側の最終状態に合わせる
        setReacted(res.reacted);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={reacted}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 " +
        (reacted
          ? "border-forest bg-forest/10 text-forest"
          : "border-brown/20 bg-transparent text-brown-500 hover:border-forest/50 hover:text-forest")
      }
    >
      <Sprout
        size={13}
        strokeWidth={reacted ? 2.5 : 2}
        className={reacted ? "fill-forest/30" : ""}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
