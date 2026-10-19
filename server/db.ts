import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/**
 * The service-role Supabase client. It bypasses Row Level Security, so it must only be
 * used behind the checks in server/access.ts. Never import this from a client component.
 */
export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Throws on a Supabase error so callers can't silently ignore one. With `.single()` Supabase
 * reports a missing row as an error, so the data is never null when this returns.
 */
export function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as NonNullable<T>;
}
