import "server-only";
import { geminiReader } from "./gemini";
import { ocrSpaceReader } from "./ocrspace";
import type { ParsedReceipt, ReceiptImage, ReceiptReader } from "./types";

/** Tried in order. If every server reader fails, the browser falls back to Tesseract.js. */
const READERS: ReceiptReader[] = [geminiReader, ocrSpaceReader];

export type ReadResult =
  | { ok: true; receipt: ParsedReceipt }
  | { ok: false; useBrowserReader: true; reason: string };

export async function readReceipt(parts: ReceiptImage[]): Promise<ReadResult> {
  const reasons: string[] = [];
  for (const reader of READERS) {
    if (!reader.available()) {
      reasons.push(`${reader.name}: no API key`);
      continue;
    }
    try {
      const receipt = await reader.read(parts);
      if (receipt.lines.length > 0) return { ok: true, receipt };
      reasons.push(`${reader.name}: no items found`);
    } catch (error) {
      reasons.push(`${reader.name}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { ok: false, useBrowserReader: true, reason: reasons.join("; ") };
}
