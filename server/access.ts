import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db, must } from "./db";
import { env } from "./env";
import type { GroupRow, ParticipantRow } from "./types";

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
  const participants = must(
    await db()
      .from("participants")
      .select("*")
      .eq("group_id", group.id)
      .neq("status", "removed")
      .order("created_at"),
    "Load participants",
  ) as ParticipantRow[];

  const store = await cookies();
  const deviceId = store.get(DEVICE_COOKIE)?.value ?? null;
  const orgKey = store.get(`${ORG_COOKIE_PREFIX}${group.id}`)?.value;
  const isOrganizer = !!orgKey && sameHash(hashKey(orgKey), group.organizer_key_hash);
  const me = deviceId ? (participants.find((p) => p.device_id === deviceId) ?? null) : null;
  return { group, participants, me, isOrganizer, deviceId };
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
