import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("./storage", () => ({
  uploadImage: mocks.upload,
  removeImages: mocks.remove,
  signedUrl: vi.fn(),
}));
vi.mock("./db", () => ({
  db: () => ({ from: mocks.from, rpc: mocks.rpc }),
  must: (result: { data: unknown; error: { message: string } | null }) => {
    if (result.error) throw new Error(result.error.message);
    return result.data;
  },
}));

import {
  createItemList,
  type GroupContext,
  requireBillPayment,
  saveCreatorPayDetails,
  saveSentPayment,
  selectItemSpot,
} from "./access";
import type { ParticipantRow } from "./types";

const creator: ParticipantRow = {
  id: "creator",
  group_id: "group",
  name: "Ana",
  status: "active",
  device_id: "creator-device",
  default_share: 1,
  gcash: null,
  maya: null,
  pay_qr_path: "group/old.jpg",
  first_seen_at: null,
  created_at: "",
};
const member = {
  ...creator,
  id: "member",
  name: "Ben",
  device_id: "member-device",
  pay_qr_path: null,
};
const ctx: GroupContext = {
  group: {
    id: "group",
    token: "group-token",
    name: "Lunch",
    currency: "PHP",
    kind: "group",
    organizer_key_hash: "",
    locked: false,
    created_at: "",
    last_activity_at: "",
  },
  participants: [creator, member],
  me: member,
  creatorId: creator.id,
  isOrganizer: false,
  deviceId: member.device_id,
};

function query(data: unknown, error: { message: string } | null = null) {
  const result = { data, error };
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are deliberately thenable.
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [builder.select, builder.eq, builder.update, builder.insert])
    method.mockReturnValue(builder);
  return builder;
}

beforeEach(() => vi.resetAllMocks());

describe("guided bill payment access", () => {
  it("does not let an invited member create the creator's list", async () => {
    await expect(
      createItemList(ctx, "Dinner", [{ name: "Steak", total: 20000, shareCount: 2 }]),
    ).rejects.toThrow("Only the organizer");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses the current member's identity for atomic selection and reports a full item", async () => {
    mocks.rpc.mockResolvedValue({
      error: { code: "P0001", message: "This item is full. All spots have been selected." },
    });
    await expect(selectItemSpot(ctx, "bill", "item", 1)).rejects.toThrow("This item is full");
    expect(mocks.rpc).toHaveBeenCalledWith("select_item_spot", {
      p_group: "group",
      p_bill: "bill",
      p_item: "item",
      p_person: "member",
      p_qty: 1,
    });
  });
  it("accepts payment on an unfinalized bill once the member is done", async () => {
    const bill = query({ id: "bill", payer_id: "creator", status: "claiming" });
    mocks.from.mockReturnValueOnce(bill).mockReturnValueOnce(query({ done_at: "2026-10-26" }));
    await expect(
      requireBillPayment(ctx, "bill", "creator", "member", true),
    ).resolves.toBeUndefined();
    expect(bill.eq).toHaveBeenCalledWith("group_id", "group");
  });
  it("rejects a direct payment action before selection is complete", async () => {
    mocks.from
      .mockReturnValueOnce(query({ id: "bill", payer_id: "creator", status: "claiming" }))
      .mockReturnValueOnce(query({ done_at: null }));
    await expect(requireBillPayment(ctx, "bill", "creator", "member", true)).rejects.toThrow(
      "Finish selecting",
    );
  });
  it("cannot redirect a bill payment to another member", async () => {
    mocks.from.mockReturnValueOnce(query({ id: "bill", payer_id: "creator", status: "claiming" }));
    await expect(requireBillPayment(ctx, "bill", "member", "member", true)).rejects.toThrow(
      "whoever paid",
    );
  });
  it("rejects member attempts to replace the creator's numbers or QR", async () => {
    await expect(
      saveCreatorPayDetails(ctx, { gcash: "09171234567", maya: null }, null, true),
    ).rejects.toThrow("Only the organizer");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("updates the original creator's receiving details after organizer recovery", async () => {
    const update = query(null);
    mocks.from.mockReturnValue(update);
    await saveCreatorPayDetails(
      { ...ctx, isOrganizer: true },
      { gcash: "09171234567", maya: null },
      null,
      false,
    );
    expect(update.eq).toHaveBeenCalledWith("id", creator.id);
    expect(update.update).toHaveBeenCalledWith({
      gcash: "09171234567",
      maya: null,
      pay_qr_path: creator.pay_qr_path,
    });
  });
  it("keeps the old QR when saving a replacement fails", async () => {
    mocks.upload.mockResolvedValue("group/new.jpg");
    mocks.from.mockReturnValue(query(null, { message: "Save failed" }));
    const qr = new File(["image"], "qr.png", { type: "image/png" });
    await expect(
      saveCreatorPayDetails({ ...ctx, isOrganizer: true }, { gcash: null, maya: null }, qr, false),
    ).rejects.toThrow("Save failed");
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith("payqr", ["group/new.jpg"]);
  });
  it("does not record a payment when uploading its proof fails", async () => {
    mocks.upload.mockRejectedValue(new Error("Upload failed"));
    const proof = new File(["proof"], "proof.jpg", { type: "image/jpeg" });
    await expect(
      saveSentPayment(
        ctx,
        {
          bill_id: null,
          to_id: "creator",
          amount: 10000,
          method: "gcash",
          reference: "1234",
          note: null,
        },
        proof,
      ),
    ).rejects.toThrow("Upload failed");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
