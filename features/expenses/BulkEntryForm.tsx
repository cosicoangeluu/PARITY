"use client";

import { useActionState, useRef, useState } from "react";
import { formatMoney, parseAmount } from "@/core/money";
import { PrimaryButton } from "@/ui/Actions";
import { FormStatus } from "@/ui/FormStatus";
import { Icon } from "@/ui/Icon";
import { saveEntries } from "./actions";
import type { FormPerson } from "./EntryForm";

interface Line {
  key: number;
  title: string;
  amount: string;
  payerId: string;
}

const EXAMPLES = ["Sisig", "Halo-halo", "Grab to the beach", "Groceries"];

/** Several expenses in one go, each split equally among the same people. */
export function BulkEntryForm({
  token,
  people,
  meId,
  currency,
}: {
  token: string;
  people: FormPerson[];
  meId: string;
  currency: string;
}) {
  const [result, action, pending] = useActionState(saveEntries.bind(null, token), null);
  const nextKey = useRef(3);
  const blank = (key: number): Line => ({ key, title: "", amount: "", payerId: meId });
  const [lines, setLines] = useState<Line[]>([blank(0), blank(1), blank(2)]);
  const [included, setIncluded] = useState<Set<string>>(new Set(people.map((p) => p.id)));

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + Math.max(parseAmount(l.amount) ?? 0, 0), 0);
  const filled = lines.filter((l) => l.title.trim() || l.amount.trim()).length;
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <form action={action} className="card m-card-in flex flex-col gap-5">
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {lines.map((l, i) => (
          <li key={l.key} className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-muted-light">Line {i + 1}</span>
              {lines.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove line ${i + 1}`}
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                  className="flex size-11 items-center justify-center rounded-full text-muted-light hover:text-ink"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-[1fr_7.5rem] gap-2 sm:grid-cols-[1fr_8rem_10rem]">
              <input
                name="title"
                maxLength={80}
                aria-label={`Line ${i + 1}: what for?`}
                placeholder={EXAMPLES[i % EXAMPLES.length]}
                value={l.title}
                onChange={(e) => update(l.key, { title: e.target.value })}
                className="input"
              />
              <input
                name="amount"
                inputMode="decimal"
                aria-label={`Line ${i + 1}: how much? (${currency})`}
                placeholder="0.00"
                value={l.amount}
                onChange={(e) => update(l.key, { amount: e.target.value })}
                className="input money text-right"
              />
              <select
                name="payerId"
                aria-label={`Line ${i + 1}: who paid?`}
                value={l.payerId}
                onChange={(e) => update(l.key, { payerId: e.target.value })}
                className="input col-span-2 sm:col-span-1"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === meId ? `${p.name} (you)` : p.name} paid
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            const key = nextKey.current++;
            setLines((ls) => [...ls, { ...blank(key), payerId: ls.at(-1)?.payerId ?? meId }]);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
        >
          <Icon name="plus" size={16} />
          Add a line
        </button>
        <span className="text-sm text-muted-light">
          {filled} {filled === 1 ? "entry" : "entries"} ·{" "}
          <span className="money font-semibold text-ink">{formatMoney(total, currency)}</span>
        </span>
      </div>

      <label className="field">
        Date
        <input name="date" type="date" required defaultValue={today} className="input" />
      </label>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Who was involved?</legend>
        <p className="m-0 text-[13px] text-muted-light">
          Each line is split equally among these people. To split one differently, edit it after.
        </p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {people.map((p) => (
            <li key={p.id} className="flex min-h-12 items-center">
              <label className="flex flex-1 items-center gap-3 text-[15px]">
                <input
                  type="checkbox"
                  name="members"
                  value={p.id}
                  checked={included.has(p.id)}
                  onChange={() =>
                    setIncluded((set) => {
                      const next = new Set(set);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    })
                  }
                  className="size-5 accent-[var(--mint-dark)]"
                />
                {p.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <FormStatus result={result} />
      <div className="self-start rounded-full bg-ink p-1.5">
        <PrimaryButton pending={pending} icon="check">
          {filled > 1 ? `Add ${filled} entries` : "Add"}
        </PrimaryButton>
      </div>
    </form>
  );
}
