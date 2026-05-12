import { Bell, Sprout } from "lucide-react";
import ReuseBadge from "./ReuseBadge";

type HeaderProps = {
  userName: string;
  /** trueなら名前の横にリユース宣言バッジを表示 */
  reuseAgreement?: boolean;
};

export default function Header({
  userName,
  reuseAgreement = false,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-beige-50">
          <Sprout size={20} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-xs text-brown-500">こんにちは</p>
          <h1 className="flex items-center gap-1.5 text-base font-semibold leading-tight text-brown">
            {userName}
            {reuseAgreement && <ReuseBadge size="xs" />}
          </h1>
        </div>
      </div>

      <button
        type="button"
        aria-label="通知"
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-brown shadow-soft hover:bg-white transition"
      >
        <Bell size={18} />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-forest" />
      </button>
    </header>
  );
}
