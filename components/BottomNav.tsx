"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlayCircle, Newspaper, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavKey = "home" | "videos" | "feed" | "reports";

type BottomNavProps = {
  /** 明示指定したい場合（指定がなければ pathname から自動判定） */
  active?: NavKey;
};

type Item = {
  key: NavKey;
  label: string;
  href: string;
  Icon: LucideIcon;
};

const items: Item[] = [
  { key: "home", label: "ホーム", href: "/", Icon: Home },
  { key: "videos", label: "動画", href: "/videos", Icon: PlayCircle },
  { key: "feed", label: "フィード", href: "/feed", Icon: Newspaper },
  {
    key: "reports",
    label: "マイレポート",
    href: "/reports",
    Icon: FileText,
  },
];

function resolveActive(path: string): NavKey {
  if (path.startsWith("/reports")) return "reports";
  if (path.startsWith("/videos")) return "videos";
  if (path.startsWith("/feed")) return "feed";
  return "home";
}

export default function BottomNav({ active }: BottomNavProps) {
  const pathname = usePathname();
  const current = active ?? resolveActive(pathname ?? "/");

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4 pb-4"
    >
      <ul className="flex items-center justify-between rounded-organic border border-beige-200 bg-beige-50/95 px-2 py-2 shadow-soft backdrop-blur">
        {items.map(({ key, label, href, Icon }) => {
          const isActive = key === current;
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                className={
                  "flex w-full flex-col items-center gap-0.5 rounded-organic py-1.5 transition " +
                  (isActive
                    ? "text-forest"
                    : "text-brown-500 hover:text-brown")
                }
              >
                <span
                  className={
                    "flex h-8 w-8 items-center justify-center rounded-full transition " +
                    (isActive ? "bg-forest/10" : "bg-transparent")
                  }
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                <span
                  className={
                    "text-[11px] tracking-wide " +
                    (isActive ? "font-semibold" : "font-medium")
                  }
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
