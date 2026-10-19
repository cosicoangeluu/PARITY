"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { parseAmount } from "@/core/money";
import { type SplitMember, split } from "@/core/split";
import { type ActionResult, run } from "@/lib/result";
import {
  AccessError,
  activeParticipants,
  logActivity,
  requireGroupContext,
  requireMe,
  requireUnlocked,
} from "@/server/access";
import { db, must } from "@/server/db";
import { broadcastChange } from "@/server/realtime";
import type { EntryRow } from "@/server/types";

const Amount = z.string().transform((value, c) => {
  const amount = parseAmount(value);
  if (amount === null || amount <= 0) {
    c.addIssue({ code: "custom", message: "Enter an amount like 450 or 1,250.50." });
    return z.NEVER;
  }
  return amount;
});

const EntryInput = z.object({
  kind: z.enum(["expense", "transfer", "income"]),
  title: z.string().trim().min(1, "Give it a short name, like Dinner.").max(80),
  amount: Amount,
  payerId: z.string().uuid("Pick who paid."),
  recipientId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  category: z.string().trim().max(30).optional(),
  mode: z.enum(["equal", "shares", "percent", "fixed"]).default("equal"),
  members: z.array(z.string().uuid()).default([]),
});

export async function saveEntry(
  token: string,
  entryId: string | null,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    const me = requireMe(ctx);
    requireUnlocked(ctx);
    const input = EntryInput.parse({
      kind: form.get("kind"),
      title: form.get("title"),
      amount: form.get("amount") ?? "",
      payerId: form.get("payerId"),
      recipientId: form.get("recipientId") || undefined,
      date: form.get("date"),
      category: form.get("category") || undefined,
      mode: form.get("mode") || "equal",
      members: form.getAll("members").map(String),
    });

    const active = new Set(activeParticipants(ctx).map((p) => p.id));
    if (!active.has(input.payerId)) throw new AccessError("Pick who paid from the Group.");

    let splits: Record<string, number> = {};
    if (input.kind === "transfer") {
      if (!input.recipientId || !active.has(input.recipientId))
        throw new AccessError("Pick who received the money.");
      if (input.recipientId === input.payerId) throw new AccessError("Pick two different people.");
    } else {
      const members: SplitMember[] = input.members
        .filter((id) => active.has(id))
        .map((id) => {
          const raw = String(form.get(`value:${id}`) ?? "");
          if (input.mode === "fixed") return { id, amount: parseAmount(raw || "0") ?? Number.NaN };
          return { id, weight: input.mode === "equal" ? 1 : Number(raw || "0") };
        });
      splits = split(input.amount, input.mode, members, input.payerId);
    }

    const row = {
      group_id: ctx.group.id,
      kind: input.kind,
      title: input.title,
      amount: input.amount,
      payer_id: input.payerId,
      recipient_id: input.kind === "transfer" ? input.recipientId : null,
      split_mode: input.kind === "transfer" ? "equal" : input.mode,
      category: input.kind === "expense" ? (input.category ?? null) : null,
      entry_date: input.date,
    };

    let id = entryId;
    if (entryId) {
      const existing = must(
        await db()
          .from("entries")
          .select("*")
          .eq("id", entryId)
          .eq("group_id", ctx.group.id)
          .single<EntryRow>(),
        "Load entry",
      );
      if (existing.bill_id || existing.payment_id) {
        throw new AccessError(
          "This entry comes from a scanned bill or a payment. Change it there.",
        );
      }
      must(await db().from("entries").update(row).eq("id", entryId), "Update entry");
      must(await db().from("entry_splits").delete().eq("entry_id", entryId), "Clear splits");
    } else {
      id = must(
        await db()
          .from("entries")
          .insert({ ...row, created_by: me.id })
          .select("id")
          .single<{ id: string }>(),
        "Add entry",
      ).id;
    }

    const splitRows = Object.entries(splits).map(([participantId, amount]) => ({
      entry_id: id,
      participant_id: participantId,
      amount,
      weight: input.mode === "fixed" ? null : Number(form.get(`value:${participantId}`) || 1),
    }));
    if (splitRows.length) must(await db().from("entry_splits").insert(splitRows), "Save splits");

    await logActivity(ctx, entryId ? "entry.edited" : "entry.added", {
      entryId: id,
      title: input.title,
      amount: input.amount,
      kind: input.kind,
    });
    await broadcastChange(`g:${token}`);
    redirect(`/g/${token}/expenses`);
  });
}

/** Deleted entries go to the trash for 30 days. */
export async function deleteEntry(token: string, entryId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireMe(ctx);
    requireUnlocked(ctx);
    const entry = must(
      await db()
        .from("entries")
        .select("*")
        .eq("id", entryId)
        .eq("group_id", ctx.group.id)
        .single<EntryRow>(),
      "Load entry",
    );
    if (entry.payment_id) throw new AccessError("Confirmed payments can't be deleted here.");
    must(
      await db().from("entries").update({ deleted_at: new Date().toISOString() }).eq("id", entryId),
      "Delete",
    );
    await logActivity(ctx, "entry.deleted", { entryId, title: entry.title, amount: entry.amount });
    await broadcastChange(`g:${token}`);
    redirect(`/g/${token}/expenses`);
  });
}

export async function restoreEntry(token: string, entryId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireMe(ctx);
    must(
      await db()
        .from("entries")
        .update({ deleted_at: null })
        .eq("id", entryId)
        .eq("group_id", ctx.group.id),
      "Restore",
    );
    await logActivity(ctx, "entry.restored", { entryId });
    await broadcastChange(`g:${token}`);
    return { ok: true, message: "Restored." };
  });
}
