"use client";

import { useMemo, useState } from "react";
import {
  Beaker,
  Droplets,
  Printer,
  RotateCcw,
  Check,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  STATUS_STYLE,
  SOLID_METRICS,
  LIQUID_METRICS,
  diagnoseSolid,
  diagnoseLiquid,
  deriveSolutions,
  analysisToSolidInput,
  analysisToLiquidInput,
  type AnalysisOption,
  type DiagnoseRow,
  type LiquidInput,
  type MetricMeta,
  type ResourceType,
  type SolidInput,
  type Status,
} from "@/lib/diagnose";
import DiagnoseSolutionCard from "./DiagnoseSolutionCard";

const EMPTY_SOLID: SolidInput = {
  cn_ratio: null,
  moisture: null,
  ec: null,
  ph: null,
  ammonia: null,
};

const EMPTY_LIQUID: LiquidInput = {
  ec: null,
  ammonia_ratio: null,
  ph: null,
  moisture: null,
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "ideal")
    return <Check size={11} strokeWidth={3} />;
  if (status === "warn")
    return <AlertTriangle size={11} strokeWidth={2.6} />;
  return <AlertOctagon size={11} strokeWidth={2.6} />;
}

/** カラーメーター：min..max の中で zones を塗り分け、value の位置にマーカー */
function Gauge({
  meta,
  value,
}: {
  meta: MetricMeta;
  value: number | null;
}) {
  const range = meta.max - meta.min;
  const pct = (n: number) => ((n - meta.min) / range) * 100;
  const valuePct =
    value == null
      ? null
      : Math.max(0, Math.min(100, pct(value)));

  return (
    <div className="relative mt-1.5">
      <div className="relative flex h-2.5 w-full overflow-hidden rounded-full bg-beige-100">
        {meta.zones.map((z, i) => {
          const left = pct(z.from);
          const width = pct(z.to) - left;
          const style = STATUS_STYLE[z.status];
          return (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: style.pillBg,
                opacity: 0.65,
              }}
            />
          );
        })}
      </div>
      {valuePct != null && (
        <div
          className="pointer-events-none absolute -top-1 h-4.5 w-1 rounded-full bg-brown shadow-soft"
          style={{
            left: `calc(${valuePct}% - 2px)`,
            height: "1.2rem",
            top: "-2px",
          }}
          aria-hidden="true"
        />
      )}
      <div className="mt-1 flex justify-between text-[10px] text-brown-500">
        <span>{meta.min}</span>
        <span>{meta.max}</span>
      </div>
    </div>
  );
}

function MetricInput({
  meta,
  value,
  onChange,
}: {
  meta: MetricMeta;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="rounded-organic border border-beige-200 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`diag-${meta.key}`}
          className="text-xs font-medium text-brown"
        >
          {meta.label}
          {meta.unit && (
            <span className="ml-1 text-[10px] text-brown-500">
              ({meta.unit})
            </span>
          )}
        </label>
        <input
          id={`diag-${meta.key}`}
          type="number"
          inputMode="decimal"
          step={meta.step}
          value={value == null ? "" : value}
          onChange={(e) => {
            const raw = e.currentTarget.value.trim();
            if (raw === "") {
              onChange(null);
              return;
            }
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : null);
          }}
          className="w-24 rounded-organic border border-beige-200 bg-white px-2 py-1 text-right text-sm tabular-nums text-brown focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
      </div>
      <Gauge meta={meta} value={value} />
    </div>
  );
}

function ResultRow({ row }: { row: DiagnoseRow }) {
  const s = STATUS_STYLE[row.status];
  return (
    <div
      className="rounded-organic border p-3"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold" style={{ color: s.text }}>
          {row.label}：
          <span className="ml-1 tabular-nums">
            {row.value}
            {row.unit && (
              <span className="ml-0.5 text-[10px] opacity-80">{row.unit}</span>
            )}
          </span>
        </p>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: s.pillBg, color: s.pillText }}
        >
          <StatusIcon status={row.status} />
          {row.statusLabel}
        </span>
      </div>
      <p
        className="mt-1.5 text-xs leading-relaxed"
        style={{ color: s.text }}
      >
        {row.message}
      </p>
    </div>
  );
}

type Props = {
  /** 「分析結果から取り込み」候補（DBから渡されるレポート由来の分析値） */
  options?: AnalysisOption[];
};

