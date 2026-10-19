import type { CSSProperties } from "react";

/**
 * The Parity mark: a rounded square holding two equal bars (everyone's share, made even).
 * Proportions are fixed by DESIGN.md section 2; never redraw it by hand.
 */
export function Mark({
  size = 36,
  tone = "dark",
  className,
  style,
  barClassNames,
  label,
}: {
  size?: number | string;
  /** "dark" = Ink square (on light backgrounds), "light" = Paper square (on the Ink stage). */
  tone?: "dark" | "light";
  className?: string;
  style?: CSSProperties;
  barClassNames?: [string, string];
  label?: string;
}) {
  const square = tone === "dark" ? "var(--ink)" : "var(--paper)";
  const top = tone === "dark" ? "var(--mint)" : "var(--mint-dark)";
  const bottom = tone === "dark" ? "var(--coral)" : "var(--coral-dark)";
  const bar: CSSProperties = { display: "block", width: "52%", height: "13%", borderRadius: 999 };
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-mark)",
        background: square,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12%",
        flex: "none",
        ...style,
      }}
    >
      <span className={barClassNames?.[0]} style={{ ...bar, background: top }} />
      <span className={barClassNames?.[1]} style={{ ...bar, background: bottom }} />
    </span>
  );
}
