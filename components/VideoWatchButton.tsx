"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Sparkles, Play } from "lucide-react";
import { recordVideoWatch } from "@/app/actions";

type Props = {
  videoId: string;
  /** すでに視聴済みフラグ（初期値） */
  initiallyWatched: boolean;
  pointsForWatch: number;
  disabled?: boolean;
};

export default function VideoWatchButton({
  videoId,
  initiallyWatched,
  pointsForWatch,
  disabled = false,
}: Props) {
  const [watched, setWatched] = useState(initiallyWatched);
  const [justAwarded, setJustAwarded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    setError(null);
    if (disabled) {
      // モック動作：UI上だけ反映
      setWatched(true);
      setJustAwarded(pointsForWatch);
      return;
    }
    startTransition(async () => {
      const res = await recordVideoWatch(videoId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setWatched(true);
      if (!res.alreadyWatched) setJustAwarded(res.pointsAwarded);
    });
  }

  if (watched) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest">
        <CheckCircle2 size={14} />
        視聴済み
        {justAwarded != null && justAwarded > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-[10px] font-semibold text-beige-50">
            <Sparkles size={10} />
            +{justAwarded}pt 獲得
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn-accent inline-flex items-center gap-1.5 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            記録中…
          </>
        ) : (
          <>
            <Play size={14} />
            視聴済みにする（+{pointsForWatch}pt）
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-brown">{error}</p>}
    </div>
  );
}
