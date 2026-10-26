import Link from "next/link";
import { Suspense } from "react";
import { formatMoney } from "@/core/money";
import { GroupGate } from "@/features/groups/GroupGate";
import { loadLedger, nameLookup } from "@/features/groups/queries";
import { PayForm } from "@/features/payments/PayForm";
import { PaymentItem } from "@/features/payments/PaymentItem";
import { creatorPayDetails } from "@/server/access";
import { Avatar, StatusPill } from "@/ui/People";
import { Celebrate, ScreenSkeleton, ScreenTitle, SectionTitle } from "@/ui/Screen";

export default function SettlePage({ params }: PageProps<"/g/[token]/settle">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {async (ctx) => {
          const ledger = await loadLedger(ctx);
          const creatorDetails = await creatorPayDetails(ctx);
          const nameOf = nameLookup(ctx);
          const currency = ctx.group.currency;
          const me = ctx.me;
          const pending = ledger.payments.filter((p) => p.status === "pending");
          const pendingBetween = (from: string, to: string) =>
            pending
              .filter(
                (p) =>
                  p.from_id === from &&
                  p.to_id === to &&
                  !ledger.openBills.some((b) => b.id === p.bill_id),
              )
              .reduce((s, p) => s + p.amount, 0);
          const toConfirm = pending.filter((p) => p.to_id === me?.id);
          const history = ledger.payments.filter((p) => !toConfirm.includes(p));

          return (
            <div className="flex flex-col gap-4">
              <ScreenTitle
                eyebrow="Settle up"
                title={
                  ledger.transfers.length
                    ? `${ledger.transfers.length} transfer${ledger.transfers.length > 1 ? "s" : ""} settle everything`
                    : ledger.openBills.length
                      ? "Your bills are still open"
                      : "All settled"
                }
              >
                Parity works out the fewest payments. Only the person who receives money can confirm
                it.
              </ScreenTitle>

              {ledger.openBills.length > 0 && (
                <div className="glass flex flex-col gap-3">
                  <p className="m-0 text-sm text-muted-dark">
                    Select items and pay directly on each open bill. Early payments stay there until
                    the list is finalized.
                  </p>
                  {ledger.openBills.map((b) => (
                    <Link
                      key={b.id}
                      href={`/b/${b.token}`}
                      className="btn-outline self-start no-underline"
                    >
                      Open {b.title}
                    </Link>
                  ))}
                </div>
              )}

              {ledger.openBills.length === 0 &&
                ledger.transfers.length === 0 &&
                ledger.entries.length > 0 && (
                  <div className="glass">
                    <Celebrate>Everyone's settled</Celebrate>
                  </div>
                )}

              {toConfirm.length > 0 && (
                <>
                  <SectionTitle>Waiting for you to confirm</SectionTitle>
                  <ul className="card m-0 list-none px-4 py-1">
                    {toConfirm.map((p) => (
                      <PaymentItem key={p.id} ctx={ctx} payment={p} nameOf={nameOf} />
                    ))}
                  </ul>
                </>
              )}

              {ledger.transfers.length > 0 && <SectionTitle>Who pays whom</SectionTitle>}
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {ledger.transfers.map((t, i) => {
                  const mine = t.from === me?.id;
                  const toMe = t.to === me?.id;
                  const waiting = pendingBetween(t.from, t.to);

                  return (
                    <li
                      key={`${t.from}-${t.to}`}
                      className={`${mine ? "card" : "glass"} m-card-in flex flex-col gap-3`}
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar id={t.from} name={nameOf(t.from)} size={36} />
                        <svg
                          width="32"
                          height="12"
                          viewBox="0 0 40 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          aria-hidden="true"
                          className={mine ? "text-muted-light" : "text-subtle-dark"}
                        >
                          <path d="M2 6h34M31 1l5 5-5 5" />
                        </svg>
                        <Avatar id={t.to} name={nameOf(t.to)} size={36} />
                        <span
                          className={`min-w-0 flex-1 text-sm ${mine ? "text-muted-light" : "text-muted-dark"}`}
                        >
                          {mine ? "You pay" : `${nameOf(t.from)} pays`}{" "}
                          {toMe ? "you" : nameOf(t.to)}
                        </span>
                        <span className="money display text-xl font-bold">
                          {formatMoney(t.amount, currency)}
                        </span>
                      </div>
                      {waiting > 0 && (
                        <span className="self-start">
                          <StatusPill status="pending">
                            {formatMoney(waiting, currency)} waiting for {nameOf(t.to)} to confirm
                          </StatusPill>
                        </span>
                      )}
                      {mine && (
                        <details>
                          <summary className="cursor-pointer text-sm font-semibold text-mint-dark">
                            I paid {nameOf(t.to)}
                          </summary>
                          <div className="pt-3">
                            <PayForm
                              groupToken={ctx.group.token}
                              billId={null}
                              otherId={t.to}
                              otherName={nameOf(t.to)}
                              amountDue={Math.max(t.amount - waiting, 0)}
                              payDetails={t.to === ctx.creatorId ? creatorDetails : undefined}
                            />
                          </div>
                        </details>
                      )}
                      {toMe && (
                        <details>
                          <summary className="cursor-pointer text-sm font-semibold text-mint">
                            {nameOf(t.from)} paid me directly
                          </summary>
                          <div className="card mt-3">
                            <PayForm
                              groupToken={ctx.group.token}
                              billId={null}
                              otherId={t.from}
                              otherName={nameOf(t.from)}
                              amountDue={t.amount}
                              direction="received"
                            />
                          </div>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>

              {history.length > 0 && (
                <>
                  <SectionTitle>Payment history</SectionTitle>
                  <ul className="card m-0 list-none px-4 py-1">
                    {history.map((p) => (
                      <PaymentItem key={p.id} ctx={ctx} payment={p} nameOf={nameOf} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        }}
      </GroupGate>
    </Suspense>
  );
}
