"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { spotAmount } from "@/core/item-spots";
import { formatMoney } from "@/core/money";
import { PrimaryButton } from "@/ui/Actions";
import { Icon } from "@/ui/Icon";
import { AvatarStack, StatusPill } from "@/ui/People";
import { ActionDock } from "@/ui/Screen";
import { markOpened, setClaim, setDone } from "./actions";

export interface ClaimItem {
  id: string;
  name: string;
  qty: number;
  shareCount?: number | null;
  total: number;
  sharedByAll: boolean;
  claimers: { id: string; name: string; qty: number; share: number }[];
  myQty: number;
  unclaimedQty: number;
}

/**
 * The items list everyone sees, live: who had what, by item. Tick your own items;
 * for "3x Rice" choose how many you had. Unclaimed items are grouped at the top.
 */
export function ClaimItems({
  billToken,
  items,
  open,
  currency,
  canClaim,
  done,
  payAfter = false,
}: {
  billToken: string;
  items: ClaimItem[];
  open: boolean;
  currency: string;
  canClaim: boolean;
  done: boolean;
  payAfter?: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(
    items,
    (state, change: { id: string; qty: number }) =>
      state.map((i) =>
        i.id === change.id
          ? {
              ...i,
              myQty: change.qty,
              unclaimedQty: Math.max(0, i.unclaimedQty + i.myQty - change.qty),
            }
          : i,
      ),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    markOpened(billToken).catch(() => undefined);
  }, [billToken]);

  function claim(id: string, qty: number) {
    setError(null);
    start(async () => {
      setOptimistic({ id, qty });
      const result = await setClaim(billToken, id, qty);
      if (!result.ok) setError(result.error);
      // setClaim returns refreshed server data in the same response.
    });
  }

  const sorted = [...optimistic].sort(
    (a, b) =>
      Number(b.unclaimedQty > 0 && !b.sharedByAll) - Number(a.unclaimedQty > 0 && !a.sharedByAll),
  );

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="form-error-dark m-0">
          {error}
        </p>
      )}
      <ul className="card m-0 flex list-none flex-col p-0">
        {sorted.map((item) => {
          const mine = item.myQty > 0;
          return (
            <li
              key={item.id}
              className={`flex flex-col gap-2 border-b border-line px-4 py-3.5 last:border-0 ${mine ? "bg-mint-soft/60" : ""}`}
            >
              <div className="flex items-center gap-3">
                {canClaim &&
                  open &&
                  !item.sharedByAll &&
                  (item.shareCount == null && item.qty > 1 ? (
                    <fieldset
                      className="m-0 flex items-center gap-1 border-0 p-0"
                      aria-label={`How many ${item.name} you had`}
                    >
                      <button
                        type="button"
                        aria-label="One less"
                        disabled={pending || item.myQty === 0}
                        onClick={() => claim(item.id, item.myQty - 1)}
                        className="flex size-11 items-center justify-center rounded-full border border-line"
                      >
                        −
                      </button>
                      <span className="money w-6 text-center font-semibold">{item.myQty}</span>
                      <button
                        type="button"
                        aria-label="One more"
                        disabled={pending || item.myQty >= item.myQty + item.unclaimedQty}
                        onClick={() => claim(item.id, item.myQty + 1)}
                        className="flex size-11 items-center justify-center rounded-full border border-line"
                      >
                        +
                      </button>
                    </fieldset>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={mine}
                      disabled={pending || (!mine && item.unclaimedQty === 0)}
                      aria-label={`I had ${item.name}`}
                      onClick={() => claim(item.id, mine ? 0 : 1)}
                      className={`flex size-11 flex-none items-center justify-center rounded-full border-2 ${mine ? "border-mint-dark bg-mint-dark text-white" : "border-line"}`}
                    >
                      {mine && <Icon name="check" size={18} strokeWidth={3} />}
                    </button>
                  ))}
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">
                    {item.shareCount == null && item.qty > 1 ? `${item.qty}× ` : ""}
                    {item.name}
                  </div>
                  {item.claimers.length > 0 && (
                    <div className="text-[13px] text-muted-light">
                      {item.claimers
                        .map(
                          (c) =>
                            `${c.name}${item.shareCount == null && item.qty > 1 ? ` ×${c.qty}` : ""} ${formatMoney(c.share, currency)}`,
                        )
                        .join(" · ")}
                    </div>
                  )}
                </div>
                {item.claimers.length > 0 && <AvatarStack people={item.claimers} />}
                <span className="money w-20 text-right text-[15px]">
                  {formatMoney(item.total, currency)}
                </span>
              </div>
              {item.shareCount != null ? (
                <div className="flex flex-wrap justify-between gap-2 text-[13px] text-muted-light">
                  <span>
                    {item.shareCount - item.unclaimedQty} of {item.shareCount} spots selected
                  </span>
                  <span className="money">
                    {formatMoney(spotAmount(item.total, item.shareCount, 0), currency)}
                    {item.total % item.shareCount ? " or 1¢ less" : ""} per person
                  </span>
                  {item.unclaimedQty === 0 && (
                    <span className="font-semibold text-mint-dark">
                      {mine ? "Full · your spot is saved" : "Full · selected by others"}
                    </span>
                  )}
                </div>
              ) : item.sharedByAll ? (
                <span className="self-start text-[13px] text-mint-dark">Shared by everyone</span>
              ) : item.unclaimedQty > 0 ? (
                <span className="self-start">
                  <StatusPill status="unclaimed">
                    {item.qty > 1 ? `${item.unclaimedQty} of ${item.qty} unclaimed` : "Unclaimed"}
                  </StatusPill>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {canClaim && open && payAfter ? (
        <ActionDock>
          <PrimaryButton
            type="button"
            pending={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const result = await setDone(billToken, true);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.push(`/b/${billToken}?step=payment`);
                router.refresh();
              });
            }}
          >
            Continue to payment
          </PrimaryButton>
        </ActionDock>
      ) : (
        canClaim &&
        open && (
          <button
            type="button"
            className={done ? "btn-outline self-start" : "btn-outline self-start"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await setDone(billToken, !done);
                if (!result.ok) setError(result.error);
                else router.refresh();
              })
            }
          >
            <Icon name="check" size={16} /> {done ? "Not done yet" : "I'm done claiming"}
          </button>
        )
      )}
    </div>
  );
}
