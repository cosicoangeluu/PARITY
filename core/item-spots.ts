import { assertCentavos, type Centavos } from "./money";

/** Fixed slots keep an early payer's amount unchanged when the next person selects. */
export function spotAmount(total: Centavos, count: number, slot: number): Centavos {
  assertCentavos(total);
  if (
    total < 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 99 ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= count
  ) {
    throw new Error("Invalid item spot.");
  }
  return Math.floor(total / count) + (slot < total % count ? 1 : 0);
}
