import "server-only";
import { headers } from "next/headers";
import { AccessError } from "./access";
import { db } from "./db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Counts a hit in Postgres and throws when the limit is passed. Keeps bots from using up
 * the free database, storage and receipt-reading quotas.
 */
export async function rateLimit(key: string, windowSeconds: number, max: number): Promise<void> {
  const { data, error } = await db().rpc("hit_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) throw new Error(`Rate limit: ${error.message}`);
  if (data === false) throw new AccessError("Too many tries. Please wait a bit and try again.");
}
