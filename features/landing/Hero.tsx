import Link from "next/link";
import type { CSSProperties } from "react";
import { Mark } from "@/ui/brand/Mark";
import { Icon } from "@/ui/Icon";

const d = (seconds: number) => ({ ["--d" as string]: `${seconds}s` }) as CSSProperties;

export function Hero() {
  return (
    <section className="flex min-w-0 flex-[1_1_560px] flex-col gap-[26px]">
      <div className="m-fade-up after chip-glass self-start" style={d(0.1)}>
        <span className="size-2 rounded-full bg-mint" />
        Free forever · No sign-up · GCash &amp; Maya ready
      </div>

      <div className="flex items-center gap-[clamp(16px,2.4vw,28px)]">
        <Mark
          tone="light"
          className="m-fade-up after"
          style={{
            ...d(0.15),
            width: "clamp(72px, 10vw, 128px)",
            height: "clamp(72px, 10vw, 128px)",
          }}
        />
        <h1
          aria-label="Parity"
          className="m-0 text-paper"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(60px, calc(6.6vw + 36px), 148px)",
            whiteSpace: "nowrap",
            lineHeight: 0.9,
            letterSpacing: "-0.045em",
          }}
        >
          {"parity".split("").map((letter, i) => (
            <span key={letter + i} className="m-rise-mask" aria-hidden="true">
              <span className="m-rise after" style={d(0.2 + i * 0.07)}>
                {letter}
              </span>
            </span>
          ))}
        </h1>
      </div>

      <div className="flex w-full max-w-80 flex-col gap-1.5" aria-hidden="true">
        <span className="m-draw after block h-1.5 rounded-full bg-mint" style={d(0.9)} />
        <span className="m-draw after block h-1.5 rounded-full bg-coral" style={d(1.02)} />
      </div>

      <p
        className="m-fade-up after m-0 text-paper"
        style={{
          ...d(1.0),
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(28px, 3.4vw, 40px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        Split it fair. Settle it fast.
      </p>
      <p
        className="m-fade-up after m-0 max-w-[520px] text-lg leading-[1.55] text-muted-dark"
        style={d(1.15)}
      >
        Scan the receipt, share one link, and everyone ticks what they had. Parity works out who
        owes whom and tracks every payment until the bill is fully paid.
      </p>

      <div className="m-fade-up after flex flex-wrap gap-3" style={d(1.3)}>
        <Link
          href="/new"
          className="m-lift inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-paper px-6 text-base font-semibold text-ink no-underline"
        >
          Start a group
          <Icon name="arrow" />
        </Link>
        <Link href="/scan" className="btn-outline m-lift min-h-[52px] px-6 text-base no-underline">
          <Icon name="scan" />
          Scan a receipt
        </Link>
      </div>
    </section>
  );
}