export default function DiagnoseTool({ options = [] }: Props) {
  const [type, setType] = useState<ResourceType>("solid");
  const [solid, setSolid] = useState<SolidInput>(EMPTY_SOLID);
  const [liquid, setLiquid] = useState<LiquidInput>(EMPTY_LIQUID);
  const [lowPh, setLowPh] = useState(false);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);

  const rows = useMemo<DiagnoseRow[]>(
    () => (type === "solid" ? diagnoseSolid(solid) : diagnoseLiquid(liquid)),
    [type, solid, liquid]
  );

  const solutions = useMemo(
    () =>
      deriveSolutions(
        type,
        type === "solid" ? solid : liquid,
        lowPh
      ),
    [type, solid, liquid, lowPh]
  );

  const metrics = type === "solid" ? SOLID_METRICS : LIQUID_METRICS;

  function reset() {
    setSolid(EMPTY_SOLID);
    setLiquid(EMPTY_LIQUID);
    setLowPh(false);
    setImportedFrom(null);
  }

  function importFromAnalysis(optionId: string) {
    const opt = options.find((o) => o.id === optionId);
    if (!opt) {
      setImportedFrom(null);
      return;
    }
    setType(opt.resourceType);
    if (opt.resourceType === "solid") {
      setSolid(analysisToSolidInput(opt));
    } else {
      setLiquid(analysisToLiquidInput(opt));
    }
    setImportedFrom(opt.id);
  }

  function setSolidField<K extends keyof SolidInput>(
    key: K,
    v: number | null
  ) {
    setSolid((cur) => ({ ...cur, [key]: v }));
  }

  function setLiquidField<K extends keyof LiquidInput>(
    key: K,
    v: number | null
  ) {
    setLiquid((cur) => ({ ...cur, [key]: v }));
  }

  return (
    <article className="card p-5">
      {/* 見出し */}
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium tracking-wide text-brown-500">
            現場で診断する
          </p>
          <h2 className="mt-1 text-base font-semibold text-brown">
            堆肥・スラリー 自動診断
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-brown-500">
            数値を入れるとその場で「理想/注意/危険」を判定し、必要なら自社製品をご提案します。
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={reset}
            aria-label="リセット"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brown/20 text-brown-500 hover:bg-brown/5"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-full border border-brown/20 px-3 py-1.5 text-xs font-medium text-brown hover:bg-brown/5"
          >
            <Printer size={12} />
            印刷
          </button>
        </div>
      </div>

      {/* 分析結果から取り込み（候補があるときだけ表示） */}
      {options.length > 0 && (
        <div className="mt-4 rounded-organic border border-forest/30 bg-forest/5 p-3 print:hidden">
          <label
            htmlFor="diag-import"
            className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-forest"
          >
            <Upload size={11} />
            分析結果から自動取り込み
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <select
              id="diag-import"
              value={importedFrom ?? ""}
              onChange={(e) => importFromAnalysis(e.currentTarget.value)}
              className="flex-1 rounded-organic border border-beige-200 bg-white px-3 py-1.5 text-sm text-brown focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="">-- レポートを選択 --</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.resourceType === "solid" ? "🌾 " : "💧 "}
                  {o.label}
                </option>
              ))}
            </select>
            {importedFrom && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-[10px] font-semibold text-beige-50">
                <Check size={10} />
                取り込み済
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-brown-500">
            スタッフが登録した分析値が自動入力され、その場で判定が表示されます。
          </p>
        </div>
      )}

      {/* 資材タイプ切替 */}
      <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
        {[
          {
            key: "solid" as const,
            label: "固体堆肥",
            sub: "Solid Compost",
            Icon: Beaker,
          },
          {
            key: "liquid" as const,
            label: "液体スラリー",
            sub: "Liquid Slurry",
            Icon: Droplets,
          },
        ].map(({ key, label, sub, Icon }) => {
          const active = type === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setType(key);
                setImportedFrom(null);
              }}
              className={
                "rounded-organic border px-3 py-2.5 text-left transition " +
                (active
                  ? "border-forest bg-forest text-beige-50"
                  : "border-beige-200 bg-white/70 text-brown hover:border-forest/60")
              }
            >
              <div className="flex items-center gap-2">
                <Icon size={14} />
                <p className="text-sm font-semibold">{label}</p>
              </div>
              <p
                className={
                  "mt-0.5 text-[10px] " +
                  (active ? "text-beige-50/80" : "text-brown-500")
                }
              >
                {sub}
              </p>
            </button>
          );
        })}
      </div>

      {/* 入力フォーム */}
      <div className="mt-4 space-y-2.5 print:mt-2">
        <p className="text-xs font-medium text-brown-500 print:hidden">
          分析値を入力
        </p>
        {metrics.map((meta) => {
          const value =
            type === "solid"
              ? (solid as Record<string, number | null>)[meta.key]
              : (liquid as Record<string, number | null>)[meta.key];
          return (
            <MetricInput
              key={meta.key}
              meta={meta}
              value={value ?? null}
              onChange={(v) => {
                if (type === "solid")
                  setSolidField(meta.key as keyof SolidInput, v);
                else setLiquidField(meta.key as keyof LiquidInput, v);
              }}
            />
          );
        })}
      </div>

      {/* 追加チェック：低pH/石灰苦土不足 */}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-organic border border-beige-200 bg-beige-50/60 p-3 print:bg-transparent">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={lowPh}
            onChange={(e) => setLowPh(e.currentTarget.checked)}
            className="peer sr-only"
          />
          <span
            className={
              "flex h-4 w-4 items-center justify-center rounded border-2 transition " +
              (lowPh
                ? "border-forest bg-forest text-beige-50"
                : "border-brown/40 bg-white")
            }
          >
            {lowPh && <Check size={11} strokeWidth={3} />}
          </span>
        </span>
        <span className="text-xs leading-relaxed text-brown">
          土壌のpHが低い・石灰苦土（カルシウム/マグネシウム）が不足している
        </span>
      </label>

      {/* 診断結果 */}
      {rows.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium tracking-wide text-brown-500">
            診断結果
          </p>
          <div className="mt-2 space-y-2">
            {rows.map((row) => (
              <ResultRow key={row.metric} row={row} />
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <p className="mt-5 rounded-organic border border-dashed border-beige-300 bg-beige-50/50 px-3 py-4 text-center text-xs text-brown-500 print:hidden">
          数値を入力すると、この下に判定結果が表示されます。
        </p>
      )}

      {/* ソリューション */}
      {solutions.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-forest">
            <Sparkles size={12} />
            おすすめのソリューション
          </p>
          {solutions.map((s) => (
            <DiagnoseSolutionCard key={s.id} solution={s} />
          ))}
        </div>
      )}
    </article>
  );
}
