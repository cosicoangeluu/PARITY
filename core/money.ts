/**
 * Money in Parity is always an integer number of centavos (₱1.00 = 100).
 * Never store or add pesos as floats.
 */
export type Centavos = number;

export function assertCentavos(value: number): Centavos {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Not a whole number of centavos: ${value}`);
  }
  return value;
}

/** Parses "₱1,234.50", "1234.5" or "1234" into centavos. Returns null when it is not a valid amount. */
export function parseAmount(input: string): Centavos | null {
  const cleaned = input.replace(/[₱,\s]|PHP/gi, "").trim();
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return sign ? -value : value;
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Formats centavos for display, e.g. 128650 → "₱1,286.50". */
export function formatMoney(amount: Centavos, currency = "PHP"): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount / 100);
}

/** Centavos as a plain decimal string for inputs, e.g. 128650 → "1286.50". */
export function toDecimalString(amount: Centavos): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function sum(values: readonly Centavos[]): Centavos {
  return values.reduce((total, value) => total + value, 0);
}
