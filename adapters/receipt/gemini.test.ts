import { afterEach, describe, expect, it, vi } from "vitest";
import { checkTotal } from "@/core/receipt";
import waltermart from "./fixtures/waltermart.json";
import { geminiReader } from "./gemini";

vi.mock("server-only", () => ({}));
vi.mock("@/server/env", () => ({
  env: {
    geminiKey: () => "test-key",
    geminiModel: () => "test-model",
  },
}));

const image = { bytes: new Uint8Array([1]), mimeType: "image/jpeg" };
const item = (name: string, printed_total: string | null, part = 1, qty = 1) => ({
  name,
  printed_total,
  part,
  qty,
  confidence: 0.9,
});

function respondWith(items: ReturnType<typeof item>[], summary = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ items, ...summary }) }] } }],
        }),
        { status: 200 },
      ),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Gemini receipt reading", () => {
  it("replays the live Waltermart scan with 19 overlapping rows and a zero-price card", async () => {
    // Recorded from the user's two photos via the real reader, not a manual transcription.
    const { items, ...summary } = waltermart;
    respondWith(items, summary);

    const receipt = await geminiReader.read([image, image]);

    expect(receipt.lines).toHaveLength(23);
    expect(receipt.lines.filter(({ merged }) => merged)).toHaveLength(19);
    expect(receipt.lines.every(({ total }) => total > 0)).toBe(true);
    expect(receipt.lines.some(({ name }) => name.includes("AC PLUS CRD"))).toBe(false);
    expect(receipt.lines.map(({ total }) => total)).toEqual([
      12300, 9200, 18250, 7250, 9800, 2500, 3500, 4100, 7000, 9200, 26200, 6800, 8700, 7600, 7500,
      2700, 8900, 17000, 11400, 11450, 6425, 5000, 6000,
    ]);
    expect(receipt.lines.map(({ qty }) => qty)).toEqual([
      1, 1, 1, 1, 2, 1, 1, 2, 4, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2,
    ]);
    expect(receipt.total).toBe(208775);
    expect(checkTotal(receipt, 2)).toMatchObject({ itemsTotal: 208775, gap: 0, ok: true });
  });

  it("uses printed row totals and excludes zero-price rows without shifting paid prices", async () => {
    respondWith([
      item("Complimentary rice", "0.00"),
      item("Sisig", "180.00"),
      item("Free soup", "0"),
      item("Iced tea", "50.00"),
    ]);

    const receipt = await geminiReader.read([image]);

    expect(receipt.lines.map(({ name, total }) => [name, total])).toEqual([
      ["Sisig", 18000],
      ["Iced tea", 5000],
    ]);
  });

  it.each([10, 15, 25])(
    "merges %i overlapping rows while preserving repeated purchases",
    async (overlap) => {
      const names = [
        "Sisig",
        "Rice",
        ...Array.from({ length: overlap - 1 }, (_, index) => `Dish ${index + 1}`),
      ];
      respondWith([
        ...names.map((name) => item(name, "100.00", 1)),
        ...names.slice(1).map((name) => item(name, "100.00", 2)),
        item("Rice", "100.00", 2),
        item("Rice", "100.00", 2),
      ]);

      const receipt = await geminiReader.read([image, image]);

      expect(receipt.lines.map(({ name }) => name)).toEqual([...names, "Rice", "Rice"]);
      expect(receipt.lines.slice(1, overlap + 1).every(({ merged }) => merged)).toBe(true);
      expect(receipt.lines.slice(-2).map(({ part }) => part)).toEqual([1, 1]);
    },
  );

  it("uses zero-price rows to distinguish overlap from an additional identical purchase", async () => {
    respondWith([
      item("Rice", "30.00", 1),
      item("Free soup", "0.00", 1),
      item("Free soup", "0.00", 2),
      item("Rice", "30.00", 2),
      item("Tea", "50.00", 2),
    ]);

    const receipt = await geminiReader.read([image, image]);

    expect(receipt.lines.map(({ name, part }) => [name, part])).toEqual([
      ["Rice", 0],
      ["Rice", 1],
      ["Tea", 1],
    ]);
  });

  it("omits unreadable or invalid totals and unknown photo numbers", async () => {
    respondWith([
      item("Cut off item", null),
      item("Unreadable price", "unknown"),
      item("Negative row", "-30.00"),
      item("Wrong photo", "30.00", 2),
      item("  ", "30.00"),
      item("Noodles", "1,234.50", 1, 2),
    ]);

    const receipt = await geminiReader.read([image]);

    expect(receipt.lines).toEqual([
      { name: "Noodles", total: 123450, qty: 2, part: 0, confidence: 0.9 },
    ]);
  });

  it("preserves receipt summary amounts when merging photos", async () => {
    respondWith([item("Rice", "30.00", 1), item("Rice", "30.00", 2), item("Tea", "50.00", 2)], {
      merchant: "Parity Cafe",
      date: "2026-10-21",
      service_charge: 8,
      delivery_fee: 20,
      discount: 5,
      total: 103,
    });

    const receipt = await geminiReader.read([image, image]);

    expect(receipt).toMatchObject({
      merchant: "Parity Cafe",
      date: "2026-10-21",
      serviceCharge: 800,
      deliveryFee: 2000,
      discount: 500,
      total: 10300,
      source: "gemini",
    });
    expect(receipt.lines.map(({ total }) => total)).toEqual([3000, 5000]);
  });
});
