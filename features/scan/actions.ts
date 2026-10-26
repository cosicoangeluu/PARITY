"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { readReceipt } from "@/adapters/receipt";
import { parseAmount } from "@/core/money";
import type { ParsedReceipt } from "@/core/receipt";
import { type ActionResult, run } from "@/lib/result";
import {
  AccessError,
  activeParticipants,
  ensureDeviceId,
  finalizeBillSnapshot,
  type GroupContext,
  grantOrganizer,
  hashKey,
  loadGroupContext,
  loadItemSelectionContext,
  logActivity,
  newToken,
  requireGroupContext,
  requireMe,
  requireUnlocked,
  saveBillItem,
  selectItemSpot,
} from "@/server/access";
import { db, must } from "@/server/db";
import { env } from "@/server/env";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { broadcastChange } from "@/server/realtime";
import { uploadImage } from "@/server/storage";
import { type BillView, isFullyPaid, loadBill, markBillPaid } from "./queries";

const MAX_PARTS = 6;

type ReadOutcome = { receipt: ParsedReceipt } | { useBrowserReader: true };
const MAX_PART_BYTES = 1_048_576;

function partsFrom(form: FormData): File[] {
  const parts = form.getAll("part").filter((p): p is File => p instanceof File && p.size > 0);
  if (parts.length === 0) throw new AccessError("Add at least one photo of the receipt.");
  if (parts.length > MAX_PARTS)
    throw new AccessError(`A receipt can have up to ${MAX_PARTS} parts.`);
  for (const p of parts)
    if (p.size > MAX_PART_BYTES) throw new AccessError("Each photo must be under 1 MB.");
  return parts;
}

/** Reads one or more photo parts. All parts go to Gemini in ONE request (one scan from the quota). */
export async function readReceiptAction(
  groupToken: string | null,
  form: FormData,
): Promise<ActionResult<ReadOutcome>> {
  return run<ReadOutcome>(async () => {
    const ip = await clientIp();
    await rateLimit(`scan:${ip}`, 86_400, 60);
    if (groupToken) {
      const ctx = await requireGroupContext(groupToken);
      requireMe(ctx);
      await rateLimit(`scan:group:${ctx.group.id}`, 86_400, env.dailyScanLimitPerGroup());
    }
    const parts = partsFrom(form);
    const images = await Promise.all(
      parts.map(async (p) => ({
        bytes: new Uint8Array(await p.arrayBuffer()),
        mimeType: p.type || "image/jpeg",
      })),
    );
    const result = await readReceipt(images);
    if (result.ok) return { ok: true, data: { receipt: result.receipt } };
    console.warn("Server receipt readers unavailable:", result.reason);
    return { ok: true, data: { useBrowserReader: true } };
  });
}

const BillPayload = z.object({
  title: z.string().trim().min(1, "Give the bill a name.").max(80),
  merchant: z.string().trim().max(80).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  payerId: z.string().uuid().optional(),
  payerName: z.string().trim().min(1).max(40).optional(),
  receiptTotal: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Every item needs a name.").max(80),
        qty: z.number().int().min(1).max(99),
        shareCount: z.number().int().min(1).max(99).optional(),
        total: z.number().int().min(0),
        sharedByAll: z.boolean().default(false),
        part: z
          .number()
          .int()
          .min(0)
          .max(MAX_PARTS - 1)
          .default(0),
      }),
    )
    .min(1, "Add at least one item.")
    .max(200),
  serviceCharge: z.number().int().min(0).default(0),
  deliveryFee: z.number().int().min(0).default(0),
  discount: z.number().int().min(0).default(0),
});

/**
 * Creates the bill and its claim link. With a Group token the bill belongs to that Group;
 * without one (a one-off dinner) a quick Group is created with the payer in it.
 */
