import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db, must } from "./db";
import { env } from "./env";
import { removeImages, signedUrl, uploadImage } from "./storage";
import type { BillRow, GroupRow, ParticipantRow, PaymentRow } from "./types";

/**
 * THE ACCESS GATE. Parity has no accounts, so access is decided here and only here:
 *  - the secret link token decides which Group (or bill) you can see;
 *  - a device cookie ties you to one participant name (name lock);
 *  - an organizer cookie holding the organizer key unlocks organizer actions.
 * Every page and server action loads data through these helpers.
 */

const DEVICE_COOKIE = "parity_device";
const ORG_COOKIE_PREFIX = "parity_org_";
const YEAR = 60 * 60 * 24 * 400;

export class AccessError extends Error {}

export function newToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction(),
  path: "/",
  maxAge: YEAR,
});

export async function readDeviceId(): Promise<string | null> {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}

/** Only callable from server actions and route handlers (it may set a cookie). */
export async function ensureDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;
  const id = newToken(18);
  store.set(DEVICE_COOKIE, id, cookieOptions());
  return id;
}

/** Saves the organizer key on this device. Only callable from server actions. */
export async function grantOrganizer(groupId: string, key: string): Promise<void> {
  (await cookies()).set(`${ORG_COOKIE_PREFIX}${groupId}`, key, cookieOptions());
}

/** The organizer key saved on this device, used to show the backup organizer link. */
export async function readOrganizerKey(groupId: string): Promise<string | null> {
  return (await cookies()).get(`${ORG_COOKIE_PREFIX}${groupId}`)?.value ?? null;
}

export interface GroupContext {
  group: GroupRow;
  participants: ParticipantRow[];
  /** The participant tied to this device, if any. */
  me: ParticipantRow | null;
  isOrganizer: boolean;
  deviceId: string | null;
  creatorId: string | null;
}

export async function loadGroupContext(token: string): Promise<GroupContext | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const { data: group } = await db()
    .from("groups")
    .select("*")
    .eq("token", token)
    .maybeSingle<GroupRow>();
  if (!group) return null;
  return contextFor(group);
}

export async function loadGroupContextById(groupId: string): Promise<GroupContext> {
  const group = must(
    await db().from("groups").select("*").eq("id", groupId).single<GroupRow>(),
    "Load group",
  );
  return contextFor(group);
}

async function contextFor(group: GroupRow): Promise<GroupContext> {
  const [participantResult, creationResult, store] = await Promise.all([
    db()
      .from("participants")
      .select("*")
      .eq("group_id", group.id)
      .neq("status", "removed")
      .order("created_at"),
    // Independent of participants: fetch the creator at the same time.
    db()
      .from("activity")
      .select("actor_id")
      .eq("group_id", group.id)
      .eq("action", group.kind === "quick" ? "bill.created" : "group.created")
      .order("created_at")
      .order("id")
      .limit(1),
    cookies(),
  ]);
  const participants = must(participantResult, "Load participants") as ParticipantRow[];
  const deviceId = store.get(DEVICE_COOKIE)?.value ?? null;
  const orgKey = store.get(`${ORG_COOKIE_PREFIX}${group.id}`)?.value;
  const isOrganizer = !!orgKey && sameHash(hashKey(orgKey), group.organizer_key_hash);
  const me = deviceId ? (participants.find((p) => p.device_id === deviceId) ?? null) : null;
  // Creation activity identifies the original payer even after organizer recovery on another device.
  const creation = must(creationResult, "Load group creator") as { actor_id: string | null }[];
  const creatorId = creation[0]?.actor_id ?? (isOrganizer ? (me?.id ?? null) : null);
  const visibleParticipants = participants.map((p) =>
    p.id === creatorId
      ? p
      : {
          ...p,
          gcash: null,
          maya: null,
          pay_qr_path: null,
        },
  );
  return {
    group,
    participants: visibleParticipants,
    me: visibleParticipants.find((p) => p.id === me?.id) ?? null,
    isOrganizer,
    deviceId,
    creatorId,
  };
}

export function requirePaymentOwner(ctx: GroupContext): ParticipantRow {
  requireOrganizer(ctx);
  const creator = ctx.participants.find((p) => p.id === ctx.creatorId);
  if (!creator) throw new AccessError("The group creator's name could not be found.");
  return creator;
}

