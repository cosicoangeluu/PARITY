"use client";

import { useActionState, useMemo, useState } from "react";
import { formatMoney, parseAmount } from "@/core/money";
import { type SplitMode, split } from "@/core/split";
import { PrimaryButton } from "@/ui/Actions";
import { FormStatus } from "@/ui/FormStatus";
import { saveEntry } from "./actions";

export interface FormPerson {
  id: string;
  name: string;
  defaultShare: number;
}

export interface EntryDefaults {
  id: string;
  kind: "expense" | "transfer" | "income";
  title: string;
  amount: string;
  payerId: string;
  recipientId: string | null;
  date: string;
  category: string | null;
  mode: SplitMode;
  members: Record<string, string>;
}

const KINDS = [
  { value: "expense", label: "Expense", hint: "Someone paid for the group" },
  { value: "transfer", label: "Transfer", hint: "Money from one person to another" },
  { value: "income", label: "Income", hint: "The group received money" },
] as const;

const MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "shares", label: "By shares" },
  { value: "percent", label: "By %" },
  { value: "fixed", label: "Fixed amounts" },
];

const CATEGORIES = [
  "Food",
  "Transport",
  "Lodging",
  "Groceries",
  "Bills",
  "Activities",
  "Shopping",
  "Other",
];

export function EntryForm({
  token,
  people,
  meId,
  currency,
  initial,
}: {
  token: string;
  people: FormPerson[];
  meId: string;
  currency: string;
  initial?: EntryDefaults;
}) {
  const [result, action, pending] = useActionState(
    saveEntry.bind(null, token, initial?.id ?? null),
    null,
  );
  const usesDefaultShares = people.some((p) => p.defaultShare !== 1);
  const [kind, setKind] = useState(initial?.kind ?? "expense");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [payerId, setPayerId] = useState(initial?.payerId ?? meId);
  const [mode, setMode] = useState<SplitMode>(
    initial?.mode ?? (usesDefaultShares ? "shares" : "equal"),
  );
  const [showSplit, setShowSplit] = useState(
    initial ? initial.mode !== "equal" : usesDefaultShares,
  );
  const [included, setIncluded] = useState<Set<string>>(
    new Set(initial ? Object.keys(initial.members) : people.map((p) => p.id)),
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const p of people) start[p.id] = initial?.members[p.id] ?? String(p.defaultShare);
    return start;
  });

  const effectiveMode: SplitMode = showSplit ? mode : "equal";
  const preview = useMemo(() => {
    const total = parseAmount(amount);
    if (!total || total <= 0 || kind === "transfer") return null;
    try {
      const members = [...included].map((id) =>
        effectiveMode === "fixed"
          ? { id, amount: parseAmount(values[id] || "0") ?? Number.NaN }
          : { id, weight: effectiveMode === "equal" ? 1 : Number(values[id] || 0) },
      );
      return { ok: true as const, shares: split(total, effectiveMode, members, payerId) };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Check the split.",
      };
    }
  }, [amount, included, effectiveMode, values, payerId, kind]);

  const today = new Date().toLocaleDateString("en-CA");

  return (
    <form action={action} className="card m-card-in flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Entry type"
        className="grid grid-cols-3 gap-1 rounded-full bg-paper p-1"
      >
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            role="tab"
            aria-selected={kind === k.value}
            title={k.hint}
            onClick={() => setKind(k.value)}
            className={`min-h-11 rounded-full text-sm font-semibold ${kind === k.value ? "bg-ink text-paper" : "text-muted-light"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="field md:col-span-2">
          What for?
          <input
            name="title"
            required
            maxLength={80}
            defaultValue={initial?.title}
            placeholder={kind === "income" ? "Deposit returned" : "Dinner at Mang Inasal"}
            className="input"
          />
        </label>
        <label className="field">
          How much? ({currency})
          <input
            name="amount"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input money display text-xl"
          />
        </label>
        <label className="field">
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={initial?.date ?? today}
            className="input"
          />
        </label>
        <label className="field">
          {kind === "income" ? "Who received it?" : kind === "transfer" ? "From" : "Who paid?"}
          <select
            name="payerId"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="input"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === meId ? " (you)" : ""}
              </option>
            ))}
          </select>
        </label>
        {kind === "transfer" ? (
          <label className="field">
            To
            <select
              name="recipientId"
              defaultValue={initial?.recipientId ?? people.find((p) => p.id !== payerId)?.id}
              className="input"
            >
              {people
                .filter((p) => p.id !== payerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
        ) : kind === "expense" ? (
          <label className="field">
            Category
            <select name="category" defaultValue={initial?.category ?? ""} className="input">
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {kind !== "transfer" && (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-semibold">
              {kind === "income" ? "Who shares it?" : "Who was involved?"}
            </legend>
            <button
              type="button"
              className="text-sm font-semibold text-mint-dark underline-offset-4 hover:underline"
              onClick={() => setShowSplit((s) => !s)}
            >
              {showSplit ? "Split equally" : "Split differently"}
            </button>
          </div>
          <input type="hidden" name="mode" value={effectiveMode} />
          {showSplit && (
            <div className="flex flex-wrap gap-1.5">
              {MODES.filter((m) => m.value !== "equal").map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${mode === m.value ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {people.map((p) => {
              const on = included.has(p.id);
              const share = preview?.ok ? preview.shares[p.id] : undefined;
              return (
                <li key={p.id} className="flex min-h-12 items-center gap-3">
                  <label className="flex flex-1 items-center gap-3 text-[15px]">
                    <input
                      type="checkbox"
                      name="members"
                      value={p.id}
                      checked={on}
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
                  {showSplit && on && mode !== "equal" && (
                    <input
                      name={`value:${p.id}`}
                      inputMode="decimal"
                      aria-label={`${p.name} ${mode === "fixed" ? "amount" : mode === "percent" ? "percent" : "shares"}`}
                      value={values[p.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                      className="input money w-24 text-right"
                    />
                  )}
                  <span className="money w-24 text-right text-sm text-muted-light">
                    {on && share !== undefined ? formatMoney(share, currency) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          {preview && !preview.ok && <p className="form-error m-0">{preview.error}</p>}
        </fieldset>
      )}

      <FormStatus result={result} />
      <div className="self-start rounded-full bg-ink p-1.5">
        <PrimaryButton pending={pending} icon="check">
          {initial ? "Save changes" : "Add"}
        </PrimaryButton>
      </div>
    </form>
  );
}
