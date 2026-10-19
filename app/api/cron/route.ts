import { db } from "@/server/db";
import { removeImages } from "@/server/storage";

/**
 * Called once a day by the free GitHub Actions workflow (.github/workflows/keep-alive.yml).
 *  1. Touches the database so the free Supabase project never pauses for inactivity.
 *  2. Deletes payment-proof photos 30 days after confirmation (reference numbers are kept).
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { count, error } = await db().from("groups").select("id", { count: "exact", head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: old } = await db()
    .from("payments")
    .select("id, proof_path")
    .not("proof_path", "is", null)
    .neq("status", "pending")
    .lt("decided_at", cutoff)
    .limit(500);
  const paths = (old ?? []).map((p) => p.proof_path as string);
  await removeImages("proofs", paths);
  if (old?.length) {
    await db()
      .from("payments")
      .update({ proof_path: null })
      .in(
        "id",
        old.map((p) => p.id),
      );
  }

  return Response.json({ ok: true, groups: count, proofsDeleted: paths.length });
}