export async function saveCreatorPayDetails(
  ctx: GroupContext,
  details: { gcash: string | null; maya: string | null },
  qr: File | null,
  removeQr: boolean,
) {
  const creator = requirePaymentOwner(ctx);
  let path = removeQr ? null : creator.pay_qr_path;
  if (qr?.size) {
    path = await uploadImage("payqr", `${ctx.group.id}/${newToken()}.jpg`, qr, 524_288);
  }
  try {
    must(
      await db()
        .from("participants")
        .update({ ...details, pay_qr_path: path })
        .eq("group_id", ctx.group.id)
        .eq("id", creator.id),
      "Save payment details",
    );
  } catch (error) {
    if (path && path !== creator.pay_qr_path) await removeImages("payqr", [path]);
    throw error;
  }
  if (creator.pay_qr_path && creator.pay_qr_path !== path) {
    await removeImages("payqr", [creator.pay_qr_path]);
  }
}

export async function creatorPayDetails(ctx: GroupContext) {
  requireMe(ctx);
  const creator = ctx.participants.find((p) => p.id === ctx.creatorId);
  const path = creator?.pay_qr_path;
  return {
    gcash: creator?.gcash ?? null,
    maya: creator?.maya ?? null,
    qrUrl: path ? await signedUrl("payqr", path) : null,
    qrDownloadUrl: path ? await signedUrl("payqr", path, 600, "payment-qr.jpg") : null,
  };
}

export async function groupBills(ctx: GroupContext): Promise<BillRow[]> {
  return must(
    await db()
      .from("bills")
      .select("*")
      .eq("group_id", ctx.group.id)
      .order("created_at", { ascending: false }),
    "Load group bills",
  ) as BillRow[];
}

export async function createItemList(
  ctx: GroupContext,
  title: string,
  items: { name: string; total: number; shareCount: number }[],
) {
  const creator = requirePaymentOwner(ctx);
  requireMe(ctx);
  requireUnlocked(ctx);
  const token = newToken();
  must(
    await db().rpc("create_item_list", {
      p_group: ctx.group.id,
      p_creator: creator.id,
      p_token: token,
      p_title: title,
      p_items: items,
    }),
    "Create item list",
  );
  return token;
}

/** Selection needs access and one item, not the full bill/payment computation. */
export async function loadItemSelectionContext(token: string, itemId: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token))
    throw new AccessError("This bill link isn't valid anymore.");
  const bill = must(
    await db()
      .from("bills")
      .select("id, group_id, token, status")
      .eq("token", token)
      .maybeSingle<Pick<BillRow, "id" | "group_id" | "token" | "status">>(),
    "Load selection list",
  );
  if (!bill) throw new AccessError("This bill link isn't valid anymore.");
  const [ctx, itemResult] = await Promise.all([
    loadGroupContextById(bill.group_id),
    db()
      .from("bill_items")
      .select("name")
      .eq("bill_id", bill.id)
      .eq("id", itemId)
      .maybeSingle<{ name: string }>(),
  ]);
  requireMe(ctx);
  requireUnlocked(ctx);
  if (bill.status !== "claiming")
    throw new AccessError("This bill is closed. Ask the organizer to change it.");
  const item = must(itemResult, "Load selection item");
  if (!item) throw new AccessError("That item isn't on this bill.");
  return { ctx, bill, item };
}

export async function selectItemSpot(
  ctx: GroupContext,
  billId: string,
  itemId: string,
  qty: number,
) {
  const me = requireMe(ctx);
  requireUnlocked(ctx);
  if (!Number.isInteger(qty) || qty < 0 || qty > 99)
    throw new AccessError("Choose a valid selection.");
  const { error } = await db().rpc("select_item_spot", {
    p_group: ctx.group.id,
    p_bill: billId,
    p_item: itemId,
    p_person: me.id,
    p_qty: qty,
  });
  if (error) {
    if (error.code === "P0001") throw new AccessError(error.message);
    throw new Error(`Save selection: ${error.message}`);
  }
}

export async function finalizeBillSnapshot(
  ctx: GroupContext,
  bill: BillRow,
  total: number,
  shares: { participantId: string; amount: number }[],
) {
  const me = requireMe(ctx);
  if (!ctx.isOrganizer && bill.created_by !== me.id)
    throw new AccessError("Only the creator can finalize this list.");
  const { error } = await db().rpc("finalize_item_list", {
    p_group: ctx.group.id,
    p_bill: bill.id,
    p_version: bill.selection_version,
    p_actor: me.id,
    p_total: total,
    p_shares: shares,
  });
  if (error) {
    if (error.code === "P0001") throw new AccessError(error.message);
    throw new Error(`Finalize list: ${error.message}`);
  }
}

