/** Stroke icons (2px, round caps), drawn inline so they follow currentColor. */
const PATHS = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12l5 5L19 7",
  scan: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10",
  plus: "M12 5v14M5 12h14",
  copy: "M9 9h10v10H9zM5 15V5h10",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  x: "M6 6l12 12M18 6L6 18",
  back: "M19 12H5M11 18l-6-6 6-6",
  download: "M12 4v12M6 10l6 6 6-6M4 20h16",
  home: "M4 11l8-7 8 7v9H4z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  swap: "M7 7h13l-4-4M17 17H4l4 4",
  people:
    "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  lock: "M6 11h12v9H6zM8 11V7a4 4 0 0 1 8 0v4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
