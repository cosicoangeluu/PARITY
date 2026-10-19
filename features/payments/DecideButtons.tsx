"use client";

import { useActionState, useState, useTransition } from "react";
import { FormStatus } from "@/ui/FormStatus";
import { confirmPayment, rejectPayment } from "./actions";

/** Confirm or reject a pending payment. Only shown to the payee (or the organizer after 7 days). */
export function DecideButtons({
  groupToken,
  paymentId,
}: {
  groupToken: string;
  paymentId: string;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [result, rejectAction, rejectPending] = useActionState(
    rejectPayment.bind(null, groupToken, paymentId),
    null,
  );

  if (rejecting) {
    return (
      <form action={rejectAction} className="flex w-full flex-col gap-2">
        <label className="field">
          Why?
          <select name="reason" className="input" defaultValue="Not received">
            <option>Not received</option>
            <option>Wrong amount</option>
            <option>Reference number doesn't match</option>
            <option>Paid someone else</option>
          </select>
        </label>
        <FormStatus result={result} />
        <div className="flex gap-2">
          <button type="submit" className="btn-ink" disabled={rejectPending}>
            Reject payment
          </button>
          <button type="button" className="btn-outline-light" onClick={() => setRejecting(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-ink"
        disabled={isPending}
        onClick={() =>
          start(async () => {
            const r = await confirmPayment(groupToken, paymentId);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {isPending ? "Confirming…" : "Confirm received"}
      </button>
      <button type="button" className="btn-outline-light" onClick={() => setRejecting(true)}>
        Reject
      </button>
      {error && <p className="form-error m-0 w-full">{error}</p>}
    </div>
  );
}
