import Header from "@/components/Header";
import PointsCard from "@/components/PointsCard";
import NextLabCard from "@/components/NextLabCard";
import SoilBalanceCard from "@/components/SoilBalanceCard";
import PointHistoryList from "@/components/PointHistoryList";
import ReuseDeclarationCard from "@/components/ReuseDeclarationCard";
import BottomNav from "@/components/BottomNav";
import { getDashboardPointData } from "@/lib/points";
import { getLatestBalance } from "@/lib/balance";
import { getCurrentProfile } from "@/lib/profile";

// Server Component：Supabaseから直接データを取得
export default async function DashboardPage() {
  const [{ summary, history, isMock, isAnonymous }, balance, prof] =
    await Promise.all([
      getDashboardPointData(),
      getLatestBalance(),
      getCurrentProfile(),
    ]);

  const reuseDeclared = prof.profile?.reuse_agreement ?? false;
  const userName = prof.profile?.display_name ?? "鏡沼さん";

  return (
    <main className="relative z-10 px-5 pt-6">
      <Header userName={userName} reuseAgreement={reuseDeclared} />

      {(isMock || isAnonymous) && (
        <div className="mt-4 rounded-organic border border-beige-200 bg-white/60 px-4 py-3 text-xs text-brown-500">
          {isMock
            ? "Supabase未接続のためデモデータを表示中。`.env.local` を設定するとリアルタイム連携になります。"
            : "ログインすると自分のポイント履歴が表示されます。"}
        </div>
      )}

      <section className="mt-6 space-y-5">
        <PointsCard
          points={summary.total_points}
          weeklyDelta={summary.weekly_delta}
        />
        <ReuseDeclarationCard
          initiallyDeclared={reuseDeclared}
          agreementDate={prof.profile?.agreement_date ?? null}
          mockMode={prof.isMock}
        />
        <NextLabCard
          title="春の土壌pH測定ラボ"
          dateLabel="5月18日 (月)"
          timeLabel="19:00 - 20:30"
          location="オンライン開催"
        />
        <SoilBalanceCard axes={balance} />
        <PointHistoryList history={history} />
      </section>

      <BottomNav active="home" />
    </main>
  );
}
