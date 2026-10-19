"use client";

import { combineParsed, type ParsedReceipt, parseReceiptText } from "@/core/receipt";

/**
 * Last-resort reader: Tesseract.js runs on the user's own phone. Free and unlimited, but less
 * accurate, so the review step matters more. Loaded only when the server readers fail.
 */
export async function readReceiptInBrowser(
  images: Blob[],
  onProgress?: (fraction: number) => void,
): Promise<ParsedReceipt> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const parts = [];
    for (const [index, image] of images.entries()) {
      const { data } = await worker.recognize(image);
      parts.push(parseReceiptText(data.text, index, "tesseract"));
      onProgress?.((index + 1) / images.length);
    }
    const combined = combineParsed(parts, "tesseract");
    // Tesseract is less reliable: ask the scanner to check every line.
    combined.lines = combined.lines.map((l) => ({ ...l, confidence: Math.min(l.confidence, 0.6) }));
    return combined;
  } finally {
    await worker.terminate();
  }
}
