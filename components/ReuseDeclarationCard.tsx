"use client";

import { useState, useTransition } from "react";
import { Sprout, Loader2, Check } from "lucide-react";
import { declareReuse } from "@/app/actions";
import ReuseBadge from "./ReuseBadge";

type Props = {
  /** 既に宣言済みかどうか（profiles.reuse_agreement） */
  initiallyDeclared: boolean;
  /** ISO 文字列の宣言日時（profiles.agreement_date） */
  agreementDate?: string | null;
  /** Supabase 未設定時は即時に「宣言後」UIを楽観表示する */
  mockMode?: boolean;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ReuseDeclarationCard({
  initiallyDeclared,
  agreementDate = null,
  mockMode = false,
}: Props) {
  const [declared, setDeclared] = useState<boolean>(initiallyDeclared);
  const [date, setDate] = useState<string | null>(agreementDate);
  const [checked, setChecked] = useState(false);
  const [bonus, setBonus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ブラウンの境界線＋薄ベージュ背景のオーガニックカード
  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(180deg, #F8F1E0 0%, #F2E9D2 100%)",
    border: "1.5px solid rgba(78, 52, 46, 0.45)",
    borderRadius: "1.25rem",
    boxShadow: "0 6px 20px -10px rgba(78, 52, 46, 0.25)",
  };

  function onSubmit() {
    if (!checked) {
      setError("内容を確認してチェックを入れてください");
      return;
    }
    setError(null);

    if (mockMode) {
      // デモ表示：DB呼び出し無しで「宣言後」状態へ
      setDeclared(true);
      setDate(new Date().toISOString());
      setBonus(50);
      return;
    }

    startTransition(async () => {
      const res = await declareReuse();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDeclared(true);
      setDate(res.agreementDate);
      setBonus(res.grantedBonus ? res.bonusAmount : 0);
    });
  }

  // -----------------------------------------------
  // 宣言済み状態
  // -----------------------------------------------
  if (declared) {
    return (
      <article style={cardStyle} className="relative overflow-hidden p-5">
        {/* 背景装飾 */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-forest/10" />

        <div className="relative flex items-start gap-3">
          <ReuseBadge size="md" />
          <div className="flex-1">
            <p className="text-xs font-medium tracking-wide text-forest">
              リユース宣言 完了
            </p>
            <h2 className="mt-1 text-base font-semibold text-brown">
              ありがとうございます！<br />
              あなたの意思が土を豊かにします。
            </h2>
            {date && (
              <p className="mt-1 text-[11px] text-brown-500">
                宣言日：{formatDate(date)}
              </p>
            )}
          </div>
        </div>

        {bonus != null && bonus > 0 && (
          <div className="relative mt-4 flex items-center gap-2 rounded-organic bg-forest/10 px-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-beige-50">
              <Sprout size={14} />
            </span>
            <p className="text-sm font-semibold text-forest">
              理念共鳴ポイント +{bonus.toLocaleString()}pt を獲得
            </p>
          </div>
        )}

        <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5">
          <ReuseBadge size="xs" />
          <span className="text-[11px] font-medium text-brown">
            プロフィールにリユースバッジを表示中
          </span>
        </div>
      </article>
    );
  }

  // -----------------------------------------------
  // 宣言前（フォーム表示）
  // -----------------------------------------------
  return (
    <article
      style={cardStyle}
      className="relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brown/5" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-forest/10" />

      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brown text-beige-50">
          <Sprout size={16} />
        </span>
        <p className="text-xs font-semibold tracking-wide text-brown">
          リユース宣言
        </p>
      </div>

      <h2 className="relative mt-3 text-base font-semibold leading-relaxed text-brown">
        20L容器の再利用に協力し、<br />
        自然に寄り添う循環を作ります
      </h2>

      <p className="relative mt-2 text-xs leading-relaxed text-brown-500">
        宣言すると、あなたのプロフィールに緑のリユースバッジが付き、
        初回のみ「理念共鳴ポイント」として 50pt が付与されます。
      </p>

      {/* チェックボックス */}
      <label className="relative mt-4 flex cursor-pointer items-start gap-2.5 rounded-organic bg-white/60 p-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setChecked(e.currentTarget.checked);
              setError(null);
            }}
            className="peer sr-only"
            aria-describedby="reuse-confirm-text"
          />
          <span
            className={
              "flex h-5 w-5 items-center justify-center rounded border-2 transition " +
              (checked
                ? "border-forest bg-forest text-beige-50"
                : "border-brown/40 bg-white")
            }
          >
            {checked && <Check size={14} strokeWidth={3} />}
          </span>
        </span>
        <span id="reuse-confirm-text" className="text-xs text-brown">
          上記の宣言内容に同意し、リユース活動に協力します。
        </span>
      </label>

      {error && (
        <p className="relative mt-3 rounded-organic bg-brown/10 px-3 py-2 text-xs text-brown">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="btn-accent relative mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            送信中…
          </>
        ) : (
          <>
            <Sprout size={14} />
            宣言して活動を始める
          </>
        )}
      </button>

      {mockMode && (
        <p className="relative mt-2 text-center text-[10px] text-brown-500">
          ※ Supabase未接続のためデモ動作で表示が切り替わります
        </p>
      )}
    </article>
  );
}
