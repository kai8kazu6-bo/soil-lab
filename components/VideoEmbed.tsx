// YouTube の限定公開（Unlisted）動画を埋め込む iframe ラッパー。
// 16:9 のレスポンシブで、角丸とブラウン枠でデザイントーンに馴染ませる。

type Props = {
  youtubeId: string;
  title: string;
};

export default function VideoEmbed({ youtubeId, title }: Props) {
  // rel=0 で関連動画を同チャンネル内に限定、modestbranding でYouTubeロゴ最小化
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    youtubeId
  )}?rel=0&modestbranding=1`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-organic border border-beige-200 bg-brown/90"
      style={{ aspectRatio: "16 / 9" }}
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
