import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import GiftTicketCard from "@/components/GiftTicketCard";
import DonationCard from "@/components/DonationCard";
import GiftInbox from "@/components/GiftInbox";
import { getRedeemPageData } from "@/lib/gifts";
import { getDashboardPointData } from "@/lib/points";
import { getCurrentProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function RedeemPage() {
  const [redeem, point, prof] = await Promise.all([
    getRedeemPageData(),
    getDashboardPointData(),
    getCurrentProfile(),
  ]);
  const balance = point.summary.total_points;
  const userName = prof.profile?.display_name ?? "鏡沼さん";
  const reuseDeclared = prof.profile?.reuse_agreement ?? false;

  return (
    <main className="relative z-10 px-5 pt-6">
      <Header userName={userName} reuseAgreement={reuseDeclared} />

      <div className="mt-6">
        <p className="text-xs font-medium text-forest">ポイントを使う</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-brown">
          仲間にプレゼント、<br />コミュニティへ寄付
        </h1>
        <p className="mt-1 text-sm text-brown-500">
          貯めたポイントは「MOOCAL-700 発送チケット」のプレゼントや、共有の寄付プールへの送金に使えます。
        </p>
      </div>

      {(redeem.isMock || redeem.isAnonymous) && (
        <div className="mt-4 rounded-organic border border-beige-200 bg-white/60 px-4 py-3 text-xs text-brown-500">
          {redeem.isMock
            ? "Supabase未接続のためデモデータを表示中。"
            : "ログインすると、自分のポイントでプレゼント・寄付ができます。"}
        </div>
      )}

      {/* 現在の保有ポイント表示 */}
      <div className="mt-5 rounded-organic bg-white/70 px-4 py-3 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-brown-500">保有ポイント</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-brown">
              {balance.toLocaleString()}
              <span className="ml-1 text-sm font-medium text-brown-500">pt</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-brown-500">寄付プール</p>
            <p className="text-base font-semibold tabular-nums text-forest">
              {redeem.pool.total_points.toLocaleString()}pt
            </p>
            <p className="text-[11px] text-brown-500">
              {redeem.pool.contributor_count}人が貢献
            </p>
          </div>
        </div>
      </div>

      <section className="mt-6 space-y-5">
        <GiftTicketCard
          balance={balance}
          disabled={redeem.isMock || redeem.isAnonymous}
        />
        <DonationCard
          balance={balance}
          pool={redeem.pool}
          disabled={redeem.isMock || redeem.isAnonymous}
        />
        <GiftInbox inbox={redeem.inbox} sent={redeem.sent} />
      </section>

      <BottomNav />
    </main>
  );
}