export async function createBill(
  groupToken: string | null,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ip = await clientIp();
    await rateLimit(`bill:${ip}`, 3600, 30);
    const payload = BillPayload.parse(JSON.parse(String(form.get("payload") ?? "{}")));
    const parts = form
      .getAll("part")
      .filter((p): p is File => p instanceof File && p.size > 0)
      .slice(0, MAX_PARTS);

    let ctx: GroupContext;
    if (groupToken) {
      ctx = await requireGroupContext(groupToken);
      requireMe(ctx);
      requireUnlocked(ctx);
      if (!payload.payerId || !activeParticipants(ctx).some((p) => p.id === payload.payerId)) {
        throw new AccessError("Pick who paid the bill.");
      }
    } else {
      if (!payload.payerName) throw new AccessError("Enter your name.");
      const deviceId = await ensureDeviceId();
      const organizerKey = newToken(24);
      const group = must(
        await db()
          .from("groups")
          .insert({
            token: newToken(),
            name: payload.title,
            kind: "quick",
            organizer_key_hash: hashKey(organizerKey),
          })
          .select("token")
          .single<{ token: string }>(),
        "Create quick group",
      );
      const loaded = await loadGroupContext(group.token);
      if (!loaded) throw new Error("Quick group missing");
      const payer = must(
        await db()
          .from("participants")
          .insert({
            group_id: loaded.group.id,
            name: payload.payerName,
            device_id: deviceId,
            first_seen_at: new Date().toISOString(),
          })
          .select("*")
          .single(),
        "Add payer",
      );
      await grantOrganizer(loaded.group.id, organizerKey);
      ctx = { ...loaded, participants: [payer], me: payer, isOrganizer: true, deviceId };
      payload.payerId = payer.id;
    }
    const me = requireMe(ctx);

    const token = newToken();
    const bill = must(
      await db()
        .from("bills")
        .insert({
          group_id: ctx.group.id,
          token,
          title: payload.title,
          merchant: payload.merchant ?? null,
          receipt_date: payload.date ?? null,
          payer_id: payload.payerId,
          created_by: me.id,
          receipt_total: payload.receiptTotal ?? null,
        })
        .select("id")
        .single<{ id: string }>(),
      "Create bill",
    );

    must(
      await db()
        .from("bill_items")
        .insert(
          payload.items.map((item, position) => ({
            bill_id: bill.id,
            position,
            name: item.name,
            qty: item.qty,
            total: item.total,
            shared_by_all: item.sharedByAll,
            share_count: item.sharedByAll ? null : (item.shareCount ?? item.qty),
            source_part: item.part,
          })),
        ),
      "Save items",
    );

    const adjustments = [
      { label: "Service charge", amount: payload.serviceCharge },
      { label: "Delivery fee", amount: payload.deliveryFee },
      { label: "Discount", amount: -payload.discount },
    ].filter((a) => a.amount !== 0);
    if (adjustments.length) {
      must(
        await db()
          .from("bill_adjustments")
          .insert(adjustments.map((a) => ({ ...a, bill_id: bill.id }))),
        "Save charges",
      );
    }

    must(
      await db()
        .from("bill_members")
        .insert(
          activeParticipants(ctx).map((p) => ({
            bill_id: bill.id,
            participant_id: p.id,
            opened_at: p.id === me.id ? new Date().toISOString() : null,
          })),
        ),
      "Add members",
    );

    const paths: string[] = [];
    for (const [i, part] of parts.entries()) {
      paths.push(
        await uploadImage("receipts", `${bill.id}/part-${i + 1}.jpg`, part, MAX_PART_BYTES),
      );
    }
    if (paths.length) await db().from("bills").update({ image_paths: paths }).eq("id", bill.id);

    await logActivity(ctx, "bill.created", {
      billId: bill.id,
      title: payload.title,
      items: payload.items.length,
    });
    await broadcastChange(`g:${ctx.group.token}`);
    redirect(`/b/${token}?share=1`);
  });
}

// Claiming ------------------------------------------------------------------------------------

async function billFor(billToken: string): Promise<BillView> {
  const view = await loadBill(billToken);
  if (!view) throw new AccessError("This bill link isn't valid anymore.");
  return view;
}

async function touched(view: BillView) {
  await Promise.all([
    broadcastChange(`b:${view.bill.token}`),
    broadcastChange(`g:${view.ctx.group.token}`),
  ]);
  refresh();
}

/** Ticks (qty > 0) or unticks (qty 0) an item for the person on this device. */
export async function setClaim(
  billToken: string,
  itemId: string,
  qty: number,
): Promise<ActionResult> {
  return run(async () => {
    const { ctx, bill, item } = await loadItemSelectionContext(billToken, itemId);
    const units = qty;
    await selectItemSpot(ctx, bill.id, itemId, units);
    // The spot is committed. Activity and notifications can follow the response.
    after(async () => {
      await Promise.all([
        logActivity(ctx, units ? "claim.ticked" : "claim.unticked", {
          billId: bill.id,
          item: item.name,
          qty: units,
        }),
        broadcastChange(`b:${bill.token}`),
        broadcastChange(`g:${ctx.group.token}`),
      ]);
    });
    refresh();
  });
}

