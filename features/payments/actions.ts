"use server";

import { z } from "zod";
import { parseAmount } from "@/core/money";
import { type ActionResult, run } from "@/lib/result";
import {
  AccessError,
  type GroupContext,
  logActivity,
  requireGroupContext,
  requireMe,
} from "@/server/access";
import { db, must } from "@/server/db";
import { broadcastChange } from "@/server/realtime";
import { uploadImage } from "@/server/storage";
import type { PaymentRow } from "@/server/types";
import { isFullyPaid, loadBill, markBillPaid } from "../scan/queries";

const STEP_IN_AFTER_DAYS = 7;

const PaymentInput = z
  .object({
    amount: z.string().transform((v, c) => {
      const amount = parseAmount(v);
      if (amount === null || amount <= 0) {
        c.addIssue({ code: "custom", message: "Enter the amount you paid." });
        return z.NEVER;
      }
      return amount;
    }),
    method: z.enum(["gcash", "maya", "bank", "cash", "other"]),
    reference: z.string().trim().max(40).optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine(
    (p) =>
      !["gcash", "maya", "bank"].includes(p.method) || (p.reference && p.reference.length >= 4),
    {
      message: "Add the reference number from your e-wallet or bank receipt.",
      path: ["reference"],
    },
  );

async function notify(ctx: GroupContext, billId: string | null) {
  await broadcastChange(`g:${ctx.group.token}`);
  if (billId) {
    const { data } = await db()
      .from("bills")
      .select("token")
      .eq("id", billId)
      .maybeSingle<{ token: string }>();
    if (data) await broadcastChange(`b:${data.token}`);
  }
}

async function validBill(ctx: GroupContext, billId: string | null, toId: string) {
  if (!billId) return null;
  const { data } = await db()
    .from("bills")
    .select("id, payer_id, status")
    .eq("id", billId)
    .eq("group_id", ctx.group.id)
    .maybeSingle<{
      id: string;
      payer_id: string;
      status: string;
    }>();
  if (!data) throw new AccessError("That bill isn't in this Group.");
  if (data.status === "claiming")
    throw new AccessError("Wait until the bill is finalized before paying.");
  if (data.payer_id !== toId) throw new AccessError("Bill payments go to whoever paid the bill.");
  return data;
}

/** "I paid": the payment waits as Pending until the payee confirms it. */
export async function recordPayment(
  groupToken: string,
  billId: string | null,
  toId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(groupToken);
    const me = requireMe(ctx);
    if (me.id === toId) throw new AccessError("You can't pay yourself.");
    if (!ctx.participants.some((p) => p.id === toId)) throw new AccessError("Pick who you paid.");
    await validBill(ctx, billId, toId);
    const input = PaymentInput.parse({
      amount: form.get("amount") ?? "",
      method: form.get("method"),
      reference: form.get("reference") || undefined,
      note: form.get("note") || undefined,
    });

    const payment = must(
      await db()
        .from("payments")
        .insert({
          group_id: ctx.group.id,
          bill_id: billId,
          from_id: me.id,
          to_id: toId,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          note: input.note ?? null,
        })
        .select("id")
        .single<{ id: string }>(),
      "Record payment",
    );
    const proof = form.get("proof");
    if (proof instanceof File && proof.size > 0) {
      const path = await uploadImage("proofs", `${ctx.group.id}/${payment.id}.jpg`, proof, 524_288);
      await db().from("payments").update({ proof_path: path }).eq("id", payment.id);
    }
    await logActivity(ctx, "payment.sent", {
      paymentId: payment.id,
      to: toId,
      amount: input.amount,
      method: input.method,
    });
    await notify(ctx, billId);
    return { ok: true, message: "Marked as paid. Waiting for confirmation." };
  });
}

