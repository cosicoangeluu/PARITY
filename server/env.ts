import "server-only";

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Server-only settings. Read lazily so `next build` works without secrets. */
export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  geminiKey: () => optional("GEMINI_API_KEY"),
  geminiModel: () => optional("GEMINI_MODEL") ?? "gemini-2.5-flash-lite",
  ocrSpaceKey: () => optional("OCR_SPACE_API_KEY"),
  turnstileSecret: () => optional("TURNSTILE_SECRET_KEY"),
  dailyScanLimitPerGroup: () => Number(optional("DAILY_SCAN_LIMIT_PER_GROUP") ?? 30),
  isProduction: () => process.env.NODE_ENV === "production",
};
