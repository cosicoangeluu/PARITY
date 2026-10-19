import type { Centavos } from "./money";
import { allocate } from "./split";

export interface BillItem {
  id: string;
  name: string;
  qty: number;
  /** Line total in centavos (qty × unit price). */
  total: Centavos;
  /** Split equally among everyone on the bill, no claiming needed. */
  sharedByAll?: boolean;
}

export interface ItemClaim {
  itemId: string;
  participantId: string;
  /** Units claimed. For single-quantity items everyone who ticks it splits it equally. */
  qty: number;
}

/** Service charge, delivery fee (positive) or a discount for everyone (negative). */
export interface Adjustment {
  label: string;
  amount: Centavos;
}

/** A discount that applies to one person only, e.g. Senior/PWD. */
export interface PersonalDiscount {
  participantId: string;
  label: string;
  amount: Centavos;
}

export interface PersonShare {
  items: { itemId: string; amount: Centavos }[];
  itemsSubtotal: Centavos;
  adjustments: Centavos;
  discount: Centavos;
  total: Centavos;
}

export interface BillComputation {
  perPerson: Record<string, PersonShare>;
  unclaimed: { itemId: string; qtyLeft: number; amount: Centavos }[];
  /** Items where more units were claimed than the receipt has. */
  overclaimed: string[];
  claimedTotal: Centavos;
  unclaimedTotal: Centavos;
}

/**
 * Works out what each person owes for a scanned bill: their items, their part of
 * shared items, their proportional part of service charge / fees / discounts, minus
 * any personal discount. Unclaimed items are reported separately and not charged.
 */
export function computeBill(
  items: readonly BillItem[],
  claims: readonly ItemClaim[],
  participantIds: readonly string[],
  adjustments: readonly Adjustment[] = [],
  personalDiscounts: readonly PersonalDiscount[] = [],
): BillComputation {
  const perPerson: Record<string, PersonShare> = {};
  const ensure = (id: string) => {
    perPerson[id] ??= { items: [], itemsSubtotal: 0, adjustments: 0, discount: 0, total: 0 };
    return perPerson[id];
  };
  for (const id of participantIds) ensure(id);

  const unclaimed: BillComputation["unclaimed"] = [];
  const overclaimed: string[] = [];

  for (const item of items) {
    if (item.sharedByAll) {
      if (participantIds.length === 0) continue;
      const parts = allocate(
        item.total,
        participantIds.map((id) => ({ id, weight: 1 })),
      );
      for (const [id, amount] of Object.entries(parts)) addItem(ensure(id), item.id, amount);
      continue;
    }

    const itemClaims = claims.filter((c) => c.itemId === item.id && c.qty > 0);

    if (item.qty <= 1) {
      if (itemClaims.length === 0) {
        unclaimed.push({ itemId: item.id, qtyLeft: 1, amount: item.total });
        continue;
      }
      const parts = allocate(
        item.total,
        itemClaims.map((c) => ({ id: c.participantId, weight: 1 })),
      );
      for (const [id, amount] of Object.entries(parts)) addItem(ensure(id), item.id, amount);
      continue;
    }

    const claimedUnits = itemClaims.reduce((s, c) => s + c.qty, 0);
    if (claimedUnits > item.qty) overclaimed.push(item.id);
    const leftUnits = Math.max(item.qty - claimedUnits, 0);
    const weights = itemClaims.map((c) => ({ id: c.participantId, weight: c.qty }));
    if (leftUnits > 0) weights.push({ id: "__unclaimed__", weight: leftUnits });
    if (weights.length === 0) continue;

    // When over-claimed, charge by claimed units so the item total is still covered exactly.
    const parts = allocate(item.total, weights);
    for (const [id, amount] of Object.entries(parts)) {
      if (id === "__unclaimed__") unclaimed.push({ itemId: item.id, qtyLeft: leftUnits, amount });
      else addItem(ensure(id), item.id, amount);
    }
  }

  const claimedSubtotal = Object.values(perPerson).reduce((s, p) => s + p.itemsSubtotal, 0);
  const withItems = Object.entries(perPerson)
    .filter(([, p]) => p.itemsSubtotal > 0)
    .map(([id, p]) => ({ id, weight: p.itemsSubtotal }));

  for (const adjustment of adjustments) {
    if (adjustment.amount === 0 || withItems.length === 0 || claimedSubtotal === 0) continue;
    const parts = allocate(adjustment.amount, withItems);
    for (const [id, amount] of Object.entries(parts)) ensure(id).adjustments += amount;
  }

  for (const d of personalDiscounts) ensure(d.participantId).discount += Math.abs(d.amount);

  for (const share of Object.values(perPerson)) {
    share.total = Math.max(share.itemsSubtotal + share.adjustments - share.discount, 0);
  }

  const unclaimedTotal = unclaimed.reduce((s, u) => s + u.amount, 0);
  return { perPerson, unclaimed, overclaimed, claimedTotal: claimedSubtotal, unclaimedTotal };
}

function addItem(share: PersonShare, itemId: string, amount: Centavos) {
  share.items.push({ itemId, amount });
  share.itemsSubtotal += amount;
}
