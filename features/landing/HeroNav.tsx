import Link from "next/link";
import { Lockup } from "@/ui/brand/Wordmark";
import { Icon } from "@/ui/Icon";

const SECTIONS = [
  { href: "#top", label: "Intro" },
  { href: "#how", label: "How it works" },
  { href: "#scan", label: "Scan & Split" },
  { href: "#pay", label: "Payments" },
];

export function HeroNav() {
  return (
    <header
      className="m-fade-down after relative z-10 flex w-full flex-wrap items-center justify-between gap-4 px-6 py-5"
      style={{ ["--d" as string]: "0s" }}
    >
      <nav
        aria-label="Sections"
        className="hidden flex-1 flex-wrap items-center gap-1 text-sm md:flex"
      >
        {SECTIONS.map((s, i) => (
          <a
            key={s.href}
            href={s.href}
            className={`px-2.5 py-3 no-underline transition-colors hover:text-paper ${
              i === 0 ? "tab-dot font-semibold text-paper" : "text-subtle-dark"
            }`}
          >
            {s.label}
          </a>
        ))}
      </nav>
      <Lockup tone="light" />
      <div className="flex flex-1 justify-end">
        <Link href="/new" className="m-lift inline-flex items-center gap-1.5 no-underline">
          <span className="flex min-h-11 items-center rounded-full bg-paper px-[18px] text-sm font-semibold text-ink">
            Start a group
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-mint text-ink">
            <Icon name="arrow" size={16} strokeWidth={2.4} />
          </span>
        </Link>
      </div>
    </header>
  );
}
