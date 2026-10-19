"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/ui/Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "", label: "Overview", icon: "home" },
  { href: "/expenses", label: "Expenses", icon: "list" },
  { href: "/scan", label: "Scan", icon: "scan" },
  { href: "/settle", label: "Settle", icon: "swap" },
  { href: "/people", label: "People", icon: "people" },
];

/** Section tabs with the active Mint dot: top bar on desktop, bottom bar on phones. */
export function GroupTabs({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/g/${token}`;
  const isActive = (href: string) =>
    href === ""
      ? pathname === base
      : pathname === base + href || pathname.startsWith(`${base + href}/`);

  return (
    <>
      <nav
        aria-label="Group sections"
        className="mx-auto hidden w-full max-w-[720px] gap-1 px-6 md:flex"
      >
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={base + t.href}
            aria-current={isActive(t.href) ? "page" : undefined}
            className={`px-2.5 py-3 text-sm no-underline transition-colors hover:text-paper ${
              isActive(t.href) ? "tab-dot font-semibold text-paper" : "text-subtle-dark"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Group sections"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-ink/95 px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        {TABS.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={base + t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                active ? "font-semibold text-paper" : "text-subtle-dark"
              }`}
            >
              <span className="relative">
                <Icon name={t.icon} size={20} />
                {active && (
                  <span className="absolute -top-1 -right-2 size-2 rounded-full bg-mint" />
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
