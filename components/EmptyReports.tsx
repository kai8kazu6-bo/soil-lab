import { FolderOpen } from "lucide-react";

export default function EmptyReports() {
  return (
    <div className="mt-3 flex flex-col items-center justify-center rounded-organic border border-dashed border-beige-300 bg-beige-50/50 px-4 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-forest">
        <FolderOpen size={22} />
      </span>
      <p className="mt-3 text-sm font-medium text-brown">
        まだレポートがありません
      </p>
      <p className="mt-1 text-xs text-brown-500">
        分析結果のPDFや、土の写真をアップロードしてみましょう。
      </p>
    </div>
  );
}
