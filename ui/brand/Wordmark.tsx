import Link from "next/link";
import { Mark } from "./Mark";

/** "parity", always lowercase, Bricolage Grotesque. */
export function Wordmark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: size >= 60 ? 800 : 700,
        fontSize: size,
        letterSpacing: size >= 60 ? "-0.045em" : "-0.02em",
        lineHeight: 1,
      }}
    >
      parity
    </span>
  );
}

/** Mark + wordmark lockup used in headers, linking home. */
export function Lockup({ tone = "light" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      aria-label="Parity home"
      className="inline-flex min-h-11 items-center gap-2.5 no-underline"
    >
      <Mark size={30} tone={tone} />
      <Wordmark size={22} className={tone === "light" ? "text-paper" : "text-ink"} />
    </Link>
  );
}
