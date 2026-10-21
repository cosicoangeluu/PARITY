import Link from "next/link";
import { Suspense } from "react";
import { formatMoney } from "@/core/money";
import { describeActivity } from "@/features/activity/describe";
import { GroupGate } from "@/features/groups/GroupGate";
import { loadActivity, loadLedger, loadOpenBills, nameLookup } from "@/features/groups/queries";
import { ShareCard } from "@/features/groups/ShareCard";
import { siteUrl } from "@/server/url";
import { PrimaryLink } from "@/ui/Actions";
import { Avatar, StatusPill } from "@/ui/People";
import { ActionDock, Celebrate, ScreenSkeleton, ScreenTitle, SectionTitle } from "@/ui/Screen";

export default function OverviewPage({ params }: PageProps<"/g/[token]">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: { params: Promise<{ token: string }> }) {
  return (
    <GroupGate params={params}>
      {async (ctx) => {
        const [ledger, bills, activity] = await Promise.all([
          loadLedger(ctx),
          loadOpenBills(ctx.group.id),
          loadActivity(ctx.group.id, 6),
        ]);
        const nameOf = nameLookup(ctx);
        const me = ctx.me;
        const myBalance = me ? (ledger.balances[me.id] ?? 0) : 0;
        const currency = ctx.group.currency;
        const toConfirm = ledger.payments.filter(
          (p) => p.status === "pending" && p.to_id === me?.id,
        );
        const url = `${await siteUrl()}/g/${ctx.group.token}`;
        const settled = ledger.entries.length > 0 && ledger.transfers.length === 0;

        return (
          <div className="flex flex-col gap-4">
            <ScreenTitle
              eyebrow={`${ctx.participants.filter((p) => p.status === "active").length} people · ${currency}`}
              title={ctx.group.name}
            />

            <ShareCard
              url={url}
              title="Invite people to this group"
              text={`Join "${ctx.group.name}" on Parity:`}
            />

            <div className="glass m-card-in flex flex-col gap-1">
              <span className="text-[13px] text-subtle-dark">
                {myBalance > 0
                  ? "The group owes you"
                  : myBalance < 0
                    ? "You owe the group"
                    : "You're settled up"}
              </span>
              <span className="m-rise-mask">
                <span className="m-rise money display block text-[40px] leading-none font-bold">
                  {formatMoney(Math.abs(myBalance), currency)}
                </span>
              </span>
            </div>

            {settled && (
              <div className="glass">
                <Celebrate>Everyone's settled</Celebrate>
              </div>
            )}

            {toConfirm.length > 0 && (
              <Link
                href={`/g/${ctx.group.token}/settle`}
                className="card m-card-in flex items-center justify-between gap-3 text-ink no-underline"
              >
                <span className="text-[15px] font-semibold">
                  {toConfirm.length} payment{toConfirm.length > 1 ? "s" : ""} waiting for you to
                  confirm
                </span>
                <StatusPill status="pending" />
              </Link>
            )}

            {ledger.transfers.length > 0 && (
              <>
                <SectionTitle
                  action={
                    <Link
                      href={`/g/${ctx.group.token}/settle`}
                      className="text-sm font-semibold text-mint"
                    >
                      See all
                    </Link>
                  }
                >
                  Fewest transfers
                </SectionTitle>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {ledger.transfers.slice(0, 4).map((t, i) => (
                    <li
                      key={`${t.from}-${t.to}`}
                      className="glass m-card-in flex items-center gap-3"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
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
                        className="text-subtle-dark"
                      >
                        <path d="M2 6h34M31 1l5 5-5 5" />
                      </svg>
                      <Avatar id={t.to} name={nameOf(t.to)} size={36} />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-dark">
                        {nameOf(t.from)} pays {nameOf(t.to)}
                      </span>
                      <span className="money display text-xl font-bold">
                        {formatMoney(t.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {bills.length > 0 && (
              <>
                <SectionTitle>Bills in progress</SectionTitle>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {bills.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/b/${b.token}`}
                        className="card m-card-in m-lift flex items-center justify-between gap-3 text-ink no-underline"
                      >
                        <span>
                          <span className="block text-[15px] font-semibold">{b.title}</span>
                          <span className="text-[13px] text-muted-light">
                            Paid by {nameOf(b.payer_id)}
                          </span>
                        </span>
                        <StatusPill status={b.status === "claiming" ? "claiming" : "pending"}>
                          {b.status === "claiming" ? "Claiming" : "Collecting"}
                        </StatusPill>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <SectionTitle
              action={
                <Link
                  href={`/g/${ctx.group.token}/activity`}
                  className="text-sm font-semibold text-mint"
                >
                  Activity log
                </Link>
              }
            >
              Recent
            </SectionTitle>
            {activity.length === 0 ? (
              <p className="m-0 text-muted-dark">Nothing yet. Add an expense or scan a receipt.</p>
            ) : (
              <ul className="glass m-0 flex list-none flex-col gap-2.5">
                {activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-dark">{describeActivity(a, nameOf, currency)}</span>
                    <span className="flex-none text-subtle-dark">
                      {new Date(a.created_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={`/g/${ctx.group.token}/export`}
                className="btn-outline min-h-11 text-sm no-underline"
              >
                Export to Excel
              </a>
            </div>

            <ActionDock>
              <PrimaryLink href={`/g/${ctx.group.token}/expenses/new`} icon="plus">
                Add expense
              </PrimaryLink>
            </ActionDock>
          </div>
        );
      }}
    </GroupGate>
  );
}