export async function markOpened(billToken: string): Promise<void> {
  const view = await loadBill(billToken);
  if (!view?.ctx.me) return;
  const member = view.members.find((m) => m.participant_id === view.ctx.me?.id);
  if (member?.opened_at) return;
  await db().from("bill_members").upsert(
    {
      bill_id: view.bill.id,
      participant_id: view.ctx.me.id,
      opened_at: new Date().toISOString(),
    },
    { onConflict: "bill_id,participant_id" },
  );
  await touched(view);
}

export async function setDone(billToken: string, done: boolean): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    const me = requireMe(view.ctx);
    if (view.bill.status !== "claiming")
      throw new AccessError("Selection is already closed. Open the bill again to pay.");
    must(
      await db()
        .from("bill_members")
        .upsert(
          {
            bill_id: view.bill.id,
            participant_id: me.id,
            opened_at: new Date().toISOString(),
            done_at: done ? new Date().toISOString() : null,
          },
          { onConflict: "bill_id,participant_id" },
        ),
      "Done",
    );
    await touched(view);
  });
}

// Organizer -------------------------------------------------------------------------------------

function requireBillOrganizer(view: BillView) {
  if (!view.isBillOrganizer)
    throw new AccessError("Only the person who made the list can do that.");
}

/** Leftover items: give to one person, split among everyone, or keep (the payer). */
export async function assignItem(
  billToken: string,
  itemId: string,
  target: string,
): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    requireBillOrganizer(view);
    if (view.bill.status !== "claiming") throw new AccessError("Reopen the bill to change items.");
    const item = view.items.find((i) => i.id === itemId);
    if (!item) throw new AccessError("That item isn't on this bill.");
    if (item.share_count != null)
      throw new AccessError(
        "Members select their own spots. Change the number of people sharing if needed.",
      );
    if (target === "all") {
      must(
        await db().from("bill_items").update({ shared_by_all: true }).eq("id", itemId),
        "Share with all",
      );
      must(await db().from("item_claims").delete().eq("item_id", itemId), "Clear claims");
    } else {
      const personId = target === "payer" ? view.bill.payer_id : target;
      if (!view.ctx.participants.some((p) => p.id === personId))
        throw new AccessError("Pick someone in the Group.");
      const claimed = view.claims
        .filter((c) => c.item_id === itemId)
        .reduce((s, c) => s + c.qty, 0);
      const left = item.qty > 1 ? Math.max(item.qty - claimed, 1) : 1;
      const existing = view.claims.find(
        (c) => c.item_id === itemId && c.participant_id === personId,
      );
      must(
        await db()
          .from("item_claims")
          .upsert(
            {
              item_id: itemId,
              participant_id: personId,
              qty: (existing?.qty ?? 0) + (item.qty > 1 ? left : 0) || 1,
            },
            { onConflict: "item_id,participant_id" },
          ),
        "Assign",
      );
    }
    await logActivity(view.ctx, "bill.item_assigned", {
      billId: view.bill.id,
      item: item.name,
      target,
    });
    await touched(view);
  });
}

const ItemEdit = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.coerce.number().int().min(1).max(99),
  total: z.string(),
  shareCount: z.coerce.number().int().min(1).max(99),
});

