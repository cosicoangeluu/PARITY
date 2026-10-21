import { type Centavos, parseAmount } from "./money";

/** One item line read from a receipt photo. */
export interface ReceiptLine {
  name: string;
  qty: number;
  total: Centavos;
  /** Which photo part (0-based) the line came from. */
  part: number;
  /** 0–1. Lines under 0.7 are highlighted for the scanner to check. */
  confidence: number;
  /** Set when the line was found twice in overlapping parts and merged. */
  merged?: boolean;
}

export interface ParsedReceipt {
  merchant?: string;
  date?: string;
  lines: ReceiptLine[];
  serviceCharge?: Centavos;
  discount?: Centavos;
  deliveryFee?: Centavos;
  total?: Centavos;
  /** Which reader produced this: "gemini", "ocrspace" or "tesseract". */
  source: string;
}

const SUMMARY = {
  total: /\b(grand\s*total|total\s*(amount|due|sales)?|amount\s*due|net\s*total)\b/i,
  subtotal: /\bsub\s*-?\s*total\b/i,
  service: /\bservice\s*(charge|chg|fee)?\b|\bsvc\b/i,
  delivery: /\bdelivery\b/i,
  discount: /\b(discount|disc|less|promo)\b/i,
  ignore:
    /\b(cash|change|tendered|vat(able)?|vat\s*exempt|zero\s*rated|tin\b|ord(er)?\s*#|table|cashier|server|thank|invoice|receipt|card|gcash|maya|balance|items?\s*sold|qty\s*total)\b/i,
};

const PRICE_AT_END =
  /^(.*?)[\s.:]*(?:P|₱|PHP)?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2})\s*[A-Z*]{0,2}$/;
const QTY_PREFIX = /^(\d{1,2})\s*(?:x|X|@|pcs?|\s)\s*(.+)$/;
const QTY_SUFFIX = /^(.+?)\s+[xX]\s*(\d{1,2})$/;

/**
 * Turns raw OCR text (OCR.space or Tesseract) into item lines and totals.
 * Gemini returns structured JSON directly and does not need this.
 */
export function parseReceiptText(text: string, part = 0, source = "ocr"): ParsedReceipt {
  const result: ParsedReceipt = { lines: [], source };
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const row of rows) {
    const priceMatch = PRICE_AT_END.exec(row);
    if (!priceMatch) {
      if (!result.merchant && /[a-z]{3,}/i.test(row) && !SUMMARY.ignore.test(row)) {
        result.merchant = row.slice(0, 60);
      }
      const date = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/.exec(row);
      if (date && !result.date) result.date = date[1];
      continue;
    }
    const label = priceMatch[1].trim();
    const amount = parseAmount(priceMatch[2]);
    if (amount === null || !label) continue;

    if (SUMMARY.subtotal.test(label)) continue;
    if (SUMMARY.total.test(label)) {
      result.total = Math.abs(amount);
      continue;
    }
    if (SUMMARY.service.test(label)) {
      result.serviceCharge = (result.serviceCharge ?? 0) + Math.abs(amount);
      continue;
    }
    if (SUMMARY.delivery.test(label)) {
      result.deliveryFee = (result.deliveryFee ?? 0) + Math.abs(amount);
      continue;
    }
    if (SUMMARY.discount.test(label)) {
      result.discount = (result.discount ?? 0) + Math.abs(amount);
      continue;
    }
    if (SUMMARY.ignore.test(label)) continue;

    let name = label;
    let qty = 1;
    const prefix = QTY_PREFIX.exec(label);
    const suffix = QTY_SUFFIX.exec(label);
    if (prefix) {
      qty = Number(prefix[1]);
      name = prefix[2];
    } else if (suffix) {
      name = suffix[1];
      qty = Number(suffix[2]);
    }
    name = name.replace(/\s+\d+(\.\d{2})?$/, "").trim(); // drop a trailing unit price
    if (!name || amount <= 0) continue;

    const looksClean = /^[\p{L}\d][\p{L}\d\s'&().,/-]*$/u.test(name) && name.length >= 3;
    result.lines.push({
      name,
      qty: Math.max(qty, 1),
      total: amount,
      part,
      confidence: looksClean ? 0.8 : 0.5,
    });
  }
  return result;
}

function sameLine(a: ReceiptLine, b: ReceiptLine): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return a.total === b.total && a.qty === b.qty && norm(a.name) === norm(b.name);
}

/**
 * Joins the parts of a long receipt. Lines read twice in the overlap between two
 * photos (the same name and price at the end of one part and the start of the next)
 * are kept once and marked `merged` so the scanner can see what was joined.
 * Checks the full overlap; there is no fixed limit on the number of matching rows.
 */
export function mergeParts(parts: readonly ReceiptLine[][]): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  for (const part of parts) {
    let overlap = 0;
    const max = Math.min(out.length, part.length);
    for (let k = max; k > 0; k--) {
      const tail = out.slice(out.length - k);
      const head = part.slice(0, k);
      if (tail.every((line, i) => sameLine(line, head[i]))) {
        overlap = k;
        break;
      }
    }
    for (let i = out.length - overlap; i < out.length; i++) out[i] = { ...out[i], merged: true };
    out.push(...part.slice(overlap));
  }
  return out;
}

/** Merges the summary fields of several parsed parts; totals usually come from the last part. */
export function combineParsed(parts: readonly ParsedReceipt[], source: string): ParsedReceipt {
  const lastWith = <K extends keyof ParsedReceipt>(key: K) =>
    [...parts].reverse().find((p) => p[key] !== undefined)?.[key];
  return {
    merchant: parts.find((p) => p.merchant)?.merchant,
    date: parts.find((p) => p.date)?.date,
    lines: mergeParts(parts.map((p) => p.lines)),
    serviceCharge: lastWith("serviceCharge") as Centavos | undefined,
    discount: lastWith("discount") as Centavos | undefined,
    deliveryFee: lastWith("deliveryFee") as Centavos | undefined,
    total: lastWith("total") as Centavos | undefined,
    source,
  };
}

export interface TotalCheck {
  itemsTotal: Centavos;
  expectedTotal: Centavos | undefined;
  gap: Centavos;
  ok: boolean;
  /** Part most likely missing a line, when the totals do not match. */
  suspectPart?: number;
}

/** Checks the item lines plus charges against the printed total. */
export function checkTotal(
  receipt: Pick<ParsedReceipt, "lines" | "serviceCharge" | "discount" | "deliveryFee" | "total">,
  partCount = 1,
): TotalCheck {
  const itemsTotal = receipt.lines.reduce((s, l) => s + l.total, 0);
  const computed =
    itemsTotal +
    (receipt.serviceCharge ?? 0) +
    (receipt.deliveryFee ?? 0) -
    (receipt.discount ?? 0);
  if (receipt.total === undefined)
    return { itemsTotal, expectedTotal: undefined, gap: 0, ok: true };
  const gap = receipt.total - computed;
  if (gap === 0) return { itemsTotal, expectedTotal: receipt.total, gap, ok: true };

  // The part with the fewest lines per photo, or with low-confidence lines, is the likeliest gap.
  let suspectPart = 0;
  let worst = Number.POSITIVE_INFINITY;
  for (let p = 0; p < partCount; p++) {
    const lines = receipt.lines.filter((l) => l.part === p);
    const score = lines.length - lines.filter((l) => l.confidence < 0.7).length * 2;
    if (score < worst) {
      worst = score;
      suspectPart = p;
    }
  }
  return { itemsTotal, expectedTotal: receipt.total, gap, ok: false, suspectPart };
}
