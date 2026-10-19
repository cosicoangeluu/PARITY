import { type Centavos, sum } from "./money";

export type SplitMode = "equal" | "shares" | "percent" | "fixed";

export class SplitError extends Error {}

export interface SplitMember {
  id: string;
  /** Shares or percent, depending on the mode. Ignored for "equal". */
  weight?: number;
  /** Only for "fixed". */
  amount?: Centavos;
}

export type Allocation = Record<string, Centavos>;

/**
 * Divides `total` centavos by weight so the parts always add up exactly to the total.
 * Leftover centavos go to `remainderTo` when given (the payer), otherwise to the
 * largest fractional parts in order.
 */
export function allocate(
  total: Centavos,
  weights: readonly { id: string; weight: number }[],
  remainderTo?: string,
): Allocation {
  const active = weights.filter((w) => w.weight > 0);
  if (active.length === 0) throw new SplitError("Pick at least one person to split with.");
  const weightSum = active.reduce((s, w) => s + w.weight, 0);
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);

  const parts = active.map((w, index) => {
    const exact = (abs * w.weight) / weightSum;
    const floor = Math.floor(exact);
    return { id: w.id, floor, fraction: exact - floor, index };
  });

  let leftover = abs - parts.reduce((s, p) => s + p.floor, 0);
  const result: Allocation = {};
  for (const p of parts) result[p.id] = p.floor;

  if (leftover > 0 && remainderTo && remainderTo in result) {
    result[remainderTo] += leftover;
    leftover = 0;
  }
  const byFraction = [...parts].sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; leftover > 0; i = (i + 1) % byFraction.length, leftover--) {
    result[byFraction[i].id] += 1;
  }

  if (sign < 0) for (const id of Object.keys(result)) result[id] = -result[id];
  return result;
}

/** Splits an expense according to the chosen mode. The result always sums to `total`. */
export function split(
  total: Centavos,
  mode: SplitMode,
  members: readonly SplitMember[],
  payerId?: string,
): Allocation {
  if (total <= 0) throw new SplitError("The amount must be more than zero.");
  if (members.length === 0) throw new SplitError("Pick at least one person to split with.");

  switch (mode) {
    case "equal":
      return allocate(
        total,
        members.map((m) => ({ id: m.id, weight: 1 })),
        payerId,
      );
    case "shares": {
      const weights = members.map((m) => ({ id: m.id, weight: m.weight ?? 0 }));
      if (weights.some((w) => w.weight < 0)) throw new SplitError("Shares can't be negative.");
      return allocate(total, weights, payerId);
    }
    case "percent": {
      const weights = members.map((m) => ({ id: m.id, weight: m.weight ?? 0 }));
      const totalPercent = weights.reduce((s, w) => s + w.weight, 0);
      if (Math.abs(totalPercent - 100) > 0.001) {
        throw new SplitError(`Percentages add up to ${round2(totalPercent)}%, not 100%.`);
      }
      return allocate(total, weights, payerId);
    }
    case "fixed": {
      const result: Allocation = {};
      for (const m of members) {
        if (!Number.isSafeInteger(m.amount ?? Number.NaN) || (m.amount ?? 0) < 0) {
          throw new SplitError("Every fixed amount must be zero or more.");
        }
        if ((m.amount ?? 0) > 0) result[m.id] = m.amount ?? 0;
      }
      const assigned = sum(Object.values(result));
      if (assigned !== total) {
        throw new SplitError(
          `Fixed amounts add up to ${(assigned / 100).toFixed(2)}, not ${(total / 100).toFixed(2)}.`,
        );
      }
      return result;
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
