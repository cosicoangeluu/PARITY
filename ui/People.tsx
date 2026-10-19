const COLORS = ["var(--mint)", "var(--coral)", "var(--lavender)"];

function colorFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export function Avatar({
  id,
  name,
  size = 28,
  ring = false,
}: {
  id: string;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      title={name}
      className="inline-flex flex-none items-center justify-center rounded-full font-semibold text-ink"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.4),
        background: colorFor(id),
        border: ring ? "2px solid #fff" : undefined,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 26,
}: {
  people: { id: string; name: string }[];
  size?: number;
}) {
  return (
    <span className="inline-flex" role="img" aria-label={people.map((p) => p.name).join(", ")}>
      {people.map((p, i) => (
        <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar id={p.id} name={p.name} size={size} ring />
        </span>
      ))}
    </span>
  );
}

type Status =
  | "paid"
  | "pending"
  | "unpaid"
  | "rejected"
  | "unclaimed"
  | "claiming"
  | "done"
  | "opened"
  | "not-opened";

const LABELS: Record<Status, string> = {
  paid: "Paid",
  pending: "Pending",
  unpaid: "Not paid",
  rejected: "Rejected",
  unclaimed: "Unclaimed",
  claiming: "Claiming",
  done: "Done claiming",
  opened: "Opened",
  "not-opened": "Not opened yet",
};

/** Status pills from DESIGN.md section 7, for use on white cards. */
export function StatusPill({ status, children }: { status: Status; children?: React.ReactNode }) {
  const label = children ?? LABELS[status];
  if (status === "paid" || status === "done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-[13px] font-semibold text-mint-dark">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5L19 7" />
        </svg>
        {label}
      </span>
    );
  }
  if (status === "pending" || status === "claiming") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-mint-soft px-2.5 py-1 text-[13px] font-semibold text-mint-dark">
        <span className="m-pulse size-2 rounded-full bg-mint" />
        {label}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-[var(--coral-soft)] px-2.5 py-1 text-[13px] font-semibold text-coral-dark">
        {label}
      </span>
    );
  }
  if (status === "unclaimed" || status === "not-opened") {
    return <span className="row-dashed text-muted-light">{label}</span>;
  }
  return (
    <span className="rounded-full border border-line px-2.5 py-1 text-[13px] text-muted-light">
      {label}
    </span>
  );
}
