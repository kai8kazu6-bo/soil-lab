"use client";

import { useState, useTransition } from "react";
import { Gift, Loader2, AtSign } from "lucide-react";
import { sendMoocalTicket } from "@/app/actions";
import { MOOCAL_TICKET_COST } from "@/lib/gifts";

type Props = {
  balance: number;
  disabled?: boolean;
};

export default function GiftTicketCard({ balance, disabled = false }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const insufficient = balance < MOOCAL_TICKET_COST;

  async function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await sendMoocalTicket(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(
        `${MOOCAL_TICKET_COST}ptを使って MOOCAL-700 発送チケットを贈りました`
      );
    });
  }

  return (
    <form action={onSubmit} className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-organic bg-forest text-beige-50">
            <Gift size={20} />
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-brown-500">
              ギフト
            </p>
            <h2 className="text-base font-semibold text-brown">
              MOOCAL-700 発送チケットを贈る
            </h2>
          </div>
        </div>
        <span className="rounded-full bg-brown text-beige-50 px-3 py-1 text-xs font-semibold tabular-nums">
          {MOOCAL_TICKET_COST}pt
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-brown-500">
        土の分析を始めたい仲間に、ラボ専用キットの送料を肩代わりできます。
        受け取った人はマイページから1回だけチケットを使用できます。
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="recipient_handle"
            className="text-xs font-medium text-brown-500"
          >
            受け取る人のハンドル
          </label>
          <div className="relative mt-1">
            <AtSign
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brown-500"
            />
            <input
              id="recipient_handle"
              name="recipient_handle"
              required
              placeholder="aki_farm"
              disabled={disabled}
              className="w-full rounded-organic border border-beige-200 bg-white/80 px-3 py-2 pl-8 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="gift-message"
            className="text-xs font-medium text-brown-500"
          >
            ひとこと（任意・全角120字まで）
          </label>
          <textarea
            id="gift-message"
            name="message"
            rows={2}
            maxLength={120}
            placeholder="一緒に良い土を育てましょう"
            disabled={disabled}
            className="mt-1 w-full resize-none rounded-organic border border-beige-200 bg-white/80 px-3 py-2 text-sm text-brown placeholder:text-brown-200 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30 disabled:opacity-60"
          />
        </div>
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
        disabled={disabled || pending || insufficient}
        className="btn-accent mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            送信中…
          </>
        ) : (
          <>プレゼントする（{MOOCAL_TICKET_COST}pt）</>
        )}
      </button>
      {insufficient && !disabled && (
        <p className="mt-2 text-center text-[11px] text-brown-500">
          チケットを贈るにはあと{(MOOCAL_TICKET_COST - balance).toLocaleString()}ptが必要です
        </p>
      )}
    </form>
  );
}
