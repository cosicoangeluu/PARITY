import "server-only";
import type { Centavos } from "@/core/money";
import { computeBalances, type LedgerEntry, settleUp, type Transfer } from "@/core/settle";
import { type GroupContext, groupBills } from "@/server/access";
import { db, must } from "@/server/db";
import type { ActivityRow, BillRow, EntryRow, PaymentRow } from "@/server/types";

export interface Ledger {
  entries: EntryRow[];
  payments: PaymentRow[];
  balances: Record<string, Centavos>;
  transfers: Transfer[];
  openBills: BillRow[];
}

export async function loadLedger(ctx: GroupContext): Promise<Ledger> {
  const [entries, payments, bills] = await Promise.all([
    db()
      .from("entries")
      .select("*, entry_splits(participant_id, amount, weight)")
      .eq("group_id", ctx.group.id)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    db()
      .from("payments")
      .select("*")
      .eq("group_id", ctx.group.id)
      .order("created_at", { ascending: false }),
    groupBills(ctx),
  ]);
  const openBills = bills.filter((b) => b.status === "claiming");
  const openIds = new Set(openBills.map((b) => b.id));
  // Early transfers belong to the open bill until its expense is posted at finalization.
  const entryRows = (must(entries, "Load entries") as EntryRow[]).filter(
    (e) => !e.bill_id || !openIds.has(e.bill_id),
  );
  const paymentRows = must(payments, "Load payments") as PaymentRow[];

  const ledger: LedgerEntry[] = entryRows.map((e) => ({
    kind: e.kind,
    payerId: e.payer_id,
    recipientId: e.recipient_id,
    amount: e.amount,
    splits: Object.fromEntries((e.entry_splits ?? []).map((s) => [s.participant_id, s.amount])),
  }));
  const balances = computeBalances(
    ledger,
    ctx.participants.map((p) => p.id),
  );
  return {
    entries: entryRows,
    payments: paymentRows,
    balances,
    transfers: settleUp(balances),
    openBills,
  };
}

export async function loadOpenBills(groupId: string): Promise<BillRow[]> {
  return must(
    await db()
      .from("bills")
      .select("*")
      .eq("group_id", groupId)
      .neq("status", "paid")
      .order("created_at", { ascending: false }),
    "Load bills",
  ) as BillRow[];
}

export async function loadActivity(groupId: string, limit = 50): Promise<ActivityRow[]> {
  return must(
    await db()
      .from("activity")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(limit),
    "Load activity",
  ) as ActivityRow[];
}

export async function loadTrash(groupId: string): Promise<EntryRow[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  return must(
    await db()
      .from("entries")
      .select("*")
      .eq("group_id", groupId)
      .not("deleted_at", "is", null)
      .gte("deleted_at", since)
      .order("deleted_at", { ascending: false }),
    "Load trash",
  ) as EntryRow[];
}

export function nameLookup(ctx: GroupContext) {
  const names = new Map(ctx.participants.map((p) => [p.id, p.name]));
  return (id: string | null | undefined) => (id ? (names.get(id) ?? "Someone") : "Someone");
}
