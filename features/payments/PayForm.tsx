"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toDecimalString } from "@/core/money";
import { compressImage } from "@/lib/image";
import { PrimaryButton } from "@/ui/Actions";
import { CopyButton } from "@/ui/CopyButton";
import { FormStatus } from "@/ui/FormStatus";
import { recordPayment, recordReceived } from "./actions";

const METHODS = [
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "bank", label: "Bank / InstaPay" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

/**
 * "I paid" (direction "sent") or "X paid me" (direction "received").
 * E-wallet and bank payments need a reference number the payee can match in their own history.
 */
export function PayForm({
  groupToken,
  billId,
  otherId,
  otherName,
  amountDue,
  direction = "sent",
  payDetails,
}: {
  groupToken: string;
  billId: string | null;
  otherId: string;
  otherName: string;
  amountDue: number;
  direction?: "sent" | "received";
  payDetails?: {
    gcash: string | null;
    maya: string | null;
    qrUrl?: string | null;
    qrDownloadUrl?: string | null;
  };
}) {
  const router = useRouter();
  const bound =
    direction === "sent"
      ? recordPayment.bind(null, groupToken, billId, otherId)
      : recordReceived.bind(null, groupToken, billId, otherId);
  const [proofError, setProofError] = useState<string | null>(null);
  const [result, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof bound>> | null, form: FormData) => {
      const proof = form.get("proof");
      if (proof instanceof File && proof.size > 0) {
        try {
          form.set(
            "proof",
            await compressImage(proof, { maxBytes: 150_000, maxSide: 1200 }),
            "proof.jpg",
          );
        } catch (error) {
          setProofError(error instanceof Error ? error.message : "Couldn't read that photo.");
          return prev;
        }
      }
      setProofError(null);
      const result = await bound(prev, form);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const [method, setMethod] = useState<string>(
    payDetails?.gcash ? "gcash" : payDetails?.maya ? "maya" : payDetails?.qrUrl ? "bank" : "cash",
  );
  const needsReference = direction === "sent" && ["gcash", "maya", "bank"].includes(method);

  if (result?.ok)
    return (
      <div role="status" className="flex flex-col gap-2">
        <strong>
          {direction === "sent" ? `Waiting for ${otherName} to confirm` : "Payment recorded"}
        </strong>
        <p className="m-0 text-sm text-muted-light">
          {direction === "sent"
            ? "Your payment was submitted. You can close this page and return using the same link."
            : result.message}
        </p>
      </div>
    );

  return (
    <form action={action} className="flex flex-col gap-4">
      {direction === "sent" && payDetails?.qrUrl && (
        <div className="flex flex-col items-start gap-3">
          <strong>Scan to pay {otherName}</strong>
          {/* biome-ignore lint/performance/noImgElement: private short-lived storage image */}
          <img
            src={payDetails.qrUrl}
            alt={`${otherName}'s bank or e-wallet payment QR`}
            width={280}
            height={280}
            className="max-w-full self-center object-contain"
          />
          {payDetails.qrDownloadUrl && (
            <a href={payDetails.qrDownloadUrl} className="btn-ink min-h-11 no-underline">
              Save QR
            </a>
          )}
          <p className="m-0 text-sm text-muted-light">
            On this phone? Save the QR, then import it in your bank or e-wallet app. Check the
            recipient's name before sending.
          </p>
        </div>
      )}
      {direction === "sent" && (payDetails?.gcash || payDetails?.maya) && (
        <div className="flex flex-col gap-2 rounded-2xl bg-paper p-3">
          <span className="text-[13px] font-semibold text-muted-light">Send to {otherName}</span>
          {payDetails.gcash && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="money">GCash · {payDetails.gcash}</span>
              <CopyButton text={payDetails.gcash.replace(/\s/g, "")} label="Copy number" />
            </div>
          )}
          {payDetails.maya && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="money">Maya · {payDetails.maya}</span>
              <CopyButton text={payDetails.maya.replace(/\s/g, "")} label="Copy number" />
            </div>
          )}
        </div>
      )}

      <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">How did you pay?</legend>
        {METHODS.map((m) => (
          <label
            key={m.value}
            className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold ${
              method === m.value ? "border-ink bg-ink text-paper" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="method"
              value={m.value}
              checked={method === m.value}
              onChange={() => setMethod(m.value)}
              className="sr-only"
            />
            {m.label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Amount
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={amountDue > 0 ? toDecimalString(amountDue) : ""}
            className="input money display text-xl"
          />
        </label>
        {needsReference && (
          <label className="field">
            Reference number
            <input
              name="reference"
              required
              minLength={4}
              maxLength={40}
              inputMode="numeric"
              placeholder="From your receipt"
              className="input money"
            />
          </label>
        )}
      </div>

      {direction === "sent" && (
        <label className="field">
          {method === "cash" ? "Payment proof (optional)" : "Upload payment proof (optional)"}
          <input name="proof" type="file" accept="image/*" className="input py-2 text-sm" />
          <span className="text-[13px] font-normal text-muted-light">
            Only you and {otherName} can see it.
          </span>
        </label>
      )}
      <label className="field">
        Note (optional)
        <input
          name="note"
          maxLength={200}
          placeholder={method === "cash" ? "Handed over at Jollibee" : ""}
          className="input"
        />
      </label>

      <FormStatus result={proofError ? { ok: false, error: proofError } : result} />
      <div className="self-start rounded-full bg-ink p-1.5">
        <PrimaryButton pending={pending} icon="check">
          {direction === "sent" ? "Submit payment" : `${otherName} paid me`}
        </PrimaryButton>
      </div>
    </form>
  );
}
