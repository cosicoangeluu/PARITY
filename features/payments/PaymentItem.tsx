import { formatMoney } from "@/core/money";
import type { GroupContext } from "@/server/access";
import { signedUrl } from "@/server/storage";
import type { PaymentRow } from "@/server/types";
import { Avatar, StatusPill } from "@/ui/People";
import { DecideButtons } from "./DecideButtons";

const METHOD_LABEL = {
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank",
  cash: "Cash",
  other: "Other",
} as const;

/**
 * One payment with its status. Proof (screenshot, reference number) is shown only to the
 * payer and the payee; everyone else sees just the status.
 */
export async function PaymentItem({
  ctx,
  payment,
  nameOf,
}: {
  ctx: GroupContext;
  payment: PaymentRow;
  nameOf: (id: string) => string;
}) {
  const involved = ctx.me?.id === payment.from_id || ctx.me?.id === payment.to_id;
  const ageDays = (Date.now() - new Date(payment.created_at).getTime()) / 86_400_000;
  const canDecide =
    payment.status === "pending" &&
    (ctx.me?.id === payment.to_id || (ctx.isOrganizer && ageDays >= 7));
  const proof =
    involved && payment.proof_path ? await signedUrl("proofs", payment.proof_path) : null;

  return (
    <li className="flex flex-col gap-3 border-b border-line py-3 last:border-0">
      <div className="flex items-center gap-3">
        <Avatar id={payment.from_id} name={nameOf(payment.from_id)} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px]">
            <strong className="font-semibold">{nameOf(payment.from_id)}</strong> paid{" "}
            <strong className="font-semibold">{nameOf(payment.to_id)}</strong>
          </div>
          <div className="text-[13px] text-muted-light">
            {METHOD_LABEL[payment.method]}
            {involved && payment.reference ? ` · Ref ${payment.reference}` : ""}
            {" · "}
            {new Date(payment.created_at).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <span className="money display text-lg font-bold">
          {formatMoney(payment.amount, ctx.group.currency)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {payment.status === "confirmed" ? (
          <StatusPill status="paid">
            Paid · confirmed by {nameOf(payment.decided_by ?? payment.to_id)}
            {payment.decided_at
              ? ` on ${new Date(payment.decided_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`
              : ""}
          </StatusPill>
        ) : payment.status === "pending" ? (
          <StatusPill status="pending">Waiting for {nameOf(payment.to_id)} to confirm</StatusPill>
        ) : (
          <StatusPill status="rejected">Rejected: {payment.reject_reason}</StatusPill>
        )}
        {proof && (
          <a
            href={proof}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-mint-dark"
          >
            View proof
          </a>
        )}
        {involved && payment.note && (
          <span className="text-[13px] text-muted-light">“{payment.note}”</span>
        )}
      </div>
      {canDecide && <DecideButtons groupToken={ctx.group.token} paymentId={payment.id} />}
    </li>
  );
}
