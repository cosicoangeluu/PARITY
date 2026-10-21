import { describe, expect, it } from "vitest";
import { combineParsed, mergeParts, parseReceiptText, type ReceiptLine } from "./receipt";

const line = (name: string, part: number, total = 10000, qty = 1): ReceiptLine => ({
  name,
  part,
  total,
  qty,
  confidence: 0.9,
});

describe("receipt photo overlaps", () => {
  it.each([5, 10, 15, 25, 50, 100])("merges %i overlapping rows", (overlap) => {
    const names = Array.from({ length: overlap + 2 }, (_, index) => `Item ${index + 1}`);
    const merged = mergeParts([
      names.slice(0, overlap + 1).map((name) => line(name, 0)),
      names.slice(1).map((name) => line(name, 1)),
    ]);

    expect(merged.map((item) => item.name)).toEqual(names);
    expect(merged.slice(1, overlap + 1).every((item) => item.merged)).toBe(true);
    expect(merged[overlap + 1].part).toBe(1);
  });

  it("keeps the overlap context through empty and fully overlapping photos", () => {
    const merged = mergeParts([
      [line("Sisig", 0), line("Rice", 0), line("Tea", 0)],
      [],
      [line("Tea", 2)],
      [line("Rice", 3), line("Tea", 3), line("Cake", 3)],
    ]);

    expect(merged.map((item) => item.name)).toEqual(["Sisig", "Rice", "Tea", "Cake"]);
    expect(merged.slice(1, 3).every((item) => item.merged)).toBe(true);
  });

  it("keeps repeated purchases within a photo and beyond the overlapping rows", () => {
    const merged = mergeParts([
      [line("Rice", 0), line("Rice", 0), line("Tea", 0)],
      [line("Tea", 1), line("Rice", 1)],
    ]);

    expect(merged.map((item) => item.name)).toEqual(["Rice", "Rice", "Tea", "Rice"]);
  });

  it("does not merge the same name with a different price or quantity", () => {
    expect(mergeParts([[line("Rice", 0)], [line("Rice", 1, 20000)]])).toHaveLength(2);
    expect(mergeParts([[line("Rice", 0)], [line("Rice", 1, 10000, 2)]])).toHaveLength(2);
  });
});

describe("zero-price receipt rows", () => {
  it("skips zero-price rows without moving the next paid item's price", () => {
    const parsed = parseReceiptText(
      "Complimentary rice 0.00\nSisig 180.00\nFree soup 0.00\nIced tea 50.00\nTOTAL 230.00",
    );

    expect(parsed.lines.map(({ name, total }) => [name, total])).toEqual([
      ["Sisig", 18000],
      ["Iced tea", 5000],
    ]);
    expect(parsed.total).toBe(23000);
  });

  it("merges overlapping photos with zero-price rows between paid items", () => {
    const receipt = combineParsed(
      [
        parseReceiptText("Sisig 180.00\nFree soup 0.00\nRice 30.00", 0),
        parseReceiptText("Free soup 0.00\nRice 30.00\nIced tea 50.00\nTOTAL 260.00", 1),
      ],
      "ocr",
    );

    expect(receipt.lines.map(({ name, total }) => [name, total])).toEqual([
      ["Sisig", 18000],
      ["Rice", 3000],
      ["Iced tea", 5000],
    ]);
  });
});
