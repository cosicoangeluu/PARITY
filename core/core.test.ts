import { describe, expect, it } from "vitest";
import { computeBill } from "./bill";
import { formatMoney, parseAmount, toDecimalString } from "./money";
import { checkTotal, mergeParts, parseReceiptText, type ReceiptLine } from "./receipt";
import { computeBalances, settleUp } from "./settle";
import { allocate, SplitError, split } from "./split";

const total = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe("money", () => {
  it("parses peso amounts into centavos", () => {
    expect(parseAmount("₱1,234.50")).toBe(123450);
    expect(parseAmount("12.5")).toBe(1250);
    expect(parseAmount("7")).toBe(700);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
  });
  it("formats centavos", () => {
    expect(formatMoney(128650)).toBe("₱1,286.50");
    expect(toDecimalString(5)).toBe("0.05");
    expect(toDecimalString(-12345)).toBe("-123.45");
  });
});

describe("split", () => {
  it("always adds up to the total, leftover to the payer", () => {
    const result = split(1000, "equal", [{ id: "a" }, { id: "b" }, { id: "c" }], "a");
    expect(result).toEqual({ a: 334, b: 333, c: 333 });
  });
  it("leftover goes to largest fractions when there is no payer in the split", () => {
    const result = allocate(100, [
      { id: "a", weight: 1 },
      { id: "b", weight: 1 },
      { id: "c", weight: 1 },
    ]);
    expect(total(result)).toBe(100);
  });
  it("splits by shares with decimals (Santos family = 2.5)", () => {
    const result = split(700000, "shares", [
      { id: "santos", weight: 2.5 },
      { id: "ben", weight: 1 },
    ]);
    expect(result).toEqual({ santos: 500000, ben: 200000 });
  });
  it("rejects percentages that don't add to 100", () => {
    expect(() =>
      split(1000, "percent", [
        { id: "a", weight: 60 },
        { id: "b", weight: 30 },
      ]),
    ).toThrow(SplitError);
  });
  it("checks fixed amounts against the total", () => {
    expect(
      split(5300, "fixed", [
        { id: "a", amount: 1000 },
        { id: "b", amount: 4300 },
      ]),
    ).toEqual({ a: 1000, b: 4300 });
    expect(() => split(5300, "fixed", [{ id: "a", amount: 1000 }])).toThrow(SplitError);
  });
});

describe("settle", () => {
  it("collapses chains into the fewest transfers (Naomi example)", () => {
    // Naomi owes Jamal 10 and Ella 10; Jamal owes Ella 10.
    const balances = computeBalances(
      [
        { kind: "expense", payerId: "jamal", amount: 1000, splits: { naomi: 1000 } },
        { kind: "expense", payerId: "ella", amount: 1000, splits: { naomi: 1000 } },
        { kind: "expense", payerId: "ella", amount: 1000, splits: { jamal: 1000 } },
      ],
      ["naomi", "jamal", "ella"],
    );
    expect(settleUp(balances)).toEqual([{ from: "naomi", to: "ella", amount: 2000 }]);
  });
  it("handles transfers and income, balances sum to zero", () => {
    const balances = computeBalances(
      [
        {
          kind: "expense",
          payerId: "ana",
          amount: 450000,
          splits: { ana: 150000, ben: 150000, carlo: 150000 },
        },
        { kind: "transfer", payerId: "ben", recipientId: "ana", amount: 50000 },
        {
          kind: "income",
          payerId: "carlo",
          amount: 30000,
          splits: { ana: 10000, ben: 10000, carlo: 10000 },
        },
      ],
      ["ana", "ben", "carlo"],
    );
    expect(total(balances)).toBe(0);
    const transfers = settleUp(balances);
    const after = { ...balances };
    for (const t of transfers) {
      after[t.from] += t.amount;
      after[t.to] -= t.amount;
    }
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });
});

describe("bill", () => {
  const items = [
    { id: "sisig", name: "Sisig platter", qty: 1, total: 38000 },
    { id: "rice", name: "Rice", qty: 3, total: 9000 },
    { id: "tea", name: "Iced tea", qty: 1, total: 16000 },
  ];
  it("splits shared items, units and service charge proportionally", () => {
    const result = computeBill(
      items,
      [
        { itemId: "sisig", participantId: "ana", qty: 1 },
        { itemId: "sisig", participantId: "ben", qty: 1 },
        { itemId: "rice", participantId: "ana", qty: 2 },
        { itemId: "rice", participantId: "ben", qty: 1 },
      ],
      ["ana", "ben"],
      [{ label: "Service charge", amount: 4700 }],
    );
    expect(result.perPerson.ana.itemsSubtotal).toBe(19000 + 6000);
    expect(result.perPerson.ben.itemsSubtotal).toBe(19000 + 3000);
    expect(result.unclaimed).toEqual([{ itemId: "tea", qtyLeft: 1, amount: 16000 }]);
    expect(result.perPerson.ana.adjustments + result.perPerson.ben.adjustments).toBe(4700);
  });
  it("flags over-claimed quantities and applies personal discounts", () => {
    const result = computeBill(
      items,
      [
        { itemId: "rice", participantId: "ana", qty: 2 },
        { itemId: "rice", participantId: "ben", qty: 2 },
      ],
      ["ana", "ben"],
      [],
      [{ participantId: "ana", label: "Senior", amount: 1000 }],
    );
    expect(result.overclaimed).toEqual(["rice"]);
    expect(result.perPerson.ana.total).toBe(4500 - 1000);
  });
});

describe("receipt", () => {
  it("reads items and totals from OCR text", () => {
    const parsed = parseReceiptText(
      [
        "MANG INASAL SM CITY",
        "10/19/2026 7:42PM",
        "2 Pecho Large      398.00",
        "Halo-halo          129.00",
        "Sub Total          527.00",
        "Service Charge      52.70",
        "TOTAL              579.70",
        "CASH              1000.00",
        "CHANGE             420.30",
      ].join("\n"),
    );
    expect(parsed.merchant).toBe("MANG INASAL SM CITY");
    expect(parsed.lines.map((l) => [l.name, l.qty, l.total])).toEqual([
      ["Pecho Large", 2, 39800],
      ["Halo-halo", 1, 12900],
    ]);
    expect(parsed.serviceCharge).toBe(5270);
    expect(parsed.total).toBe(57970);
    expect(checkTotal(parsed).ok).toBe(true);
  });
  it("merges lines read twice in the overlap between parts", () => {
    const line = (name: string, total: number, part: number): ReceiptLine => ({
      name,
      qty: 1,
      total,
      part,
      confidence: 0.9,
    });
    const merged = mergeParts([
      [line("Sisig", 38000, 0), line("Rice", 3000, 0)],
      [line("Rice", 3000, 1), line("Tea", 16000, 1)],
    ]);
    expect(merged.map((l) => l.name)).toEqual(["Sisig", "Rice", "Tea"]);
    expect(merged[1].merged).toBe(true);
  });
  it("points to a part when the total does not match", () => {
    const check = checkTotal(
      {
        lines: [
          { name: "A", qty: 1, total: 1000, part: 0, confidence: 0.9 },
          { name: "B", qty: 1, total: 1000, part: 0, confidence: 0.9 },
        ],
        total: 3000,
      },
      2,
    );
    expect(check.ok).toBe(false);
    expect(check.gap).toBe(1000);
    expect(check.suspectPart).toBe(1);
  });
});
