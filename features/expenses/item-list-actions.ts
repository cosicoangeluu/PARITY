"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { parseAmount } from "@/core/money";
import { type ActionResult, run } from "@/lib/result";
import { createItemList, logActivity, requireGroupContext } from "@/server/access";
import { broadcastChange } from "@/server/realtime";

const Item = z.object({
  name: z.string().trim().min(1, "Give each item a name.").max(80),
  total: z.string().transform((value, ctx) => {
    const amount = parseAmount(value);
    if (amount === null || !Number.isSafeInteger(amount) || amount <= 0 || amount > 2147483647) {
      ctx.addIssue({ code: "custom", message: "Enter a valid item price, like 200.00." });
      return z.NEVER;
    }
    return amount;
  }),
  shareCount: z.coerce.number().int().min(1, "At least one person must share each item.").max(99),
});

export async function saveItemList(
  token: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireGroupContext(token);
    const title = z
      .string()
      .trim()
      .min(1, "Give this list a name.")
      .max(80)
      .parse(form.get("listTitle"));
    const names = form.getAll("itemName");
    const totals = form.getAll("itemTotal");
    const counts = form.getAll("shareCount");
    const items = z
      .array(Item)
      .min(1)
      .max(200)
      .parse(names.map((name, i) => ({ name, total: totals[i], shareCount: counts[i] })));
    const billToken = await createItemList(ctx, title, items);
    await logActivity(ctx, "bill.created", { title, items: items.length });
    await broadcastChange(`g:${token}`);
    redirect(`/b/${billToken}?share=1`);
  });
}
