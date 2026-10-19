import type { Centavos } from "./money";

export type EntryKind = "expense" | "transfer" | "income";

export interface LedgerEntry {
  kind: EntryKind;
  /** Expense: who paid. Transfer: who sent the money. Income: who received it for the group. */
  payerId: string;
  /** Transfer only: who received the money. */
  recipientId?: string | null;
  amount: Centavos;
  /** Expense and income: each person's share. */
  splits?: Record<string, Centavos>;
}

export interface Transfer {
  from: string;
  to: string;
  amount: Centavos;
}

/**
 * Net balance per person. Positive = the group owes them; negative = they owe the group.
 * The balances of everyone always add up to zero.
 */
export function computeBalances(
  entries: readonly LedgerEntry[],
  participantIds: readonly string[],
): Record<string, Centavos> {
  const balances: Record<string, Centavos> = {};
  for (const id of participantIds) balances[id] = 0;
  const add = (id: string, value: Centavos) => {
    balances[id] = (balances[id] ?? 0) + value;
  };

  for (const entry of entries) {
    switch (entry.kind) {
      case "expense":
        add(entry.payerId, entry.amount);
        for (const [id, share] of Object.entries(entry.splits ?? {})) add(id, -share);
        break;
      case "income":
        add(entry.payerId, -entry.amount);
        for (const [id, share] of Object.entries(entry.splits ?? {})) add(id, share);
        break;
      case "transfer":
        if (!entry.recipientId) throw new Error("A transfer needs a recipient.");
        add(entry.payerId, entry.amount);
        add(entry.recipientId, -entry.amount);
        break;
    }
  }
  return balances;
}

/**
 * The fewest transfers that settle every balance: everyone who owes puts money in
 * the middle of the table, everyone who is owed takes it out. Largest amounts are
 * matched first, so most people make at most one payment.
 */
export function settleUp(balances: Record<string, Centavos>): Transfer[] {
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, left: -v }))
    .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, left: v }))
    .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].left, creditors[c].left);
    if (amount > 0) transfers.push({ from: debtors[d].id, to: creditors[c].id, amount });
    debtors[d].left -= amount;
    creditors[c].left -= amount;
    if (debtors[d].left === 0) d++;
    if (creditors[c].left === 0) c++;
  }
  return transfers;
}
