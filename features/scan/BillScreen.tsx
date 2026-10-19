import Link from "next/link";
import { formatMoney } from "@/core/money";
import { LiveRefresh } from "@/lib/LiveRefresh";
import { RememberGroup } from "@/lib/RememberGroup";
import { signedUrl } from "@/server/storage";
import { siteUrl } from "@/server/url";
import { CopyButton } from "@/ui/CopyButton";
import { Avatar, StatusPill } from "@/ui/People";
import { Celebrate, ScreenTitle, SectionTitle } from "@/ui/Screen";
import { ShareCard } from "../groups/ShareCard";
import { PayForm } from "../payments/PayForm";
import { PaymentItem } from "../payments/PaymentItem";
import { type ClaimItem, ClaimItems } from "./ClaimItems";
import { OrganizerPanel } from "./OrganizerPanel";
import type { BillView } from "./queries";

/** The claim link screen: same view for the organizer and everyone with the link. */
export async function BillScreen({ view, showShare }: { view: BillView; showShare: boolean }) {
  const { bill, ctx, computation } = view;
  const me = ctx.me;
  if (!me) return null;
  const currency = ctx.group.currency;
  const nameOf = (id: string) => ctx.participants.find((p) => p.id === id)?.name ?? "Someone";
  const payerName = nameOf(bill.payer_id);
  const url = `${await siteUrl()}/b/${bill.token}`;

  // Who had what, by item.
  const items: ClaimItem[] = view.items.map((item) => {
    const itemClaims = view.claims.filter((c) => c.item_id === item.id);
    const claimedQty = itemClaims.reduce((s, c) => s + c.qty, 0);
    const shareOf = (pid: string) =>
      computation.perPerson[pid]?.items.find((x) => x.itemId === item.id)?.amount ?? 0;
    return {
      id: item.id,
      name: item.name,
      qty: item.qty,
      total: item.total,
      sharedByAll: item.shared_by_all,
      claimers: itemClaims.map((c) => ({
        id: c.participant_id,
        name: nameOf(c.participant_id),
        qty: c.qty,
        share: shareOf(c.participant_id),
      })),
      myQty: itemClaims.find((c) => c.participant_id === me.id)?.qty ?? 0,
      unclaimedQty: item.shared_by_all
        ? 0
        : item.qty > 1
          ? Math.max(item.qty - claimedQty, 0)
          : claimedQty > 0
            ? 0
            : 1,
    };
  });

  const memberIds = [
    ...new Set([
      ...view.members.map((m) => m.participant_id),
      ...Object.keys(computation.perPerson),
    ]),
  ];
  const people = memberIds.map((id) => {
    const member = view.members.find((m) => m.participant_id === id);
    const share = computation.perPerson[id];
    const paid = view.paidBy[id] ?? 0;
    const pending = view.payments
      .filter((p) => p.from_id === id && p.status === "pending")
      .reduce((s, p) => s + p.amount, 0);
    const claimedSomething = view.claims.some((c) => c.participant_id === id);
    let status: "not-opened" | "opened" | "claiming" | "done" | "paid" | "pending" | "unpaid" =
      "not-opened";
    if (bill.status === "claiming") {
      status = member?.done_at
        ? "done"
        : claimedSomething
          ? "claiming"
          : member?.opened_at
            ? "opened"
            : "not-opened";
    } else if (id !== bill.payer_id && (share?.total ?? 0) > 0) {
      status = paid >= (share?.total ?? 0) ? "paid" : pending > 0 ? "pending" : "unpaid";
    } else {
      status = "done";
    }
    return {
      id,
      name: nameOf(id),
      share,
      paid,
      pending,
      status,
      discount: view.discounts.find((d) => d.participant_id === id)?.amount ?? 0,
    };
  });

  const myShare = computation.perPerson[me.id]?.total ?? 0;
  const myOwed = me.id === bill.payer_id ? 0 : Math.max(myShare - (view.paidBy[me.id] ?? 0), 0);
  const doneCount = people.filter((p) => p.status === "done").length;
  const isOpen = bill.status === "claiming";
  const myMember = view.members.find((m) => m.participant_id === me.id);
  const payer = ctx.participants.find((p) => p.id === bill.payer_id);
  const photos =
    view.isBillOrganizer || bill.status !== "paid"
      ? (await Promise.all(bill.image_paths.map((p) => signedUrl("receipts", p)))).filter(
          (u): u is string => !!u,
        )
      : [];
  const unpaid = people.filter((p) => p.status === "unpaid" || p.status === "pending");
  const remindText = unpaid.length
    ? `Hi! For "${bill.title}" please send ${payerName} your share on Parity:\n${unpaid
        .map(
          (p) =>
            `• ${p.name}: ${formatMoney(Math.max((p.share?.total ?? 0) - p.paid, 0), currency)}`,
        )
        .join("\n")}\n${url}`
    : "";

  let finalizeHint: string | null = null;
  if (computation.unclaimed.length)
    finalizeHint = `${computation.unclaimed.length} item(s) still unclaimed.`;
  else if (computation.overclaimed.length)
    finalizeHint = "Some items were claimed more times than the receipt has.";

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh topic={`b:${bill.token}`} pollMs={10000} />
      <RememberGroup token={bill.token} name={bill.title} kind="bill" />

      <ScreenTitle
        eyebrow={
          [
            bill.merchant,
            bill.receipt_date &&
              new Date(bill.receipt_date).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
          ]
            .filter(Boolean)
            .join(" · ") || "Scanned bill"
        }
        title={bill.title}
      >
        Paid by <strong className="text-paper">{payerName}</strong> ·{" "}
        <span className="money">
          {formatMoney(computation.claimedTotal + computation.unclaimedTotal, currency)}
        </span>{" "}
        in items
      </ScreenTitle>

      {bill.status === "paid" ? (
        <div className="glass m-card-in">
          <Celebrate>Fully paid</Celebrate>
          <p className="m-0 mt-3 text-muted-dark">
            Everyone settled up. The receipt photos were deleted.
          </p>
        </div>
      ) : (
        <div className="glass m-card-in flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-subtle-dark">
              {isOpen
                ? "Your share so far"
                : me.id === bill.payer_id
                  ? "You paid the bill"
                  : `You owe ${payerName}`}
            </span>
            <span className="money display text-[34px] leading-none font-bold">
              {formatMoney(isOpen || me.id === bill.payer_id ? myShare : myOwed, currency)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm text-muted-dark">
            {isOpen ? (
              <>
                <span className="inline-flex items-center gap-2">
                  <span className="m-pulse size-2 rounded-full bg-mint" />
                  {doneCount} of {people.length} done claiming
                </span>
                {computation.unclaimedTotal > 0 && (
                  <span className="money">
                    {formatMoney(computation.unclaimedTotal, currency)} unclaimed
                  </span>
                )}
              </>
            ) : (
              <span>
                {people.filter((p) => p.status === "paid").length} of{" "}
                {people.filter((p) => p.id !== bill.payer_id && (p.share?.total ?? 0) > 0).length}{" "}
                paid
              </span>
            )}
          </div>
        </div>
      )}

      {showShare && (
        <ShareCard
          url={url}
          title="Claim link"
          text={`Tick what you had for "${bill.title}" on Parity:`}
        />
      )}

      <SectionTitle>Items</SectionTitle>
      <ClaimItems
        billToken={bill.token}
        items={items}
        open={isOpen}
        currency={currency}
        canClaim
        done={!!myMember?.done_at}
      />

      {view.isBillOrganizer && (
        <OrganizerPanel
          billToken={bill.token}
          status={bill.status}
          payerName={payerName}
          currency={currency}
          canFinalize={!finalizeHint}
          finalizeHint={finalizeHint}
          items={view.items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            total: i.total,
            unclaimed: computation.unclaimed.some((u) => u.itemId === i.id),
          }))}
          people={people.map((p) => ({ id: p.id, name: p.name, discount: p.discount }))}
        />
      )}

      {bill.status === "finalized" && myOwed > 0 && (
        <>
          <SectionTitle>Pay {payerName}</SectionTitle>
          <div className="card">
            <PayForm
              groupToken={ctx.group.token}
              billId={bill.id}
              otherId={bill.payer_id}
              otherName={payerName}
              amountDue={myOwed}
              payDetails={{ gcash: payer?.gcash ?? null, maya: payer?.maya ?? null }}
            />
          </div>
        </>
      )}

      <SectionTitle>Who had what</SectionTitle>
      <ul className="card m-0 flex list-none flex-col p-0">
        {people.map((p) => (
          <li key={p.id} className="border-b border-line last:border-0">
            <details>
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2">
                <Avatar id={p.id} name={p.name} size={32} />
                <span className="flex-1 text-[15px] font-semibold">
                  {p.name}
                  {p.id === bill.payer_id && (
                    <span className="font-normal text-muted-light"> · paid the bill</span>
                  )}
                </span>
                <StatusPill status={p.status} />
                <span className="money w-24 text-right font-semibold">
                  {formatMoney(p.share?.total ?? 0, currency)}
                </span>
              </summary>
              <div className="flex flex-col gap-1 px-4 pb-4 pl-[60px] text-sm text-muted-light">
                {(p.share?.items ?? []).map((it) => (
                  <div key={it.itemId} className="flex justify-between">
                    <span>{view.items.find((i) => i.id === it.itemId)?.name}</span>
                    <span className="money">{formatMoney(it.amount, currency)}</span>
                  </div>
                ))}
                {(p.share?.adjustments ?? 0) !== 0 && (
                  <div className="flex justify-between">
                    <span>
                      Share of {view.adjustments.map((a) => a.label.toLowerCase()).join(", ")}
                    </span>
                    <span className="money">
                      {formatMoney(p.share?.adjustments ?? 0, currency)}
                    </span>
                  </div>
                )}
                {(p.share?.discount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Senior/PWD discount</span>
                    <span className="money">−{formatMoney(p.share?.discount ?? 0, currency)}</span>
                  </div>
                )}
                {(p.share?.items.length ?? 0) === 0 && <span>Nothing claimed yet.</span>}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {bill.status !== "claiming" && (view.isPayee || view.isBillOrganizer) && (
        <>
          <SectionTitle
            action={
              remindText ? (
                <CopyButton text={remindText} label="Remind unpaid" className="btn-outline" />
              ) : undefined
            }
          >
            Collection
          </SectionTitle>
          <div className="card flex flex-col gap-1">
            {people
              .filter((p) => p.id !== bill.payer_id && (p.share?.total ?? 0) > 0)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 border-b border-line py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar id={p.id} name={p.name} size={28} />
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span className="money text-sm text-muted-light">
                      {formatMoney(p.paid, currency)} / {formatMoney(p.share?.total ?? 0, currency)}
                    </span>
                    <StatusPill
                      status={
                        p.status === "paid" ? "paid" : p.status === "pending" ? "pending" : "unpaid"
                      }
                    />
                  </div>
                  {view.isPayee && p.status === "unpaid" && (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-mint-dark">
                        {p.name} paid me directly
                      </summary>
                      <div className="pt-3">
                        <PayForm
                          groupToken={ctx.group.token}
                          billId={bill.id}
                          otherId={p.id}
                          otherName={p.name}
                          amountDue={Math.max((p.share?.total ?? 0) - p.paid, 0)}
                          direction="received"
                        />
                      </div>
                    </details>
                  )}
                </div>
              ))}
          </div>
        </>
      )}

      {view.payments.length > 0 && (
        <>
          <SectionTitle>Payments</SectionTitle>
          <ul className="card m-0 list-none px-4 py-1">
            {view.payments.map((payment) => (
              <PaymentItem key={payment.id} ctx={ctx} payment={payment} nameOf={nameOf} />
            ))}
          </ul>
        </>
      )}

      {photos.length > 0 && (
        <>
          <SectionTitle>Receipt</SectionTitle>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {photos.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" className="flex-none">
                {/* biome-ignore lint/performance/noImgElement: short-lived signed URL */}
                <img
                  src={src}
                  alt={`Receipt part ${i + 1}`}
                  className="h-56 rounded-2xl object-cover"
                />
              </a>
            ))}
          </div>
          <p className="m-0 text-[13px] text-subtle-dark">
            Kept so anyone can check their claim. Deleted once the bill is fully paid.
          </p>
        </>
      )}

      {ctx.group.kind === "group" && (
        <Link href={`/g/${ctx.group.token}`} className="btn-outline mt-4 self-start no-underline">
          Back to {ctx.group.name}
        </Link>
      )}
    </div>
  );
}
