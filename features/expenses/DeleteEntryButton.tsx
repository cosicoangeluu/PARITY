"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/ui/Icon";
import { deleteEntry, restoreEntry } from "./actions";

export function DeleteEntryButton({ token, entryId }: { token: string; entryId: string }) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {error && <span className="form-error-dark">{error}</span>}
      <button
        type="button"
        className="btn-outline min-h-11 text-sm"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("Move this to the trash? You can restore it for 30 days.")) return;
          start(async () => {
            const r = await deleteEntry(token, entryId);
            if (r && !r.ok) setError(r.error);
          });
        }}
      >
        <Icon name="trash" size={16} /> Delete
      </button>
    </span>
  );
}

export function RestoreEntryButton({ token, entryId }: { token: string; entryId: string }) {
  const [isPending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="min-h-11 px-2 text-sm font-semibold text-mint-dark"
      disabled={isPending || done}
      onClick={() =>
        start(async () => {
          const r = await restoreEntry(token, entryId);
          if (r.ok) setDone(true);
        })
      }
    >
      {done ? "Restored" : "Restore"}
    </button>
  );
}
