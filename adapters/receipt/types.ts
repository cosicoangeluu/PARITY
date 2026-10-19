import type { ParsedReceipt } from "@/core/receipt";

export type { ParsedReceipt };

export interface ReceiptImage {
  bytes: Uint8Array;
  mimeType: string;
}

/** Every receipt reader has this shape, so readers can be swapped without touching the app. */
export interface ReceiptReader {
  name: string;
  available(): boolean;
  /** All parts of one receipt, top to bottom. Throws QuotaError when the free quota is used up. */
  read(parts: ReceiptImage[]): Promise<ParsedReceipt>;
}

export class QuotaError extends Error {}
