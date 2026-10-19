"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyHuman } from "@/adapters/captcha/turnstile";
import { type ActionResult, run } from "@/lib/result";
import {
  AccessError,
  ensureDeviceId,
  grantOrganizer,
  hashKey,
  loadGroupContext,
  logActivity,
  newToken,
  requireGroupContext,
  requireMe,
  requireOrganizer,
} from "@/server/access";
import { db, must } from "@/server/db";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { broadcastChange } from "@/server/realtime";
import { loadLedger } from "./queries";

const Name = z
  .string()
  .trim()
  .min(1, "Every name needs at least one letter.")
  .max(40, "Names can be up to 40 characters.");

const CreateGroup = z.object({
  name: z.string().trim().min(1, "Give your Group a name.").max(80),
  currency: z.string().trim().length(3).default("PHP"),
  myName: Name,
  others: z.array(Name).max(500),
});

export async function createGroup(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ip = await clientIp();
    await rateLimit(`create:${ip}`, 3600, 15);
    if (!(await verifyHuman(form.get("cf-turnstile-response")?.toString() ?? null, ip))) {
      throw new AccessError("Please complete the check that you're human.");
    }
    const input = CreateGroup.parse({
      name: form.get("name"),
      currency: form.get("currency") || "PHP",
      myName: form.get("myName"),
      others: form
        .getAll("others")
        .map(String)
        .filter((n) => n.trim() !== ""),
    });
    const allNames = [input.myName, ...input.others];
    const lower = allNames.map((n) => n.toLowerCase());
    if (new Set(lower).size !== lower.length)
      throw new AccessError("Two people have the same name. Add a last initial.");

    const deviceId = await ensureDeviceId();
    const token = newToken();
    const organizerKey = newToken(24);
    const group = must(
      await db()
        .from("groups")
        .insert({
          token,
          name: input.name,
          currency: input.currency.toUpperCase(),
          organizer_key_hash: hashKey(organizerKey),
        })
        .select("id")
        .single<{ id: string }>(),
      "Create group",
    );
    must(
      await db()
        .from("participants")
        .insert(
          allNames.map((name, i) => ({
            group_id: group.id,
            name,
            device_id: i === 0 ? deviceId : null,
            first_seen_at: i === 0 ? new Date().toISOString() : null,
          })),
        ),
      "Add participants",
    );
    await grantOrganizer(group.id, organizerKey);
    const ctx = await loadGroupContext(token);
    if (ctx) await logActivity(ctx, "group.created", { name: input.name });
    redirect(`/g/${token}?welcome=1`);
  });
}

/** Ties this device to a participant name (name lock). */
export async function pickName(token: string, participantId: string): Promise<ActionResult> {
  return run(async () => {
    const deviceId = await ensureDeviceId();
    const ctx = await requireGroupContext(token);
    const person = ctx.participants.find((p) => p.id === participantId);
    if (!person) throw new AccessError("That name isn't in this Group.");
    if (ctx.me && ctx.me.id !== person.id)
      throw new AccessError(`This device is already ${ctx.me.name}.`);
    if (person.device_id && person.device_id !== deviceId) {
      throw new AccessError(
        `"${person.name}" is already used on another device. Ask the organizer to reset it.`,
      );
    }
    must(
      await db()
        .from("participants")
        .update({
          device_id: deviceId,
          first_seen_at: person.first_seen_at ?? new Date().toISOString(),
        })
        .eq("id", person.id)
        .is("device_id", null),
      "Pick name",
    );
    await logActivity({ ...ctx, me: person }, "participant.joined", { name: person.name });
    await broadcastChange(`g:${token}`);
  });
}

/** "I'm not listed": quick bills add you right away; Groups wait for the organizer. */
export async function requestToJoin(
  token: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ip = await clientIp();
    await rateLimit(`join:${ip}`, 3600, 20);
    const deviceId = await ensureDeviceId();
    const ctx = await requireGroupContext(token);
    if (ctx.me) throw new AccessError(`This device is already ${ctx.me.name}.`);
    if (ctx.group.locked) throw new AccessError("This Group is locked.");
    const name = Name.parse(form.get("name"));
    if (ctx.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new AccessError("That name is taken. Add a last initial.");
    }
    const status = ctx.group.kind === "quick" ? "active" : "pending";
    const person = must(
      await db()
        .from("participants")
        .insert({
          group_id: ctx.group.id,
          name,
          status,
          device_id: deviceId,
          first_seen_at: new Date().toISOString(),
        })
        .select("*")
        .single(),
      "Join",
    );
    await logActivity(
      { ...ctx, me: person },
      status === "active" ? "participant.joined" : "participant.requested",
      { name },
    );
    await broadcastChange(`g:${token}`);
    return {
      ok: true,
      message: status === "active" ? "You're in." : "Sent. The organizer will approve your name.",
    };
  });
}

