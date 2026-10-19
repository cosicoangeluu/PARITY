import "server-only";
import { z } from "zod";
import { env } from "@/server/env";
import { QuotaError, type ReceiptReader } from "./types";

const peso = z.coerce.number().finite();

const GeminiReceipt = z.object({
  merchant: z.string().nullish(),
  date: z.string().nullish(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.coerce.number().int().min(1).max(99).catch(1),
        total: peso,
        part: z.coerce.number().int().min(1).catch(1),
        confidence: z.coerce.number().min(0).max(1).catch(0.8),
      }),
    )
    .default([]),
  service_charge: peso.nullish(),
  delivery_fee: peso.nullish(),
  discount: peso.nullish(),
  total: peso.nullish(),
});

const PROMPT = `You read Philippine restaurant and store receipts.
The images are consecutive parts of ONE receipt, top to bottom, and may overlap: list each item only once.
Return JSON only, with this shape:
{"merchant": string|null, "date": "YYYY-MM-DD"|null,
 "items": [{"name": string, "qty": integer, "total": number, "part": integer, "confidence": number}],
 "service_charge": number|null, "delivery_fee": number|null, "discount": number|null, "total": number|null}
Rules: amounts are in pesos as numbers (e.g. 398.00). "total" on an item is the line total (qty x unit price).
"part" is the 1-based image the line appears in. "confidence" is 0-1 for how sure you are the line was read right.
Do not list subtotal, VAT, VATable sales, cash, change or payment lines as items.
"discount" is a discount for the whole table (not Senior/PWD for one person). Keep item names as printed, including Filipino words.`;

const toCentavos = (pesos: number | null | undefined) =>
  pesos === null || pesos === undefined ? undefined : Math.round(Math.abs(pesos) * 100);

/** Main reader: Gemini Flash-Lite on the free tier turns photos straight into structured items. */
export const geminiReader: ReceiptReader = {
  name: "gemini",
  available: () => !!env.geminiKey(),
  async read(parts) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel()}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey() ?? "" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                ...parts.map((p) => ({
                  inline_data: {
                    mime_type: p.mimeType,
                    data: Buffer.from(p.bytes).toString("base64"),
                  },
                })),
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (response.status === 429) throw new QuotaError("Gemini free quota used up");
    if (!response.ok) throw new Error(`Gemini error ${response.status}`);

    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const parsed = GeminiReceipt.parse(JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim()));

    return {
      merchant: parsed.merchant ?? undefined,
      date: parsed.date ?? undefined,
      lines: parsed.items
        .filter((i) => i.total > 0)
        .map((i) => ({
          name: i.name.trim().slice(0, 80),
          qty: i.qty,
          total: toCentavos(i.total) ?? 0,
          part: Math.min(i.part - 1, parts.length - 1),
          confidence: i.confidence,
        })),
      serviceCharge: toCentavos(parsed.service_charge),
      deliveryFee: toCentavos(parsed.delivery_fee),
      discount: toCentavos(parsed.discount),
      total: toCentavos(parsed.total),
      source: "gemini",
    };
  },
};
