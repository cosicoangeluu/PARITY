import { toDecimalString } from "@/core/money";
import { loadLedger, nameLookup } from "@/features/groups/queries";
import { loadGroupContext } from "@/server/access";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Exports every entry, each person's balance and the settle-up list as CSV
 * (opens in Excel, Numbers, Google Sheets).
 */
export async function GET(_request: Request, { params }: RouteContext<"/g/[token]/export">) {
  const { token } = await params;
  const ctx = await loadGroupContext(token);
  if (!ctx) return new Response("Not found", { status: 404 });
  const ledger = await loadLedger(ctx);
  const nameOf = nameLookup(ctx);
  const people = ctx.participants;

  const rows: (string | number)[][] = [];
  rows.push([`Parity export: ${ctx.group.name}`, `Currency: ${ctx.group.currency}`]);
  rows.push([]);
  rows.push([
    "Date",
    "Type",
    "Title",
    "Category",
    "Paid by",
    "To",
    "Amount",
    ...people.map((p) => `Share: ${p.name}`),
  ]);
  for (const e of [...ledger.entries].reverse()) {
    const shares = new Map((e.entry_splits ?? []).map((s) => [s.participant_id, s.amount]));
    rows.push([
      e.entry_date,
      e.kind,
      e.title,
      e.category ?? "",
      nameOf(e.payer_id),
      e.recipient_id ? nameOf(e.recipient_id) : "",
      toDecimalString(e.amount),
      ...people.map((p) => (shares.has(p.id) ? toDecimalString(shares.get(p.id) ?? 0) : "")),
    ]);
  }
  rows.push([]);
  rows.push(["Balances (positive = is owed money)"]);
  for (const p of people) rows.push([p.name, toDecimalString(ledger.balances[p.id] ?? 0)]);
  rows.push([]);
  rows.push(["How to settle all debts", "", ""]);
  rows.push(["From", "To", "Amount"]);
  for (const t of ledger.transfers)
    rows.push([nameOf(t.from), nameOf(t.to), toDecimalString(t.amount)]);

  const csv = `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`;
  const filename = `${ctx.group.name.replace(/[^\w-]+/g, "-").slice(0, 40) || "parity"}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
