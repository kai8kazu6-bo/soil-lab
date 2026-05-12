import VideoEmbed from "./VideoEmbed";
import VideoWatchButton from "./VideoWatchButton";
import VideoCommentForm from "./VideoCommentForm";
import VideoCommentList from "./VideoCommentList";
import { MessageCircle, PlayCircle } from "lucide-react";
import type { VideoWithProgress } from "@/lib/videos";

type Props = {
  video: VideoWithProgress;
  /** Supabase未設定または未ログインの場合 true（UI上だけ反映するモード） */
  demoMode?: boolean;
};

export default function VideoCard({ video, demoMode = false }: Props) {
  return (
    <article className="card overflow-hidden p-4">
      {/* タイトル */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug text-brown">
            {video.title}
          </h2>
          {video.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-brown-500">
              {video.description}
            </p>
          )}
        </div>
      </div>

      {/* 埋め込み */}
      <div className="mt-3">
        <VideoEmbed youtubeId={video.youtube_id} title={video.title} />
      </div>

      {/* 視聴アクション */}
      <div className="mt-3 flex items-center justify-between">
        <VideoWatchButton
          videoId={video.id}
          initiallyWatched={video.watched}
          pointsForWatch={video.points_for_watch}
          disabled={demoMode}
        />
        <div className="flex items-center gap-3 text-[11px] text-brown-500">
          <span className="inline-flex items-center gap-1">
            <PlayCircle size={12} />
            視聴 +{video.points_for_watch}pt
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={12} />
            コメント +{video.points_for_first_comment}pt
          </span>
        </div>
      </div>

      {/* コメントセクション */}
      <div className="mt-4 space-y-3 border-t border-beige-200 pt-4">
        <p className="text-xs font-medium tracking-wide text-brown-500">
          みんなのコメント（{video.comments.length}件）
        </p>
        <VideoCommentList comments={video.comments} />
        <VideoCommentForm
          videoId={video.id}
          alreadyCommented={video.commented}
          pointsForFirstComment={video.points_for_first_comment}
          disabled={demoMode}
        />
      </div>
    </article>
  );
}
