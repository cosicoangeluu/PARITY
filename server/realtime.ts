import "server-only";
import { env } from "./env";

/**
 * Tells open pages that something changed, via Supabase Realtime broadcast (free plan).
 * Pages listen on `topic` and refresh. Failures are ignored: pages also poll as a fallback.
 */
export async function broadcastChange(topic: string): Promise<void> {
  try {
    await fetch(`${env.supabaseUrl()}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceKey(),
        Authorization: `Bearer ${env.supabaseServiceKey()}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event: "changed", payload: { at: Date.now() } }],
      }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // Polling picks the change up.
  }
}
