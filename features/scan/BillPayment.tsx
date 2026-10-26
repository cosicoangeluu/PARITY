import Link from "next/link";
import { formatMoney } from "@/core/money";
import { paymentProgress } from "@/core/payment-progress";
import { creatorPayDetails } from "@/server/access";
import { StatusPill } from "@/ui/People";
import { PayForm } from "../payments/PayForm";
import type { BillView } from "./queries";

export async function BillPayment({ view }: { view: BillView }) {
  const { ctx, bill, computation, paidBy } = view;
  if (!ctx.me || ctx.me.id === bill.payer_id) return null;
  const name = ctx.participants.find((p) => p.id === bill.payer_id)?.name ?? "the creator";
  const share = computation.perPerson[ctx.me.id]?.total ?? 0;
  const confirmed = paidBy[ctx.me.id] ?? 0;
  const pending = view.payments
    .filter((p) => p.from_id === ctx.me?.id && p.to_id === bill.payer_id && p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  const { remaining, refund, pendingExcess } = paymentProgress(share, confirmed, pending);
  const details = bill.payer_id === ctx.creatorId ? await creatorPayDetails(ctx) : undefined;
  const money = (amount: number) => formatMoney(amount, ctx.group.currency);
  return (
    <section aria-labelledby="payment-heading" className="flex flex-col gap-4">
      <div className="glass m-card-in flex flex-col gap-3">
        <h2 id="payment-heading" className="display m-0 text-[22px] font-bold">
          Pay {name}
        </h2>
        <span className="text-sm text-muted-dark">
          {confirmed + pending > 0 ? "Remaining to send" : "Your amount to send"}
        </span>
        <span className="money display text-[34px] font-bold">{money(remaining)}</span>
        <dl className="m-0 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt>Current share</dt>
            <dd className="money m-0">{money(share)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Confirmed payments</dt>
            <dd className="money m-0">{money(confirmed)}</dd>
          </div>
          {pending > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Waiting for confirmation</dt>
              <dd className="money m-0">{money(pending)}</dd>
            </div>
          )}
        </dl>
        {bill.status === "claiming" && (
          <p className="m-0 text-sm text-muted-dark">
            You can pay now. The list is still open, so your share may change. Payments stay
            recorded; any extra balance or overpayment will appear here.
          </p>
        )}
        {pending > 0 && (
          <StatusPill status="pending">
            Waiting for {name} to confirm {money(pending)}
          </StatusPill>
        )}
        {refund > 0 && (
          <p role="status" className="m-0 font-semibold">
            Overpaid by {money(refund)}. {name} needs to return this amount to you.
          </p>
        )}
        {pendingExcess > 0 && (
          <p className="m-0 text-sm text-muted-dark">
            Your submitted payments exceed your current share. {name} needs to confirm the payment
            before the overpayment is final.
          </p>
        )}
        {remaining === 0 && pending === 0 && refund === 0 && (
          <p role="status" className="m-0 font-semibold">
            {share > 0 ? "Your current share is paid." : "Nothing to pay right now."}
          </p>
        )}
      </div>
      {remaining > 0 && (
        <div className="card m-card-in flex flex-col gap-4">
          <p className="m-0 text-sm text-muted-light">
            Send {money(remaining)} to {name}, then enter your payment details below.
          </p>
          {!details?.gcash && !details?.maya && !details?.qrUrl && (
            <p className="m-0 text-sm text-muted-light">
              {name} hasn't added receiving details yet. Ask them for payment instructions before
              sending.
            </p>
          )}
          <PayForm
            key={`${confirmed}:${pending}`}
            groupToken={ctx.group.token}
            billId={bill.id}
            otherId={bill.payer_id}
            otherName={name}
            amountDue={remaining}
            payDetails={details}
          />
        </div>
      )}
      {bill.status === "claiming" && (
        <Link href={`/b/${bill.token}?step=items`} className="btn-outline self-start no-underline">
          Review or change my items
        </Link>
      )}
    </section>
  );
}
