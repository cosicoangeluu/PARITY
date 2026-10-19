import "server-only";

/**
 * Exchange rates from the free Frankfurter API (no key). Uses the rate for the expense's own
 * date, as the spec asks. Cached by Next's fetch cache for 12 hours.
 */
export async function getRate(from: string, to: string, date: string): Promise<number> {
  if (from === to) return 1;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "latest";
  const response = await fetch(`https://api.frankfurter.dev/v1/${day}?base=${from}&symbols=${to}`, {
    next: { revalidate: 60 * 60 * 12 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Exchange rate unavailable (${response.status})`);
  const body = (await response.json()) as { rates?: Record<string, number> };
  const rate = body.rates?.[to];
  if (!rate) throw new Error(`No ${from}→${to} rate for ${day}`);
  return rate;
}
