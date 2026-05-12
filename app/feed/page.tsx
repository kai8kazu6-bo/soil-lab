import { MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import FeedPostComposer from "@/components/FeedPostComposer";
import FeedPostCard from "@/components/FeedPostCard";
import { getFeedPageData } from "@/lib/feed";
import { getCurrentProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const [{ posts, isMock, isAnonymous, currentUserId }, prof] = await Promise.all([
    getFeedPageData(),
    getCurrentProfile(),
  ]);
  const userName = prof.profile?.display_name ?? "鏡沼さん";
  const reuseDeclared = prof.profile?.reuse_agreement ?? false;
  const demoMode = isMock || isAnonymous;

  return (
    <main className="relative z-10 px-5 pt-6">
      <Header userName={userName} reuseAgreement={reuseDeclared} />

      <div className="mt-6">
        <p className="text-xs font-medium text-forest">フィード</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-brown">
          ラボの仲間と分かち合う
        </h1>
        <p className="mt-1 text-sm text-brown-500">
          畑の写真、気づき、ちょっとした疑問など。気軽にどうぞ。
        </p>
      </div>

      {(isMock || isAnonymous) && (
        <div className="mt-4 rounded-organic border border-beige-200 bg-white/60 px-4 py-3 text-xs text-brown-500">
          {isMock
            ? "Supabase未接続のためデモ投稿を表示中。ボタンはUI上のみ動作します。"
            : "ログインすると、投稿・コメント・リアクションができます。"}
        </div>
      )}

      <section className="mt-5 space-y-5">
        <FeedPostComposer disabled={demoMode} />

        {posts.length === 0 ? (
          <div className="rounded-organic border border-dashed border-beige-300 bg-beige-50/50 px-4 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-forest">
              <MessageCircle size={22} />
            </span>
            <p className="mt-3 text-sm font-medium text-brown">
              まだ投稿がありません
            </p>
            <p className="mt-1 text-xs text-brown-500">
              最初の一言を投稿してみませんか？
            </p>
          </div>
        ) : (
          posts.map((p) => (
            <FeedPostCard
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              demoMode={demoMode}
            />
          ))
        )}
      </section>

      <BottomNav active="feed" />
    </main>
  );
}
