import type { CSSProperties } from "react";
import { Avatar, AvatarStack } from "@/ui/People";

const card = (delay: number, rotate: number) =>
  ({ ["--d" as string]: `${delay}s`, ["--r" as string]: `${rotate}deg` }) as CSSProperties;

const ANA = { id: "ana", name: "Ana" };
const BEN = { id: "ben", name: "Ben" };
const CARLO = { id: "carlo-x", name: "Carlo" };

/** Three sample cards that show what Parity does. Example amounts only. */
export function HeroCards() {
  return (
    <section
      id="scan"
      aria-label="How a bill looks in Parity"
      className="flex min-w-0 flex-[1_1_400px] flex-col gap-5 py-2"
    >
      <article className="card hero-card w-full max-w-[380px] self-start" style={card(1.2, -1.5)}>
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[15px] font-semibold">Dinner receipt</span>
          <span className="badge-count">2 of 3 claimed</span>
        </div>
        <div className="flex flex-col gap-3 text-[15px]">
          <div className="flex items-center gap-2.5">
            <span className="flex-1">Sisig platter</span>
            <AvatarStack people={[ANA, BEN, CARLO]} />
            <span className="money w-16 text-right">₱380</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex-1">Iced tea pitcher</span>
            <Avatar id={BEN.id} name={BEN.name} size={26} />
            <span className="money w-16 text-right">₱160</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-light">
            <span className="flex-1">Halo-halo</span>
            <span className="row-dashed">Unclaimed</span>
            <span className="money w-16 text-right">₱145</span>
          </div>
        </div>
      </article>

      <article className="glass hero-card w-full max-w-[340px] self-end" style={card(1.45, 1.2)}>
        <div className="mb-2 text-[13px] text-subtle-dark">Fewest transfers</div>
        <div className="flex items-center gap-3">
          <Avatar id={BEN.id} name={BEN.name} size={36} />
          <svg
            width="40"
            height="12"
            viewBox="0 0 40 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="text-subtle-dark"
          >
            <path d="M2 6h34M31 1l5 5-5 5" />
          </svg>
          <Avatar id={ANA.id} name={ANA.name} size={36} />
          <span className="money display ml-auto text-[26px] font-bold">₱286.67</span>
        </div>
        <div className="mt-3 text-sm text-muted-dark">Ben pays Ana via GCash</div>
      </article>

      <article
        className="hero-card flex items-center gap-3 self-center rounded-full bg-white py-2.5 pr-[18px] pl-2.5 text-ink"
        style={{ ...card(1.7, -0.8), boxShadow: "var(--shadow-pill)" }}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-mint-dark text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12l5 5L19 7" />
          </svg>
        </span>
        <span className="text-[15px]">
          <strong className="font-semibold">Paid</strong> · confirmed by Ana
        </span>
      </article>
    </section>
  );
}
