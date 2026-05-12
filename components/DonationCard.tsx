"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { sendDonation } from "@/app/actions";
import {
  DONATION_MIN_AMOUNT,
  DONATION_PRESETS,
  type DonationPoolSummary,
} from "@/lib/gifts-config";

type Props = {
  balance: number;
  pool: DonationPoolSummary;
  disabled?: boolean;
};

export default function DonationCard({ balance, pool, disabled = false }: Props) {
  const [amount, setAmount] = useState<number>(DONATION_PRESETS[1]);
  const [custom, setCustom] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const finalAmount = custom
    ? Number(custom) || 0
    : amount;

  const insufficient = balance < finalAmount;
  const tooSmall = finalAmount < DONATION_MIN_AMOUNT;

  async function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    formData.set("amount", String(finalAmount));
    startTransition(async () => {
      const res = await sendDonation(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(`${res.amount.toLocaleString()}ptを寄付プールに送りました`);
      setCustom("");
    });
  }

  return (
    <form action={onSubmit} className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-organic bg-brown text-beige-50">
            <Heart size={20} />
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-brown-500">
              寄付プール
            </p>
            <h2 className="text-base font-semibold text-brown">
              コミュニティへ寄付する
            </h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-brown-500">現在のプール</p>
          <p className="text-base font-semibold tabular-nums text-forest">
            {pool.total_points.toLocaleString()}pt
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-brown-500">
        プールされたポイントは、地域の土壌調査や苗の配布など、コミュニティの活動に使われます。
      </p>

      {/* プリセット */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {DONATION_PRESETS.map((p) => {
          const isActive = !custom && amount === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(p);
                setCustom("");
              }}
              disabled={disabled}
              className={
                "rounded-organic border px-2 py-2 text-sm font-semibold tabular-nums transition disabled:opacity-50 " +
                (isActive
                  ? "border-forest bg-forest text-beige-50"
                  : "border-beige-200 bg-white/70 text-brown hover:border-forest/60")
              }
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* カスタム */}
      <div className="mt-3">
        <label
          htmlFor="donation-custom"
          className="text-xs font-medium text-brown-500"
        >
          または金額を入力（最少 {DONATION_MIN_AMOUNT}pt）
        </label>
        <div className="relative mt-1">
          <input
            id="donation-custom"
            type="number"
            min={DONATION_MIN_AMOUNT}
            step={50}
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="500"
            disabled={disabled}
            className="w-full rounded-organic border border-beige-200 bg-white/80 px-3 py-2 pr-10 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brown-500">
            pt
          </span>
        </div>
      </div>

      <div className="mt-3">
        <label
          htmlFor="donation-message"
          className="text-xs font-medium text-brown-500"
        >
          一言（任意）
        </label>
        <input
          id="donation-message"
          name="message"
          maxLength={80}
          placeholder="活動を応援しています"
          disabled={disabled}
          className="mt-1 w-full rounded-organic border border-beige-200 bg-white/80 px-3 py-2 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
        />
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
        disabled={disabled || pending || tooSmall || insufficient}
        className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            送信中…
          </>
        ) : (
          <>{finalAmount > 0 ? `${finalAmount.toLocaleString()}pt 寄付する` : "金額を選択"}</>
        )}
      </button>
      {insufficient && !disabled && finalAmount > 0 && (
        <p className="mt-2 text-center text-[11px] text-brown-500">
          残高が足りません（保有 {balance.toLocaleString()}pt）
        </p>
      )}
    </form>
  );
}
