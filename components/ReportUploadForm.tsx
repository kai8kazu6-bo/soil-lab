"use client";

import { useRef, useState, useTransition } from "react";
import {
  CloudUpload,
  Loader2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AtSign,
} from "lucide-react";
import { uploadReport, type UploadReportResult } from "@/app/actions";
import {
  REPORT_ACCEPT_MIME,
  REPORT_MAX_BYTES,
} from "@/lib/reports-config";
import {
  ANALYSIS_KEYS,
  METRIC_LABEL,
  METRIC_STEP,
  METRIC_UNIT,
} from "@/lib/analyses";

type Props = {
  disabled?: boolean;
};

const ACCEPT = REPORT_ACCEPT_MIME.join(",");

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ReportUploadForm({ disabled = false }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [tier, setTier] = useState<"basic" | "essence">("basic");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [pending, startTransition] = useTransition();

  function pickFile(f: File | null) {
    setError(null);
    setSuccess(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (
      !REPORT_ACCEPT_MIME.includes(
        f.type as (typeof REPORT_ACCEPT_MIME)[number]
      )
    ) {
      setError("PDFまたは画像（png/jpeg/webp/heic）のみアップロードできます");
      return;
    }
    if (f.size > REPORT_MAX_BYTES) {
      setError("ファイルサイズは20MBまでです");
      return;
    }
    setFile(f);
  }

  async function onSubmit(formData: FormData) {
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }
    formData.set("file", file);
    formData.set("tier", tier);

    startTransition(async () => {
      const res: UploadReportResult = await uploadReport(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess("アップロードしました");
      setFile(null);
      setTier("basic");
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="card p-5"
      aria-label="レポートをアップロード"
    >
      <p className="text-xs font-medium tracking-wide text-brown-500">
        スタッフ用：お客様にレポートを提供
      </p>
      <p className="mt-1 text-[11px] text-brown-500">
        分析結果のPDFや画像を、指定したお客様のマイレポートに追加します。
      </p>

      {/* ファイルドロップゾーン */}
      <label
        htmlFor="report-file"
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (disabled) return;
          const f = e.dataTransfer.files?.[0];
          if (f) pickFile(f);
        }}
        className={
          "mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-organic border-2 border-dashed px-4 py-7 text-center transition " +
          (drag
            ? "border-forest bg-forest/5"
            : "border-beige-300 bg-beige-50/60 hover:border-forest/60") +
          (disabled ? " pointer-events-none opacity-60" : "")
        }
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-beige-50">
          <CloudUpload size={20} />
        </span>
        <span className="text-sm font-medium text-brown">
          タップしてファイルを選ぶ、またはドラッグ&ドロップ
        </span>
        <span className="text-xs text-brown-500">
          PDF / PNG / JPEG / WEBP / HEIC（最大 20MB）
        </span>
        <input
          ref={inputRef}
          id="report-file"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => pickFile(e.currentTarget.files?.[0] ?? null)}
          disabled={disabled}
        />
      </label>

      {file && (
        <div className="mt-3 flex items-center justify-between rounded-organic border border-beige-200 bg-white/70 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-brown">
            <Paperclip size={14} className="text-forest" />
            <span className="truncate">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brown-500">
              {formatBytes(file.size)}
            </span>
            <button
              type="button"
              onClick={() => {
                pickFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-brown-500 hover:text-brown"
            >
              削除
            </button>
          </div>
        </div>
      )}

      {/* メタ情報 */}
      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="customer_handle"
            className="text-xs font-medium text-brown-500"
          >
            提供先のお客様（ハンドル）
          </label>
          <div className="relative mt-1">
            <AtSign
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brown-500"
            />
            <input
              id="customer_handle"
              name="customer_handle"
              required
              placeholder="aki_farm"
              disabled={disabled}
              className="w-full rounded-organic border border-beige-200 bg-white/80 px-3 py-2 pl-8 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-brown-500">レポート階層</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTier("basic")}
              disabled={disabled}
              className={
                "rounded-organic border px-3 py-2 text-left transition disabled:opacity-50 " +
                (tier === "basic"
                  ? "border-forest bg-forest text-beige-50"
                  : "border-beige-200 bg-white/70 text-brown hover:border-forest/60")
              }
            >
              <p className="text-sm font-semibold">Basic</p>
              <p className="mt-0.5 text-[10px] opacity-80">基本の分析結果</p>
            </button>
            <button
              type="button"
              onClick={() => setTier("essence")}
              disabled={disabled}
              className={
                "rounded-organic border px-3 py-2 text-left transition disabled:opacity-50 " +
                (tier === "essence"
                  ? "border-forest bg-forest text-beige-50"
                  : "border-beige-200 bg-white/70 text-brown hover:border-forest/60")
              }
            >
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Sparkles size={11} />
                Soil Essence
              </p>
              <p className="mt-0.5 text-[10px] opacity-80">契約者限定の特別レポート</p>
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="report-title"
            className="text-xs font-medium text-brown-500"
          >
            タイトル
          </label>
          <input
            id="report-title"
            name="title"
            required
            placeholder="例：畑Aの春の土壌分析"
            disabled={disabled}
            className="mt-1 w-full rounded-organic border border-beige-200 bg-white/80 px-3 py-2 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="report-desc"
            className="text-xs font-medium text-brown-500"
          >
            メモ（任意）
          </label>
          <textarea
            id="report-desc"
            name="description"
            rows={2}
            placeholder="観察ポイントや気づきを残せます"
            disabled={disabled}
            className="mt-1 w-full resize-none rounded-organic border border-beige-200 bg-white/80 px-3 py-2 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="report-date"
            className="text-xs font-medium text-brown-500"
          >
            測定日（任意）
          </label>
          <input
            id="report-date"
            name="lab_date"
            type="date"
            disabled={disabled}
            className="mt-1 w-full rounded-organic border border-beige-200 bg-white/80 px-3 py-2 text-sm text-brown focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
          />
        </div>
      </div>

      {/* 分析値入力（折りたたみ） */}
      <div className="mt-4 rounded-organic border border-beige-200 bg-beige-50/60">
        <button
          type="button"
          onClick={() => setShowAnalysis((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-brown">
            <Sparkles size={13} className="text-forest" />
            分析データを入力（任意）
            <span className="text-[10px] font-normal text-brown-500">
              前回より改善があれば回復ボーナス +pt
            </span>
          </span>
          {showAnalysis ? (
            <ChevronUp size={14} className="text-brown-500" />
          ) : (
            <ChevronDown size={14} className="text-brown-500" />
          )}
        </button>

        {showAnalysis && (
          <div className="grid grid-cols-2 gap-2 px-3 pb-3">
            {ANALYSIS_KEYS.map((k) => (
              <div key={k}>
                <label
                  htmlFor={`analysis_${k}`}
                  className="text-[11px] font-medium text-brown-500"
                >
                  {METRIC_LABEL[k]}
                  {METRIC_UNIT[k] && (
                    <span className="ml-0.5 text-brown-500/70">
                      ({METRIC_UNIT[k]})
                    </span>
                  )}
                </label>
                <input
                  id={`analysis_${k}`}
                  name={`analysis_${k}`}
                  type="number"
                  inputMode="decimal"
                  step={METRIC_STEP[k]}
                  min={0}
                  disabled={disabled}
                  className="mt-0.5 w-full rounded-organic border border-beige-200 bg-white/80 px-2.5 py-1.5 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-organic bg-brown/5 px-3 py-2 text-xs text-brown">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-organic bg-forest/10 px-3 py-2 text-xs text-forest">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || pending || !file}
        className="btn-accent mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            アップロード中…
          </>
        ) : (
          <>アップロードする</>
        )}
      </button>
    </form>
  );
}
