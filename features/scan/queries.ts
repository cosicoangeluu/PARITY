import "server-only";
import { type BillComputation, computeBill } from "@/core/bill";
import { type GroupContext, loadGroupContextById, logActivity } from "@/server/access";
import { db, must } from "@/server/db";
import { removeImages } from "@/server/storage";
import type { BillItemRow, BillRow, PaymentRow } from "@/server/types";

export interface BillView {
  bill: BillRow;
  ctx: GroupContext;
  items: BillItemRow[];
  claims: { item_id: string; participant_id: string; qty: number }[];
  adjustments: { id: string; label: string; amount: number }[];
  discounts: { participant_id: string; label: string; amount: number }[];
  members: { participant_id: string; opened_at: string | null; done_at: string | null }[];
  payments: PaymentRow[];
  computation: BillComputation;
  /** The person who made the list (scanner) or the Group organizer. */
  isBillOrganizer: boolean;
  isPayee: boolean;
  /** Confirmed amount each person has paid toward this bill. */
  paidBy: Record<string, number>;
}

export async function loadBill(token: string): Promise<BillView | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const { data: bill } = await db()
    .from("bills")
    .select("*")
    .eq("token", token)
    .maybeSingle<BillRow>();
  if (!bill) return null;

  const [ctx, items, adjustments, discounts, members, payments] = await Promise.all([
    loadGroupContextById(bill.group_id),
    db().from("bill_items").select("*").eq("bill_id", bill.id).order("position"),
    db().from("bill_adjustments").select("id, label, amount").eq("bill_id", bill.id),
    db().from("personal_discounts").select("participant_id, label, amount").eq("bill_id", bill.id),
    db().from("bill_members").select("participant_id, opened_at, done_at").eq("bill_id", bill.id),
    db()
      .from("payments")
      .select("*")
      .eq("bill_id", bill.id)
      .order("created_at", { ascending: false }),
  ]);
  const itemRows = must(items, "Load items") as BillItemRow[];
  const claims = itemRows.length
    ? (must(
        await db()
          .from("item_claims")
          .select("item_id, participant_id, qty")
          .in(
            "item_id",
            itemRows.map((i) => i.id),
          ),
        "Load claims",
      ) as BillView["claims"])
    : [];
  const adjustmentRows = must(adjustments, "Load adjustments") as BillView["adjustments"];
  const discountRows = must(discounts, "Load discounts") as BillView["discounts"];
  const memberRows = must(members, "Load members") as BillView["members"];
  const paymentRows = must(payments, "Load payments") as PaymentRow[];

  const people = new Set<string>(memberRows.map((m) => m.participant_id));
  for (const c of claims) people.add(c.participant_id);
  people.add(bill.payer_id);
  const participantIds = ctx.participants.filter((p) => people.has(p.id)).map((p) => p.id);

  const computation = computeBill(
    itemRows.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      total: i.total,
      sharedByAll: i.shared_by_all,
    })),
    claims.map((c) => ({ itemId: c.item_id, participantId: c.participant_id, qty: c.qty })),
    participantIds,
    adjustmentRows.map((a) => ({ label: a.label, amount: a.amount })),
    discountRows.map((d) => ({
      participantId: d.participant_id,
      label: d.label,
      amount: d.amount,
    })),
  );

  const paidBy: Record<string, number> = {};
  for (const p of paymentRows) {
    if (p.status === "confirmed" && p.to_id === bill.payer_id)
      paidBy[p.from_id] = (paidBy[p.from_id] ?? 0) + p.amount;
  }

  return {
    bill,
    ctx,
    items: itemRows,
    claims,
    adjustments: adjustmentRows,
    discounts: discountRows,
    members: memberRows,
    payments: paymentRows,
    computation,
    isBillOrganizer: ctx.isOrganizer || (!!ctx.me && ctx.me.id === bill.created_by),
    isPayee: !!ctx.me && ctx.me.id === bill.payer_id,
    paidBy,
  };
}

/** True when everyone except the payer has confirmed payments covering their share. */
export function isFullyPaid(view: Pick<BillView, "bill" | "computation" | "paidBy">): boolean {
  return Object.entries(view.computation.perPerson).every(
    ([id, share]) =>
      id === view.bill.payer_id || share.total === 0 || (view.paidBy[id] ?? 0) >= share.total,
  );
}

/** When a bill becomes fully paid the receipt photos are no longer needed: delete them. */
export async function markBillPaid(view: BillView): Promise<void> {
  await removeImages("receipts", view.bill.image_paths);
  await db()
    .from("bills")
    .update({ status: "paid", paid_at: new Date().toISOString(), image_paths: [] })
    .eq("id", view.bill.id);
  await logActivity(view.ctx, "bill.fully_paid", { billId: view.bill.id, title: view.bill.title });
}
