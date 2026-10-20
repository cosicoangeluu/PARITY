import { loadLedger, nameLookup } from "@/features/groups/queries";
import { buildWorkbook } from "@/features/groups/workbook";
import { loadGroupContext } from "@/server/access";

/**
 * Exports every entry, each person's balance and the settle-up list as a
 * styled Excel workbook (opens in Excel, Numbers, Google Sheets).
 */
export async function GET(_request: Request, { params }: RouteContext<"/g/[token]/export">) {
  const { token } = await params;
  const ctx = await loadGroupContext(token);
  if (!ctx) return new Response("Not found", { status: 404 });
  const ledger = await loadLedger(ctx);
  const file = await buildWorkbook(ctx, ledger, nameLookup(ctx));

  const filename = `${ctx.group.name.replace(/[^\w-]+/g, "-").slice(0, 40) || "parity"}.xlsx`;
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
