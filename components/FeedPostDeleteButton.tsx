"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteFeedPost } from "@/app/actions";

type Props = {
  postId: string;
  demoMode?: boolean;
};

export default function FeedPostDeleteButton({
  postId,
  demoMode = false,
}: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (demoMode) return;
    if (!confirm("この投稿を削除しますか？")) return;
    startTransition(async () => {
      await deleteFeedPost(postId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="削除"
      className="flex h-7 w-7 items-center justify-center rounded-full text-brown-500 hover:bg-brown/5 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}
