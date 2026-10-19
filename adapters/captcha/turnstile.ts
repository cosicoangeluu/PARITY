import "server-only";
import { env } from "@/server/env";

/**
 * Verifies a Cloudflare Turnstile token (free). When no secret is configured (local dev),
 * the check is skipped.
 */
export async function verifyHuman(token: string | null, ip: string): Promise<boolean> {
  const secret = env.turnstileSecret();
  if (!secret) return true;
  if (!token) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(8000),
  });
  const body = (await response.json()) as { success?: boolean };
  return body.success === true;
}
