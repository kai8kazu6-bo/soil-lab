import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ReportUploadForm from "@/components/ReportUploadForm";
import ReportCard from "@/components/ReportCard";
import EmptyReports from "@/components/EmptyReports";
import { listReports } from "@/lib/reports";
import { getCurrentProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [{ items, isMock, isAnonymous }, prof] = await Promise.all([
    listReports(),
    getCurrentProfile(),
  ]);
  const userName = prof.profile?.display_name ?? "鏡沼さん";
  const reuseDeclared = prof.profile?.reuse_agreement ?? false;

  return (
    <main className="relative z-10 px-5 pt-6">
      <Header userName={userName} reuseAgreement={reuseDeclared} />

      <div className="mt-6">
        <p className="text-xs font-medium text-forest">マイレポート</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-brown">
          土と過ごした記録
        </h1>
        <p className="mt-1 text-sm text-brown-500">
          PDFや画像をアップロードして、コミュニティと共有・振り返りができます。
        </p>
      </div>

      {(isMock || isAnonymous) && (
        <div className="mt-4 rounded-organic border border-beige-200 bg-white/60 px-4 py-3 text-xs text-brown-500">
          {isMock
            ? "Supabase未接続のためデモデータを表示中。`.env.local`を設定するとアップロードが有効になります。"
            : "ログインすると、自分だけのレポートをアップロード・閲覧できます。"}
        </div>
      )}

      <section className="mt-6 space-y-5">
        <ReportUploadForm disabled={isMock || isAnonymous} />

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-brown-500">
              アップロード済みレポート
            </p>
            <span className="text-xs text-brown-500">{items.length}件</span>
          </div>

          {items.length === 0 ? (
            <EmptyReports />
          ) : (
            <ul className="mt-3 space-y-3">
              {items.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <BottomNav active="reports" />
    </main>
  );
}
