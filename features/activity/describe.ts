import { formatMoney } from "@/core/money";
import type { ActivityRow } from "@/server/types";

/** One plain-English line per activity entry, naming people, not roles. */
export function describeActivity(
  a: ActivityRow,
  nameOf: (id: string | null) => string,
  currency: string,
): string {
  const who = nameOf(a.actor_id);
  const d = a.detail as Record<string, unknown>;
  const money = (v: unknown) => (typeof v === "number" ? formatMoney(v, currency) : "");
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  switch (a.action) {
    case "group.created":
      return `${who} created the Group`;
    case "participant.joined":
      return `${text(d.name) || who} joined`;
    case "participant.requested":
      return `${text(d.name)} asked to join`;
    case "participant.added":
      return `${who} added ${text(d.name)}`;
    case "participant.approved":
      return `${who} approved ${nameOf(text(d.participantId))}`;
    case "participant.removed":
      return `${who} removed ${nameOf(text(d.participantId))}`;
    case "participant.reset":
      return `${who} reset ${nameOf(text(d.participantId))}'s device`;
    case "participant.share":
      return `${who} set ${nameOf(text(d.participantId))}'s default share to ${String(d.share)}`;
    case "participant.paydetails":
      return `${who} updated their GCash/Maya details`;
    case "entry.added":
      return `${who} added ${text(d.title)} · ${money(d.amount)}`;
    case "entry.edited":
      return `${who} edited ${text(d.title)} · ${money(d.amount)}`;
    case "entry.deleted":
      return `${who} deleted ${text(d.title)} · ${money(d.amount)}`;
    case "entry.restored":
      return `${who} restored an entry`;
    case "bill.created":
      return `${who} scanned ${text(d.title)} (${String(d.items)} items)`;
    case "claim.ticked":
      return `${who} claimed ${text(d.item)}${Number(d.qty) > 1 ? ` ×${String(d.qty)}` : ""}`;
    case "claim.unticked":
      return `${who} unticked ${text(d.item)}`;
    case "bill.item_assigned":
      return `${who} assigned ${text(d.item)}`;
    case "bill.item_edited":
      return `${who} edited ${text(d.item)}${Array.isArray(d.affected) && d.affected.length ? ` (affects ${d.affected.join(", ")})` : ""}`;
    case "bill.item_added":
      return `${who} added ${text(d.item)} to a bill`;
    case "bill.item_deleted":
      return `${who} removed ${text(d.item)} from a bill`;
    case "bill.discount":
      return `${who} set a Senior/PWD discount for ${nameOf(text(d.participantId))}`;
    case "bill.finalized":
      return `${who} finalized ${text(d.title)} · ${money(d.total)}`;
    case "bill.reopened":
      return `${who} reopened a bill`;
    case "bill.fully_paid":
      return `${text(d.title)} is fully paid`;
    case "payment.sent":
      return `${who} paid ${nameOf(text(d.to))} ${money(d.amount)} (pending)`;
    case "payment.confirmed":
      return `${who} confirmed ${money(d.amount)} from ${nameOf(text(d.from))}`;
    case "payment.rejected":
      return `${who} rejected a payment: ${text(d.reason)}`;
    case "group.locked":
      return `${who} locked the Group`;
    case "group.unlocked":
      return `${who} unlocked the Group`;
    case "group.link_replaced":
      return `${who} replaced the Group link`;
    default:
      return `${who} made a change`;
  }
}