export async function saveBillItem(
  ctx: GroupContext,
  bill: BillRow,
  itemId: string | null,
  row: { name: string; qty: number; total: number; share_count: number | null; position: number },
) {
  const me = requireMe(ctx);
  if (!ctx.isOrganizer && bill.created_by !== me.id)
    throw new AccessError("Only the creator can edit this list.");
  const result = itemId
    ? await db().from("bill_items").update(row).eq("id", itemId).eq("bill_id", bill.id)
    : await db()
        .from("bill_items")
        .insert({ ...row, bill_id: bill.id });
  if (result.error?.code === "P0001") throw new AccessError(result.error.message);
  must(result, "Save item");
}

export async function requireBillPayment(
  ctx: GroupContext,
  billId: string | null,
  toId: string,
  fromId: string,
  mustBeDone: boolean,
) {
  requireMe(ctx);
  if (!ctx.participants.some((p) => p.id === fromId && p.status === "active")) {
    throw new AccessError("Pick an active member of this group.");
  }
  if (!billId) return;
  const bill = must(
    await db()
      .from("bills")
      .select("id, payer_id, status")
      .eq("id", billId)
      .eq("group_id", ctx.group.id)
      .single<Pick<BillRow, "id" | "payer_id" | "status">>(),
    "Load bill",
  );
  if (bill.payer_id !== toId) throw new AccessError("Bill payments go to whoever paid the bill.");
  if (mustBeDone && bill.status === "claiming") {
    const member = must(
      await db()
        .from("bill_members")
        .select("done_at")
        .eq("bill_id", billId)
        .eq("participant_id", fromId)
        .maybeSingle<{ done_at: string | null }>(),
      "Load selection status",
    );
    if (!member?.done_at)
      throw new AccessError("Finish selecting your items and continue to payment first.");
  }
}

export async function saveSentPayment(
  ctx: GroupContext,
  input: {
    bill_id: string | null;
    to_id: string;
    amount: number;
    method: PaymentRow["method"];
    reference: string | null;
    note: string | null;
  },
  proof: File | null,
) {
  const me = requireMe(ctx);
  await requireBillPayment(ctx, input.bill_id, input.to_id, me.id, true);
  const proofPath = proof?.size
    ? await uploadImage("proofs", `${ctx.group.id}/${newToken()}.jpg`, proof, 524_288)
    : null;
  try {
    return must(
      await db()
        .from("payments")
        .insert({ ...input, group_id: ctx.group.id, from_id: me.id, proof_path: proofPath })
        .select("id")
        .single<{ id: string }>(),
      "Record payment",
    );
  } catch (error) {
    if (proofPath) await removeImages("proofs", [proofPath]);
    throw error;
  }
}

/** For pages: 404 when the link is wrong or was replaced. */
export async function requireGroupContext(token: string): Promise<GroupContext> {
  const ctx = await loadGroupContext(token);
  if (!ctx) notFound();
  return ctx;
}

/** For actions: the viewer must have picked their name on this device. */
export function requireMe(ctx: GroupContext): ParticipantRow {
  if (!ctx.me) throw new AccessError("Pick your name first.");
  if (ctx.me.status === "pending")
    throw new AccessError("The organizer hasn't approved your name yet.");
  return ctx.me;
}

export function requireOrganizer(ctx: GroupContext): void {
  if (!ctx.isOrganizer) throw new AccessError("Only the organizer can do that.");
}

export function requireUnlocked(ctx: GroupContext): void {
  if (ctx.group.locked) throw new AccessError("This Group is locked by the organizer.");
}

export function activeParticipants(ctx: GroupContext): ParticipantRow[] {
  return ctx.participants.filter((p) => p.status === "active");
}

/** Records who did what; every change is visible in the activity log. */
export async function logActivity(
  ctx: GroupContext,
  action: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await db()
    .from("activity")
    .insert({ group_id: ctx.group.id, actor_id: ctx.me?.id ?? null, action, detail });
  await db().rpc("touch_group", { p_group: ctx.group.id });
}
