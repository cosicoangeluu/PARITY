"use client";

import { useActionState, useState, useTransition } from "react";
import { compressImage } from "@/lib/image";
import { FormStatus } from "@/ui/FormStatus";
import {
  addParticipant,
  approveParticipant,
  removeParticipant,
  replaceLink,
  resetNameLock,
  setDefaultShare,
  toggleLock,
  updateMyPayDetails,
} from "../groups/actions";

export function PayDetailsForm({
  token,
  gcash,
  maya,
  qrUrl,
}: {
  token: string;
  gcash: string | null;
  maya: string | null;
  qrUrl?: string | null;
}) {
  const [result, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateMyPayDetails>> | null, form: FormData) => {
      const qr = form.get("qr");
      if (qr instanceof File && qr.size) {
        try {
          form.set(
            "qr",
            await compressImage(qr, { maxBytes: 450_000, maxSide: 1600 }),
            "payment-qr.jpg",
          );
        } catch {
          return {
            ok: false as const,
            error: "Couldn't read that QR image. Choose a JPEG, PNG or WebP image.",
          };
        }
      }
      return updateMyPayDetails(token, prev, form);
    },
    null,
  );
  return (
    <form action={action} className="card flex flex-col gap-4">
      <p className="m-0 text-[15px] text-muted-light">
        Members see only the group creator's payment details when they pay their share.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          GCash number
          <input
            name="gcash"
            defaultValue={gcash ?? ""}
            inputMode="tel"
            placeholder="0917 123 4567"
            className="input money"
          />
        </label>
        <label className="field">
          Maya number
          <input
            name="maya"
            defaultValue={maya ?? ""}
            inputMode="tel"
            placeholder="0917 123 4567"
            className="input money"
          />
        </label>
      </div>
      <label className="field">
        Bank or e-wallet payment QR
        <input
          name="qr"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="input py-2 text-sm"
        />
        <span className="text-[13px] font-normal text-muted-light">
          Upload your receiving QR. Members can scan it or save it to use in their banking app.
        </span>
      </label>
      {qrUrl && (
        <div className="flex flex-col items-start gap-3">
          {/* biome-ignore lint/performance/noImgElement: private short-lived storage image */}
          <img
            src={qrUrl}
            alt="Current receiving payment QR"
            width={240}
            height={240}
            className="max-w-full object-contain"
          />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="removeQr" /> Remove current QR
          </label>
        </div>
      )}
      <FormStatus result={result} />
      <button type="submit" className="btn-ink self-start" disabled={pending}>
        {pending ? "Saving…" : "Save payment details"}
      </button>
    </form>
  );
}

export function AddPersonForm({ token }: { token: string }) {
  const [result, action, pending] = useActionState(addParticipant.bind(null, token), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="field min-w-48 flex-1">
        Add a person
        <input name="name" required maxLength={40} className="input" />
      </label>
      <button type="submit" className="btn-ink" disabled={pending}>
        Add
      </button>
      <div className="w-full">
        <FormStatus result={result} />
      </div>
    </form>
  );
}

export function ShareForm({
  token,
  participantId,
  share,
}: {
  token: string;
  participantId: string;
  share: number;
}) {
  const [result, action, pending] = useActionState(
    setDefaultShare.bind(null, token, participantId),
    null,
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input
        name="share"
        defaultValue={share}
        inputMode="decimal"
        aria-label="Default share"
        className="input money w-20 text-center"
      />
      <button
        type="submit"
        className="min-h-11 px-2 text-sm font-semibold text-mint-dark"
        disabled={pending}
      >
        Save
      </button>
      <FormStatus result={result} />
    </form>
  );
}

/** Small organizer buttons on a person row. */
export function PersonActions({
  token,
  participantId,
  pending,
  locked,
}: {
  token: string;
  participantId: string;
  pending: boolean;
  locked: boolean;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await fn();
      setError(r.ok ? null : (r.error ?? "Failed"));
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {pending && (
        <button
          type="button"
          className="btn-ink min-h-11 text-sm"
          disabled={isPending}
          onClick={() => act(() => approveParticipant(token, participantId))}
        >
          Approve
        </button>
      )}
      {locked && (
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-semibold text-mint-dark"
          disabled={isPending}
          onClick={() =>
            act(
              () => resetNameLock(token, participantId),
              "Free this name so it can be picked on another device?",
            )
          }
        >
          Reset device
        </button>
      )}
      <button
        type="button"
        className="btn-danger-text"
        disabled={isPending}
        onClick={() =>
          act(() => removeParticipant(token, participantId), "Remove this person from the Group?")
        }
      >
        Remove
      </button>
      {error && <span className="form-error w-full">{error}</span>}
    </div>
  );
}

export function GroupControls({ token, locked }: { token: string; locked: boolean }) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-outline-light"
          disabled={isPending}
          onClick={() =>
            start(async () => {
              const r = await toggleLock(token);
              if (!r.ok) setError(r.error);
            })
          }
        >
          {locked ? "Unlock the Group" : "Lock the Group"}
        </button>
        <button
          type="button"
          className="btn-outline-light"
          disabled={isPending}
          onClick={() => {
            if (
              !window.confirm(
                "Make a new link? The current link stops working for everyone right away.",
              )
            )
              return;
            start(async () => {
              const r = await replaceLink(token);
              if (r && !r.ok) setError(r.error);
            });
          }}
        >
          Replace the link
        </button>
      </div>
      {error && <p className="form-error m-0">{error}</p>}
    </div>
  );
}
