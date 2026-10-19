import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatMoney, toDecimalString } from "@/core/money";
import { DeleteEntryButton } from "@/features/expenses/DeleteEntryButton";
import { EntryForm } from "@/features/expenses/EntryForm";
import { GroupGate } from "@/features/groups/GroupGate";
import { nameLookup } from "@/features/groups/queries";
import { activeParticipants } from "@/server/access";
import { db } from "@/server/db";
import type { EntryRow } from "@/server/types";
import { Avatar } from "@/ui/People";
import { ScreenSkeleton, ScreenTitle, SectionTitle } from "@/ui/Screen";

export default function EntryPage({ params }: PageProps<"/g/[token]/expenses/[id]">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <EntryDetail params={params} />
    </Suspense>
  );
}

async function EntryDetail({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <GroupGate params={params}>
      {async (ctx) => {
        const { data: entry } = await db()
          .from("entries")
          .select("*, entry_splits(participant_id, amount, weight)")
          .eq("id", id)
          .eq("group_id", ctx.group.id)
          .is("deleted_at", null)
          .maybeSingle<EntryRow>();
        if (!entry) notFound();
        const nameOf = nameLookup(ctx);
        const currency = ctx.group.currency;
        const locked = !!entry.bill_id || !!entry.payment_id;
        const splits = entry.entry_splits ?? [];

        return (
          <div className="flex flex-col gap-4">
            <ScreenTitle
              eyebrow={
                entry.kind === "expense"
                  ? (entry.category ?? "Expense")
                  : entry.kind === "income"
                    ? "Income"
                    : "Transfer"
              }
              title={entry.title}
            >
              <span className="money">{formatMoney(entry.amount, currency)}</span> ·{" "}
              {entry.kind === "transfer"
                ? `${nameOf(entry.payer_id)} → ${nameOf(entry.recipient_id)}`
                : `${entry.kind === "income" ? "received" : "paid"} by ${nameOf(entry.payer_id)}`}{" "}
              ·{" "}
              {new Date(entry.entry_date).toLocaleDateString("en-PH", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </ScreenTitle>

            {splits.length > 0 && (
              <ul className="glass m-0 flex list-none flex-col gap-3">
                {splits.map((s) => (
                  <li key={s.participant_id} className="flex items-center gap-3">
                    <Avatar id={s.participant_id} name={nameOf(s.participant_id)} size={30} />
                    <span className="flex-1">{nameOf(s.participant_id)}</span>
                    <span className="money font-semibold">{formatMoney(s.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}

            {locked ? (
              <div className="glass text-sm text-muted-dark">
                {entry.bill_id
                  ? "This entry comes from a scanned bill. "
                  : "This entry is a confirmed payment. "}
                {entry.bill_id && <BillLink billId={entry.bill_id} />}
              </div>
            ) : ctx.group.locked ? null : (
              <>
                <SectionTitle
                  action={<DeleteEntryButton token={ctx.group.token} entryId={entry.id} />}
                >
                  Edit
                </SectionTitle>
                <EntryForm
                  token={ctx.group.token}
                  meId={ctx.me?.id ?? ""}
                  currency={currency}
                  people={activeParticipants(ctx).map((p) => ({
                    id: p.id,
                    name: p.name,
                    defaultShare: Number(p.default_share),
                  }))}
                  initial={{
                    id: entry.id,
                    kind: entry.kind,
                    title: entry.title,
                    amount: toDecimalString(entry.amount),
                    payerId: entry.payer_id,
                    recipientId: entry.recipient_id,
                    date: entry.entry_date,
                    category: entry.category,
                    mode: entry.split_mode,
                    members: Object.fromEntries(
                      splits.map((s) => [
                        s.participant_id,
                        entry.split_mode === "fixed"
                          ? toDecimalString(s.amount)
                          : String(s.weight ?? 1),
                      ]),
                    ),
                  }}
                />
              </>
            )}
          </div>
        );
      }}
    </GroupGate>
  );
}

async function BillLink({ billId }: { billId: string }) {
  const { data } = await db()
    .from("bills")
    .select("token")
    .eq("id", billId)
    .maybeSingle<{ token: string }>();
  return data ? (
    <Link href={`/b/${data.token}`} className="font-semibold text-mint">
      Open the bill
    </Link>
  ) : null;
}
