/** Film grain overlay from DESIGN.md (inline SVG noise, no image file needed). */
export function Grain({
  id,
  opacity = 0.18,
  blend = "overlay",
  frequency = 0.9,
}: {
  id: string;
  opacity?: number;
  blend?: "overlay" | "multiply";
  frequency?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity, mixBlendMode: blend }}
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency={frequency}
          numOctaves={3}
          stitchTiles="stitch"
        />
        {blend === "multiply" && (
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.32  0 0 0 0 0.26  0 0 0 0.35 0" />
        )}
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}
