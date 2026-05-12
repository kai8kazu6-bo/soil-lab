"use client";

import { useTransition } from "react";
import {
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Calendar,
  Lock,
  Sparkles,
} from "lucide-react";
import { deleteReport } from "@/app/actions";
import ReportTierBadge from "./ReportTierBadge";
import type { ReportListItem } from "@/lib/reports";

type Props = {
  report: ReportListItem;
  /** スタッフ閲覧かどうか（削除ボタン表示などに使う） */
  staffMode?: boolean;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReportCard({ report, staffMode = false }: Props) {
  const [pending, startTransition] = useTransition();
  const Icon = report.kind === "image" ? ImageIcon : FileText;
  const locked = report.tier === "essence" && !report.has_access;

  function onDelete() {
    if (!confirm(`「${report.title}」を削除しますか？`)) return;
    startTransition(async () => {
      await deleteReport(report.id);
    });
  }

  // -------------------------------------------------
  // ロック状態（Essence非会員にEssenceレポートが届いている場合）
  // -------------------------------------------------
  if (locked) {
    return (
      <li className="overflow-hidden rounded-organic border border-forest/30 bg-forest/5 p-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-organic bg-forest/15 text-forest">
            <Lock size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <ReportTierBadge tier="essence" />
              <span className="text-[10px] text-brown-500">
                {formatDate(report.created_at)}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-brown">
              {report.title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-brown-500">
              この特別分析レポートは Soil Essence 契約者専用です。
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-accent mt-3 inline-flex w-full items-center justify-center gap-1.5 text-xs"
        >
          <Sparkles size={12} />
          Soil Essence に申し込む
        </button>
      </li>
    );
  }

  // -------------------------------------------------
  // 通常状態（閲覧可能）
  // -------------------------------------------------
  return (
    <li className="rounded-organic border border-beige-200 bg-white/70 p-3">
      <div className="flex items-start gap-3">
        <span
          className={
            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-organic " +
            (report.kind === "image"
              ? "bg-forest/10 text-forest"
              : "bg-brown/10 text-brown")
          }
        >
          <Icon size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ReportTierBadge tier={report.tier} />
            <span className="text-[10px] text-brown-500">
              {formatDate(report.created_at)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-brown">
            {report.title}
          </p>
          {report.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-brown-500">
              {report.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brown-500">
            <span className="rounded-full bg-beige-200/70 px-1.5 py-0.5 uppercase tracking-wide">
              {report.kind}
            </span>
            <span>{formatBytes(report.file_size)}</span>
            {report.lab_date && (
              <span className="inline-flex items-center gap-0.5">
                <Calendar size={11} className="text-forest" />
                {formatDate(report.lab_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {report.signed_url ? (
          <a
            href={report.signed_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline"
          >
            ファイルを開く
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-xs text-brown-500">プレビューはこちら</span>
        )}

        {staffMode && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="削除"
            className="inline-flex items-center gap-1 rounded-full border border-brown/15 px-2.5 py-1 text-xs text-brown-500 hover:bg-brown/5 disabled:opacity-50"
          >
            <Trash2 size={12} />
            削除
          </button>
        )}
      </div>
    </li>
  );
}
