"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps a page live: listens for Supabase Realtime broadcasts on `topic` (free plan) and
 * refreshes the server data. Also polls every `pollMs` while the tab is visible, in case
 * Realtime is unavailable.
 */
export function LiveRefresh({ topic, pollMs = 15000 }: { topic: string; pollMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let cleanup: (() => void) | undefined;
    if (url && anon) {
      const client = createClient(url, anon, { auth: { persistSession: false } });
      const channel = client
        .channel(topic)
        .on("broadcast", { event: "changed" }, () => router.refresh())
        .subscribe();
      cleanup = () => {
        client.removeChannel(channel);
      };
    }
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, pollMs);
    return () => {
      clearInterval(timer);
      cleanup?.();
    };
  }, [topic, pollMs, router]);

  return null;
}
