"use client";

import { useState } from "react";
import { BulkEntryForm } from "./BulkEntryForm";
import { EntryForm, type FormPerson } from "./EntryForm";

/** The add-entry screen: one detailed entry, or a quick list of several expenses. */
export function NewEntry(props: {
  token: string;
  people: FormPerson[];
  meId: string;
  currency: string;
}) {
  const [many, setMany] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="How many entries"
        className="grid grid-cols-2 gap-1 self-start rounded-full border border-white/15 bg-white/5 p-1"
      >
        {[
          { value: false, label: "One entry" },
          { value: true, label: "Several at once" },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={many === t.value}
            onClick={() => setMany(t.value)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${many === t.value ? "bg-paper text-ink" : "text-subtle-dark"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {many ? <BulkEntryForm {...props} /> : <EntryForm {...props} />}
    </div>
  );
}
