import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ReportUploadForm from "@/components/ReportUploadForm";
import ReportCard from "@/components/ReportCard";
import EmptyReports from "@/components/EmptyReports";
import EssenceMembershipBanner from "@/components/EssenceMembershipBanner";
import { listReports } from "@/lib/reports";
import { getCurrentProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [{ items, isMock, isAnonymous, isEssenceMember, isStaff }, prof] =
    await Promise.all([listReports(), getCurrentProfile()]);
  const userName = prof.profile?.display_name ?? "鏡沼さん";
  const reuseDeclared = prof.profile?.reuse_agreement ?? false;

  // tierごとに仕分け
  const basicItems = items.filter((r) => r.tier === "basic");
  const essenceItems = items.filter((r) => r.tier === "essence");
  const lockedEssenceCount = essenceItems.filter((r) => !r.has_access).length;

  return (
    <main className="relative z-10 px-5 pt-6">
      <Header userName={userName} reuseAgreement={reuseDeclared} />

      <div className="mt-6">
        <p className="text-xs font-medium text-forest">マイレポート</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-brown">
          土と過ごした記録
        </h1>
        <p className="mt-1 text-sm text-brown-500">
          soilメンバーが採取・分析した結果をお届けします。
          {isEssenceMember && " Soil Essence 契約者として、特別分析レポートも閲覧できます。"}
        </p>
      </div>

      {(isMock || isAnonymous) && (
        <div className="mt-4 rounded-organic border border-beige-200 bg-white/60 px-4 py-3 text-xs text-brown-500">
          {isMock
            ? "Supabase未接続のためデモデータを表示中。`.env.local`を設定すると実データになります。"
            : "ログインすると、あなた宛ての分析レポートが表示されます。"}
        </div>
      )}

      <section className="mt-6 space-y-5">
        {/* スタッフだけにアップロードフォームを表示 */}
        {isStaff && <ReportUploadForm disabled={isMock || isAnonymous} />}

        {/* Basicレポート一覧 */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-brown-500">
              分析結果（Basic）
            </p>
            <span className="text-xs text-brown-500">{basicItems.length}件</span>
          </div>
          {basicItems.length === 0 ? (
            <EmptyReports />
          ) : (
            <ul className="mt-3 space-y-3">
              {basicItems.map((r) => (
                <ReportCard key={r.id} report={r} staffMode={isStaff} />
              ))}
            </ul>
          )}
        </div>

        {/* 非会員＆ロック中Essenceがある場合：会員バナーを目立たせる */}
        {!isEssenceMember && !isStaff && (
          <EssenceMembershipBanner lockedCount={lockedEssenceCount} />
        )}

        {/* Essenceレポート一覧（会員 or スタッフのときだけセクションを表示） */}
        {(isEssenceMember || isStaff) && essenceItems.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-forest">
                Soil Essence 特別分析レポート
              </p>
              <span className="text-xs text-brown-500">{essenceItems.length}件</span>
            </div>
            <ul className="mt-3 space-y-3">
              {essenceItems.map((r) => (
                <ReportCard key={r.id} report={r} staffMode={isStaff} />
              ))}
            </ul>
          </div>
        )}

        {/* 非会員でもロック中のEssenceがある場合、リスト化（ロック状態のカードで表示） */}
        {!isEssenceMember && !isStaff && essenceItems.length > 0 && (
          <div className="card p-5">
            <p className="text-xs font-medium tracking-wide text-brown-500">
              Soil Essence 契約者専用レポート
            </p>
            <ul className="mt-3 space-y-3">
              {essenceItems.map((r) => (
                <ReportCard key={r.id} report={r} staffMode={false} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <BottomNav active="reports" />
    </main>
  );
}