/** Items lock at the first claim; after that only the organizer edits, and it is logged. */
export async function editItem(
  billToken: string,
  itemId: string | null,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    requireBillOrganizer(view);
    if (view.bill.status !== "claiming") throw new AccessError("Reopen the bill to edit items.");
    const input = ItemEdit.parse({
      name: form.get("name"),
      qty: form.get("qty"),
      total: form.get("total"),
      shareCount: form.get("shareCount") ?? 1,
    });
    const total = parseAmount(input.total);
    if (total === null || total < 0) throw new AccessError("Enter the line total, like 380.");

    const affected = itemId
      ? view.claims
          .filter((c) => c.item_id === itemId)
          .map((c) => view.ctx.participants.find((p) => p.id === c.participant_id)?.name)
      : [];
    const existing = itemId ? view.items.find((i) => i.id === itemId) : null;
    if (itemId && !existing) throw new AccessError("That item isn't on this list.");
    await saveBillItem(view.ctx, view.bill, itemId, {
      name: input.name,
      qty: input.qty,
      total,
      share_count: existing && existing.share_count == null ? null : input.shareCount,
      position: existing?.position ?? view.items.length,
    });
    await logActivity(view.ctx, itemId ? "bill.item_edited" : "bill.item_added", {
      billId: view.bill.id,
      item: input.name,
      affected,
    });
    await touched(view);
    return {
      ok: true,
      message: affected.length ? `Saved. ${affected.join(", ")} will see the change.` : "Saved.",
    };
  });
}

export async function deleteItem(billToken: string, itemId: string): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    requireBillOrganizer(view);
    if (view.bill.status !== "claiming") throw new AccessError("Reopen the bill to edit items.");
    const item = view.items.find((i) => i.id === itemId);
    must(
      await db().from("bill_items").delete().eq("id", itemId).eq("bill_id", view.bill.id),
      "Delete item",
    );
    await logActivity(view.ctx, "bill.item_deleted", { billId: view.bill.id, item: item?.name });
    await touched(view);
  });
}

export async function setPersonalDiscount(
  billToken: string,
  participantId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    requireBillOrganizer(view);
    if (view.bill.status !== "claiming")
      throw new AccessError("Reopen the bill to change discounts.");
    const amount = parseAmount(String(form.get("amount") ?? "0")) ?? 0;
    if (amount <= 0) {
      await db()
        .from("personal_discounts")
        .delete()
        .eq("bill_id", view.bill.id)
        .eq("participant_id", participantId);
    } else {
      must(
        await db()
          .from("personal_discounts")
          .upsert(
            { bill_id: view.bill.id, participant_id: participantId, amount, label: "Senior/PWD" },
            { onConflict: "bill_id,participant_id" },
          ),
        "Discount",
      );
    }
    await logActivity(view.ctx, "bill.discount", { billId: view.bill.id, participantId, amount });
    await touched(view);
    return { ok: true, message: "Saved." };
  });
}

/** Closes claiming and records the bill in the Group as one expense with fixed shares. */
export async function finalizeBill(billToken: string): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    requireBillOrganizer(view);
    if (view.bill.status !== "claiming") throw new AccessError("This bill is already finalized.");
    if (view.computation.unclaimed.length)
      throw new AccessError("Some items are unclaimed. Assign them first.");
    if (view.computation.overclaimed.length)
      throw new AccessError("Some items were claimed more times than the receipt has.");

    const shares = Object.entries(view.computation.perPerson).filter(([, s]) => s.total > 0);
    const total = shares.reduce((s, [, share]) => s + share.total, 0);
    if (total <= 0) throw new AccessError("Nothing to split yet.");

    await finalizeBillSnapshot(
      view.ctx,
      view.bill,
      total,
      shares.map(([participantId, share]) => ({ participantId, amount: share.total })),
    );
    await logActivity(view.ctx, "bill.finalized", {
      billId: view.bill.id,
      title: view.bill.title,
      total,
    });
    const finalized = await loadBill(billToken);
    if (
      finalized &&
      isFullyPaid(finalized) &&
      !finalized.payments.some((p) => p.status === "pending")
    ) {
      await markBillPaid(finalized);
    }
    await touched(view);
  });
}

/** Reopens a finalized bill (before anyone has paid) so items or claims can be fixed. */
export async function reopenBill(billToken: string): Promise<ActionResult> {
  return run(async () => {
    const view = await billFor(billToken);
    requireBillOrganizer(view);
    if (view.payments.some((p) => p.status !== "rejected")) {
      throw new AccessError("Someone already marked a payment. Sort that out before reopening.");
    }
    must(await db().from("entries").delete().eq("bill_id", view.bill.id), "Remove bill expense");
    must(
      await db()
        .from("bills")
        .update({ status: "claiming", finalized_at: null })
        .eq("id", view.bill.id),
      "Reopen",
    );
    await logActivity(view.ctx, "bill.reopened", { billId: view.bill.id });
    await touched(view);
  });
}
