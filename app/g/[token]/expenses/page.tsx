import Link from "next/link";
import { Suspense } from "react";
import { formatMoney } from "@/core/money";
import { GroupGate } from "@/features/groups/GroupGate";
import { loadLedger, nameLookup } from "@/features/groups/queries";
import { PrimaryLink } from "@/ui/Actions";
import { Avatar } from "@/ui/People";
import { ActionDock, ScreenSkeleton, ScreenTitle } from "@/ui/Screen";

export default function ExpensesPage({ params }: PageProps<"/g/[token]/expenses">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {async (ctx) => {
          const ledger = await loadLedger(ctx);
          const nameOf = nameLookup(ctx);
          const currency = ctx.group.currency;
          const spent = ledger.entries
            .filter((e) => e.kind === "expense")
            .reduce((s, e) => s + e.amount, 0);
          return (
            <div className="flex flex-col gap-4">
              <ScreenTitle eyebrow="Expenses" title={formatMoney(spent, currency)}>
                spent together
              </ScreenTitle>
              {ledger.entries.length === 0 ? (
                <div className="glass text-muted-dark">
                  No expenses yet. Add one, or scan a receipt.
                </div>
              ) : (
                <ul className="card m-0 flex list-none flex-col p-0">
                  {ledger.entries.map((e, i) => (
                    <li
                      key={e.id}
                      className="m-fade-up border-b border-line last:border-0"
                      style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
                    >
                      <Link
                        href={`/g/${ctx.group.token}/expenses/${e.id}`}
                        className="flex min-h-16 items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-black/[0.03]"
                      >
                        <Avatar id={e.payer_id} name={nameOf(e.payer_id)} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">
                            {e.title}
                          </span>
                          <span className="text-[13px] text-muted-light">
                            {e.kind === "transfer"
                              ? `${nameOf(e.payer_id)} → ${nameOf(e.recipient_id)}`
                              : e.kind === "income"
                                ? `Received by ${nameOf(e.payer_id)}`
                                : `Paid by ${nameOf(e.payer_id)}`}
                            {" · "}
                            {new Date(e.entry_date).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                            })}
                            {e.category ? ` · ${e.category}` : ""}
                          </span>
                        </span>
                        <span
                          className={`money text-[15px] font-semibold ${e.kind === "income" ? "text-mint-dark" : ""}`}
                        >
                          {e.kind === "income" ? "+" : ""}
                          {formatMoney(e.amount, currency)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <ActionDock>
                <PrimaryLink href={`/g/${ctx.group.token}/expenses/new`} icon="plus">
                  Add expense
                </PrimaryLink>
                <Link href={`/g/${ctx.group.token}/scan`} className="btn-outline no-underline">
                  Scan
                </Link>
              </ActionDock>
            </div>
          );
        }}
      </GroupGate>
    </Suspense>
  );
}
