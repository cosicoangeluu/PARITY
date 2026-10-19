"use client";

import { useActionState, useState, useTransition } from "react";
import { formatMoney, toDecimalString } from "@/core/money";
import { FormStatus } from "@/ui/FormStatus";
import {
  assignItem,
  deleteItem,
  editItem,
  finalizeBill,
  reopenBill,
  setPersonalDiscount,
} from "./actions";

interface Person {
  id: string;
  name: string;
  discount: number;
}

interface Item {
  id: string;
  name: string;
  qty: number;
  total: number;
  unclaimed: boolean;
}

/** Tools for the person who made the list: leftovers, item fixes, Senior/PWD discounts, finalize. */
export function OrganizerPanel({
  billToken,
  status,
  items,
  people,
  payerName,
  currency,
  canFinalize,
  finalizeHint,
}: {
  billToken: string;
  status: "claiming" | "finalized" | "paid";
  items: Item[];
  people: Person[];
  payerName: string;
  currency: string;
  canFinalize: boolean;
  finalizeHint: string | null;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
    });

  if (status !== "claiming") {
    return status === "finalized" ? (
      <div className="glass flex flex-wrap items-center justify-between gap-3">
        <span className="text-[15px] text-muted-dark">
          Bill is finalized. Reopen it to change items or claims.
        </span>
        <button
          type="button"
          className="btn-outline"
          disabled={isPending}
          onClick={() => act(() => reopenBill(billToken))}
        >
          Reopen
        </button>
        {error && <p className="form-error-dark m-0 w-full">{error}</p>}
      </div>
    ) : null;
  }

  const unclaimed = items.filter((i) => i.unclaimed);
  return (
    <div className="card flex flex-col gap-5">
      <h3 className="display m-0 text-lg font-bold">For you, as the person who made the list</h3>

      {unclaimed.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Leftover items</span>
          {unclaimed.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-[15px]">{item.name}</span>
              <select
                aria-label={`Assign ${item.name}`}
                className="input w-auto"
                defaultValue=""
                disabled={isPending}
                onChange={(e) =>
                  e.target.value && act(() => assignItem(billToken, item.id, e.target.value))
                }
              >
                <option value="" disabled>
                  Assign…
                </option>
                <option value="all">Split among everyone</option>
                <option value="payer">Keep ({payerName})</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    Give to {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <details className="flex flex-col gap-2">
        <summary className="cursor-pointer text-sm font-semibold">Fix or add items</summary>
        <p className="m-0 my-2 text-[13px] text-muted-light">
          People who claimed an item see your change in the activity log.
        </p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((item) => (
            <li key={item.id}>
              {editing === item.id ? (
                <ItemEditor billToken={billToken} item={item} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex min-h-11 items-center gap-2">
                  <span className="flex-1 text-[15px]">
                    {item.qty > 1 ? `${item.qty}× ` : ""}
                    {item.name}
                  </span>
                  <span className="money text-sm">{formatMoney(item.total, currency)}</span>
                  <button
                    type="button"
                    className="min-h-11 px-2 text-sm font-semibold text-mint-dark"
                    onClick={() => setEditing(item.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-danger-text"
                    onClick={() => act(() => deleteItem(billToken, item.id))}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {editing === "new" ? (
          <ItemEditor billToken={billToken} onDone={() => setEditing(null)} />
        ) : (
          <button
            type="button"
            className="btn-outline-light self-start"
            onClick={() => setEditing("new")}
          >
            Add an item
          </button>
        )}
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Senior/PWD discount for one person
        </summary>
        <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
          {people.map((p) => (
            <li key={p.id}>
              <DiscountForm billToken={billToken} person={p} />
            </li>
          ))}
        </ul>
      </details>

      {error && <p className="form-error m-0">{error}</p>}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn-ink self-start"
          disabled={!canFinalize || isPending}
          onClick={() => act(() => finalizeBill(billToken))}
        >
          Finalize the bill
        </button>
        {finalizeHint && <span className="text-[13px] text-muted-light">{finalizeHint}</span>}
      </div>
    </div>
  );
}

function ItemEditor({
  billToken,
  item,
  onDone,
}: {
  billToken: string;
  item?: Item;
  onDone: () => void;
}) {
  const [result, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof editItem>> | null, form: FormData) => {
      const r = await editItem(billToken, item?.id ?? null, prev, form);
      if (r.ok) onDone();
      return r;
    },
    null,
  );
  return (
    <form action={action} className="grid grid-cols-[1fr_56px_96px] gap-2 rounded-2xl bg-paper p-2">
      <input
        name="name"
        aria-label="Item name"
        defaultValue={item?.name}
        required
        className="input"
      />
      <input
        name="qty"
        aria-label="Quantity"
        defaultValue={item?.qty ?? 1}
        inputMode="numeric"
        className="input money px-2 text-center"
      />
      <input
        name="total"
        aria-label="Line total"
        defaultValue={item ? toDecimalString(item.total) : ""}
        inputMode="decimal"
        required
        className="input money px-2 text-right"
      />
      <div className="col-span-3 flex items-center gap-2">
        <button type="submit" className="btn-ink" disabled={pending}>
          Save
        </button>
        <button type="button" className="btn-outline-light" onClick={onDone}>
          Cancel
        </button>
        <FormStatus result={result} />
      </div>
    </form>
  );
}

function DiscountForm({ billToken, person }: { billToken: string; person: Person }) {
  const [result, action, pending] = useActionState(
    setPersonalDiscount.bind(null, billToken, person.id),
    null,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="min-w-24 flex-1 text-[15px]">{person.name}</span>
      <input
        name="amount"
        aria-label={`Discount for ${person.name}`}
        inputMode="decimal"
        defaultValue={person.discount ? toDecimalString(person.discount) : ""}
        placeholder="0.00"
        className="input money w-28 text-right"
      />
      <button type="submit" className="btn-outline-light" disabled={pending}>
        Save
      </button>
      <FormStatus result={result} />
    </form>
  );
}