/** The payee records money they received ("Carlo paid me ₱500 cash"). Confirmed at once. */
export async function recordReceived(
  groupToken: string,
  billId: string | null,
  fromId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(groupToken);
    const me = requireMe(ctx);
    if (me.id === fromId) throw new AccessError("Pick who paid you.");
    await validBill(ctx, billId, me.id);
    const input = PaymentInput.parse({
      amount: form.get("amount") ?? "",
      method: form.get("method"),
      reference: form.get("reference") || "manual",
      note: form.get("note") || undefined,
    });
    const payment = must(
      await db()
        .from("payments")
        .insert({
          group_id: ctx.group.id,
          bill_id: billId,
          from_id: fromId,
          to_id: me.id,
          amount: input.amount,
          method: input.method,
          reference: input.reference === "manual" ? null : (input.reference ?? null),
          note: input.note ?? null,
          status: "confirmed",
          decided_at: new Date().toISOString(),
          decided_by: me.id,
        })
        .select("*")
        .single<PaymentRow>(),
      "Record received",
    );
    await settle(ctx, payment, me.id);
    return { ok: true, message: "Recorded." };
  });
}

function canDecide(ctx: GroupContext, payment: PaymentRow): boolean {
  if (ctx.me?.id === payment.to_id) return true;
  const ageDays = (Date.now() - new Date(payment.created_at).getTime()) / 86_400_000;
  return ctx.isOrganizer && ageDays >= STEP_IN_AFTER_DAYS;
}

async function loadPayment(ctx: GroupContext, paymentId: string): Promise<PaymentRow> {
  const payment = must(
    await db()
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("group_id", ctx.group.id)
      .single<PaymentRow>(),
    "Load payment",
  );
  if (payment.status !== "pending") throw new AccessError("This payment was already decided.");
  if (!canDecide(ctx, payment)) {
    throw new AccessError(
      `Only the person who received it can confirm. The organizer can step in after ${STEP_IN_AFTER_DAYS} days.`,
    );
  }
  return payment;
}

/** Turns a confirmed payment into a Transfer entry, so balances recalculate. */
async function settle(ctx: GroupContext, payment: PaymentRow, decidedBy: string) {
  must(
    await db()
      .from("entries")
      .insert({
        group_id: ctx.group.id,
        kind: "transfer",
        title: payment.bill_id ? "Bill payment" : "Payment",
        amount: payment.amount,
        payer_id: payment.from_id,
        recipient_id: payment.to_id,
        payment_id: payment.id,
        bill_id: payment.bill_id,
        created_by: decidedBy,
      }),
    "Record transfer",
  );
  await logActivity(ctx, "payment.confirmed", {
    paymentId: payment.id,
    from: payment.from_id,
    amount: payment.amount,
  });

  if (payment.bill_id) {
    const { data } = await db()
      .from("bills")
      .select("token")
      .eq("id", payment.bill_id)
      .maybeSingle<{ token: string }>();
    const view = data ? await loadBill(data.token) : null;
    if (view && view.bill.status === "finalized" && isFullyPaid(view)) await markBillPaid(view);
  }
  await notify(ctx, payment.bill_id);
}

export async function confirmPayment(groupToken: string, paymentId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(groupToken);
    const me = requireMe(ctx);
    const payment = await loadPayment(ctx, paymentId);
    must(
      await db()
        .from("payments")
        .update({ status: "confirmed", decided_at: new Date().toISOString(), decided_by: me.id })
        .eq("id", payment.id)
        .eq("status", "pending"),
      "Confirm",
    );
    await settle(ctx, { ...payment, status: "confirmed" }, me.id);
  });
}

export async function rejectPayment(
  groupToken: string,
  paymentId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(groupToken);
    const me = requireMe(ctx);
    const payment = await loadPayment(ctx, paymentId);
    const reason = z
      .string()
      .trim()
      .min(1, "Say why, so they know what to fix.")
      .max(120)
      .parse(form.get("reason") ?? "");
    must(
      await db()
        .from("payments")
        .update({
          status: "rejected",
          reject_reason: reason,
          decided_at: new Date().toISOString(),
          decided_by: me.id,
        })
        .eq("id", payment.id),
      "Reject",
    );
    await logActivity(ctx, "payment.rejected", { paymentId: payment.id, reason });
    await notify(ctx, payment.bill_id);
    return { ok: true, message: "Rejected. They'll see your reason." };
  });
}
