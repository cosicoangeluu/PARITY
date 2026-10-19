import "server-only";
import { combineParsed, parseReceiptText } from "@/core/receipt";
import { env } from "@/server/env";
import { QuotaError, type ReceiptReader } from "./types";

/** Fallback reader: OCR.space free API (25,000 requests/month, 500/day, 1 MB per image). */
export const ocrSpaceReader: ReceiptReader = {
  name: "ocrspace",
  available: () => !!env.ocrSpaceKey(),
  async read(parts) {
    const parsedParts = [];
    for (const [index, part] of parts.entries()) {
      const form = new FormData();
      form.set("apikey", env.ocrSpaceKey() ?? "");
      form.set("OCREngine", "2");
      form.set("isTable", "true");
      form.set("scale", "true");
      form.set("language", "eng");
      form.set(
        "file",
        new Blob([Buffer.from(part.bytes)], { type: part.mimeType }),
        `part-${index + 1}.jpg`,
      );
      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 403 || response.status === 429)
        throw new QuotaError("OCR.space limit reached");
      if (!response.ok) throw new Error(`OCR.space error ${response.status}`);
      const body = (await response.json()) as {
        IsErroredOnProcessing?: boolean;
        ErrorMessage?: string[] | string;
        ParsedResults?: { ParsedText?: string }[];
      };
      if (body.IsErroredOnProcessing) {
        const message = [body.ErrorMessage].flat().join(" ");
        if (/limit|quota|maximum/i.test(message)) throw new QuotaError(message);
        throw new Error(`OCR.space: ${message}`);
      }
      const text = body.ParsedResults?.map((r) => r.ParsedText ?? "").join("\n") ?? "";
      parsedParts.push(parseReceiptText(text, index, "ocrspace"));
    }
    return combineParsed(parsedParts, "ocrspace");
  },
};
