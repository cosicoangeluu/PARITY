import type { Centavos } from "./money";

/** Pending money is already sent, but is not counted as confirmed payment. */
export function paymentProgress(share: Centavos, confirmed: Centavos, pending: Centavos) {
  return {
    remaining: Math.max(share - confirmed - pending, 0),
    outstanding: Math.max(share - confirmed, 0),
    refund: Math.max(confirmed - share, 0),
    pendingExcess: Math.max(confirmed + pending - Math.max(share, confirmed), 0),
  };
}

/** Overpayments still need returning; they must not count as a fully settled bill. */
export function billPaymentsComplete(
  shares: Record<string, { total: Centavos }>,
  paidBy: Record<string, Centavos>,
  payerId: string,
): boolean {
  return [...new Set([...Object.keys(shares), ...Object.keys(paidBy)])].every(
    (id) => id === payerId || (paidBy[id] ?? 0) === (shares[id]?.total ?? 0),
  );
}
