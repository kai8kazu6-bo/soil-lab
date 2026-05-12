"use client";

import { useTransition } from "react";
import { Inbox, Send, CheckCircle2, Loader2 } from "lucide-react";
import { redeemMoocalTicket } from "@/app/actions";
import ReuseBadge from "./ReuseBadge";
import type { GiftWithProfile } from "@/lib/gifts";

type Props = {
  inbox: GiftWithProfile[];
  sent: GiftWithProfile[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

function nameOrHandle(g: GiftWithProfile, who: "sender" | "recipient") {
  const dn = who === "sender" ? g.sender_display_name : g.recipient_display_name;
  const h = who === "sender" ? g.sender_handle : g.recipient_handle;
  if (dn) return dn;
  if (h) return `@${h}`;
  return "（不明）";
}

function GiftRow({
  gift,
  perspective,
  onRedeem,
  pending,
}: {
  gift: GiftWithProfile;
  perspective: "received" | "sent";
  onRedeem?: () => void;
  pending?: boolean;
}) {
  const isTicket = gift.kind === "moocal_700_shipping";
  return (
    <li className="rounded-organic border border-beige-200 bg-white/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                (isTicket ? "bg-forest/10 text-forest" : "bg-brown/10 text-brown")
              }
            >
              {isTicket ? "MOOCAL-700" : "寄付"}
            </span>
            <span className="text-xs text-brown-500">
              {formatDate(gift.created_at)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-brown">
            {perspective === "received" ? (
              <>
                {nameOrHandle(gift, "sender")}
                {gift.sender_reuse && <ReuseBadge size="xs" />}
                <span className="font-normal">さんから</span>
              </>
            ) : isTicket ? (
              <>
                {nameOrHandle(gift, "recipient")}
                {gift.recipient_reuse && <ReuseBadge size="xs" />}
                <span className="font-normal">さんへ</span>
              </>
            ) : (
              <span>寄付プールへ</span>
            )}
          </p>
          {gift.message && (
            <p className="mt-0.5 line-clamp-2 text-xs italic text-brown-500">
              「{gift.message}」
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-brown">
            {gift.points_spent.toLocaleString()}pt
          </p>
          {isTicket && perspective === "received" && (
            <p
              className={
                "mt-0.5 text-[10px] " +
                (gift.redeemed_at ? "text-forest" : "text-brown-500")
              }
            >
              {gift.redeemed_at ? "利用済み" : "未利用"}
            </p>
          )}
        </div>
      </div>

      {isTicket && perspective === "received" && !gift.redeemed_at && (
        <button
          type="button"
          onClick={onRedeem}
          disabled={pending}
          className="btn-accent mt-3 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              処理中…
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              チケットを使う
            </>
          )}
        </button>
      )}
    </li>
  );
}

export default function GiftInbox({ inbox, sent }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <article className="card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest/15 text-forest">
            <Inbox size={14} />
          </span>
          <p className="text-xs font-medium tracking-wide text-brown-500">
            受け取ったチケット
          </p>
        </div>
        {inbox.length === 0 ? (
          <p className="mt-3 text-xs text-brown-500">
            まだチケットを受け取っていません。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {inbox.map((g) => (
              <GiftRow
                key={g.id}
                gift={g}
                perspective="received"
                pending={pending}
                onRedeem={() =>
                  startTransition(async () => {
                    await redeemMoocalTicket(g.id);
                  })
                }
              />
            ))}
          </ul>
        )}
      </article>

      <article className="card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brown/10 text-brown">
            <Send size={14} />
          </span>
          <p className="text-xs font-medium tracking-wide text-brown-500">
            自分が送った履歴
          </p>
        </div>
        {sent.length === 0 ? (
          <p className="mt-3 text-xs text-brown-500">
            まだプレゼント・寄付の履歴はありません。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sent.map((g) => (
              <GiftRow key={g.id} gift={g} perspective="sent" />
            ))}
          </ul>
        )}
      </article>
    </>
  );
}