const PayDetails = z.object({
  gcash: z
    .string()
    .trim()
    .regex(/^[0-9 +-]{7,20}$/, "Use digits only, e.g. 0917 123 4567.")
    .or(z.literal("")),
  maya: z
    .string()
    .trim()
    .regex(/^[0-9 +-]{7,20}$/, "Use digits only, e.g. 0917 123 4567.")
    .or(z.literal("")),
});

export async function updateMyPayDetails(
  token: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    const me = requireMe(ctx);
    const input = PayDetails.parse({
      gcash: form.get("gcash") ?? "",
      maya: form.get("maya") ?? "",
    });
    must(
      await db()
        .from("participants")
        .update({ gcash: input.gcash || null, maya: input.maya || null })
        .eq("id", me.id),
      "Save payment details",
    );
    await logActivity(ctx, "participant.paydetails", {});
    return { ok: true, message: "Saved." };
  });
}

// Organizer actions -------------------------------------------------------------------------

export async function addParticipant(
  token: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    const name = Name.parse(form.get("name"));
    if (ctx.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new AccessError("That name is already in the Group.");
    }
    must(await db().from("participants").insert({ group_id: ctx.group.id, name }), "Add person");
    await logActivity(ctx, "participant.added", { name });
    await broadcastChange(`g:${token}`);
    return { ok: true, message: `${name} added.` };
  });
}

export async function approveParticipant(
  token: string,
  participantId: string,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    must(
      await db()
        .from("participants")
        .update({ status: "active" })
        .eq("id", participantId)
        .eq("group_id", ctx.group.id),
      "Approve",
    );
    await logActivity(ctx, "participant.approved", { participantId });
    await broadcastChange(`g:${token}`);
  });
}

export async function resetNameLock(token: string, participantId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    must(
      await db()
        .from("participants")
        .update({ device_id: null })
        .eq("id", participantId)
        .eq("group_id", ctx.group.id),
      "Reset name",
    );
    await logActivity(ctx, "participant.reset", { participantId });
  });
}

export async function removeParticipant(
  token: string,
  participantId: string,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    const ledger = await loadLedger(ctx);
    if ((ledger.balances[participantId] ?? 0) !== 0) {
      throw new AccessError("This person still has a balance. Settle it first.");
    }
    must(
      await db()
        .from("participants")
        .update({ status: "removed", device_id: null })
        .eq("id", participantId)
        .eq("group_id", ctx.group.id),
      "Remove",
    );
    await logActivity(ctx, "participant.removed", { participantId });
    await broadcastChange(`g:${token}`);
  });
}

export async function setDefaultShare(
  token: string,
  participantId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    const share = z.coerce
      .number()
      .positive("Shares must be more than zero.")
      .max(99)
      .parse(form.get("share"));
    must(
      await db()
        .from("participants")
        .update({ default_share: share })
        .eq("id", participantId)
        .eq("group_id", ctx.group.id),
      "Default share",
    );
    await logActivity(ctx, "participant.share", { participantId, share });
    return { ok: true, message: "Saved." };
  });
}

/** If a link leaks: makes a new one, and the old one stops working at once. */
export async function replaceLink(token: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    const next = newToken();
    must(await db().from("groups").update({ token: next }).eq("id", ctx.group.id), "Replace link");
    await logActivity(ctx, "group.link_replaced", {});
    redirect(`/g/${next}/people?replaced=1`);
  });
}

export async function toggleLock(token: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    requireOrganizer(ctx);
    must(
      await db().from("groups").update({ locked: !ctx.group.locked }).eq("id", ctx.group.id),
      "Lock",
    );
    await logActivity(ctx, ctx.group.locked ? "group.unlocked" : "group.locked", {});
    await broadcastChange(`g:${token}`);
  });
}

/** Opening the backup organizer link on a new phone restores organizer access. */
export async function claimOrganizer(token: string, key: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    if (hashKey(key) !== ctx.group.organizer_key_hash)
      throw new AccessError("That organizer link isn't valid anymore.");
    await ensureDeviceId();
    await grantOrganizer(ctx.group.id, key);
    redirect(`/g/${token}/people`);
  });
}
