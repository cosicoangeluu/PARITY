"use client";

import { useActionState, useId, useRef, useState } from "react";
import { spotAmount } from "@/core/item-spots";
import { formatMoney, parseAmount } from "@/core/money";
import { PrimaryButton } from "@/ui/Actions";
import { FieldHelp } from "@/ui/FieldHelp";
import { FormStatus } from "@/ui/FormStatus";
import { Icon } from "@/ui/Icon";
import { saveItemList } from "./item-list-actions";

export function ItemListForm({ token, currency }: { token: string; currency: string }) {
  const listTitleId = useId();
  const [result, action, pending] = useActionState(saveItemList.bind(null, token), null);
  const next = useRef(1);
  const [lines, setLines] = useState([{ key: 0, name: "", total: "", count: "1" }]);
  const update = (key: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <form action={action} className="card m-card-in flex flex-col gap-5">
      <p className="m-0 text-sm text-muted-light">
        You paid for these items. Set how many people share each one. Members will tick their own
        items and pay you.
      </p>
      <div className="field">
        <FieldHelp htmlFor={listTitleId} label="List name">
          Give this collection of items a short name, like “Friday dinner” or “Weekend groceries.”
          It helps everyone recognize the list. You’ll add individual items, like steak and rice,
          below.
        </FieldHelp>
        <input
          id={listTitleId}
          name="listTitle"
          required
          maxLength={80}
          placeholder="Dinner together"
          className="input"
        />
      </div>
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {lines.map((line, index) => {
          const total = parseAmount(line.total);
          const count = Number(line.count);
          const valid =
            total !== null && total > 0 && Number.isInteger(count) && count >= 1 && count <= 99;
          return (
            <li key={line.key} className="flex flex-col gap-3 border-b border-line pb-4">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">Item {index + 1}</strong>
                {lines.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    className="flex size-11 items-center justify-center"
                    onClick={() => setLines((rows) => rows.filter((r) => r.key !== line.key))}
                  >
                    <Icon name="x" />
                  </button>
                )}
              </div>
              <label className="field">
                Item name
                <input
                  name="itemName"
                  required
                  maxLength={80}
                  value={line.name}
                  onChange={(e) => update(line.key, { name: e.target.value })}
                  placeholder="Steak"
                  className="input"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field">
                  Total price
                  <input
                    name="itemTotal"
                    required
                    inputMode="decimal"
                    value={line.total}
                    onChange={(e) => update(line.key, { total: e.target.value })}
                    placeholder="200.00"
                    className="input money min-w-0"
                  />
                </label>
                <label className="field">
                  People sharing
                  <input
                    name="shareCount"
                    required
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    value={line.count}
                    onChange={(e) => update(line.key, { count: e.target.value })}
                    className="input money min-w-0"
                  />
                </label>
              </div>
              {valid && (
                <p className="m-0 text-sm text-mint-dark">
                  <span className="money font-semibold">
                    {formatMoney(spotAmount(total, count, 0), currency)}
                  </span>{" "}
                  per person
                  {total % count !== 0
                    ? " or one centavo less, so the total stays exact."
                    : ` · ${count} ${count === 1 ? "spot" : "spots"}`}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={lines.length >= 200 || pending}
        className="btn-outline-light self-start"
        onClick={() =>
          setLines((rows) => [...rows, { key: next.current++, name: "", total: "", count: "1" }])
        }
      >
        <Icon name="plus" size={16} />
        Add an item
      </button>
      <FormStatus result={result} />
      <div className="self-start rounded-full bg-ink p-1.5">
        <PrimaryButton pending={pending}>Create item list</PrimaryButton>
      </div>
    </form>
  );
}
