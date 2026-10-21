"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { readReceiptInBrowser } from "@/adapters/receipt/tesseract";
import { formatMoney, parseAmount, toDecimalString } from "@/core/money";
import { checkTotal, type ParsedReceipt, type ReceiptLine } from "@/core/receipt";
import { compressImage } from "@/lib/image";
import { PrimaryButton } from "@/ui/Actions";
import { Icon } from "@/ui/Icon";
import { createBill, readReceiptAction } from "./actions";
import { CameraSheet } from "./CameraSheet";

const MAX_PARTS = 6;

interface Part {
  id: string;
  blob: Blob;
  url: string;
}

interface Line {
  key: string;
  name: string;
  qty: string;
  total: string;
  part: number;
  confidence: number;
  merged?: boolean;
  sharedByAll: boolean;
}

type Step = "capture" | "reading" | "review";

let counter = 0;
const uid = () => `l${++counter}`;

function toLines(lines: ReceiptLine[], partOffset?: number): Line[] {
  return lines.map((l) => ({
    key: uid(),
    name: l.name,
    qty: String(l.qty),
    total: toDecimalString(l.total),
    part: partOffset ?? l.part,
    confidence: l.confidence,
    merged: l.merged,
    sharedByAll: false,
  }));
}

/**
 * Scan & Split: photos (one or more parts) → read → review → claim link.
 * Readers: Gemini → OCR.space on the server, then Tesseract.js in the browser as a last resort.
 * Order when a line is wrong: retake that part, fix the line, then type it manually.
 */
export function ScanFlow({
  groupToken,
  people,
  meId,
  currency = "PHP",
}: {
  groupToken: string | null;
  people?: { id: string; name: string }[];
  meId?: string;
  currency?: string;
}) {
  const [step, setStep] = useState<Step>("capture");
  const [parts, setParts] = useState<Part[]>([]);
  const [camera, setCamera] = useState<{ replace?: number } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState("");
  // Set after mount: the date must come from the visitor's phone, not the build.
  const [date, setDate] = useState("");
  useEffect(() => setDate((d) => d || new Date().toLocaleDateString("en-CA")), []);
  const [service, setService] = useState("");
  const [delivery, setDelivery] = useState("");
  const [discount, setDiscount] = useState("");
  const [total, setTotal] = useState("");
  const [payerId, setPayerId] = useState(meId ?? "");
  const [payerName, setPayerName] = useState("");
  const [source, setSource] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const gallery = useRef<HTMLInputElement>(null);

  async function addPhoto(photo: Blob, replace?: number) {
    setError(null);
    try {
      const blob = await compressImage(photo);
      const part = { id: uid(), blob, url: URL.createObjectURL(blob) };
      if (replace !== undefined) {
        setParts((list) => list.map((p, i) => (i === replace ? part : p)));
        setCamera(null);
        await rereadPart(replace, blob);
      } else {
        setParts((list) => [...list, part]);
        setCamera(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't use that photo.");
    }
  }

  async function addFromGallery(files: FileList | null) {
    if (!files) return;
    for (const file of [...files].slice(0, MAX_PARTS - parts.length)) await addPhoto(file);
  }

  function move(index: number, by: -1 | 1) {
    setParts((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  }

  function applyReceipt(receipt: ParsedReceipt) {
    setLines(toLines(receipt.lines));
    setSource(receipt.source);
    if (receipt.merchant) {
      setMerchant(receipt.merchant);
      setTitle((t) => t || receipt.merchant || "");
    }
    if (receipt.date && /^\d{4}-\d{2}-\d{2}$/.test(receipt.date)) setDate(receipt.date);
    setService(receipt.serviceCharge ? toDecimalString(receipt.serviceCharge) : "");
    setDelivery(receipt.deliveryFee ? toDecimalString(receipt.deliveryFee) : "");
    setDiscount(receipt.discount ? toDecimalString(receipt.discount) : "");
    setTotal(receipt.total ? toDecimalString(receipt.total) : "");
  }

  async function read(blobs: Blob[]): Promise<ParsedReceipt> {
    const form = new FormData();
    for (const [i, b] of blobs.entries()) form.append("part", b, `part-${i + 1}.jpg`);
    const result = await readReceiptAction(groupToken, form);
    if (!result.ok) throw new Error(result.error);
    if (result.data && "receipt" in result.data) return result.data.receipt;
    setStatus("Reading on your phone. This takes a little longer…");
    return readReceiptInBrowser(blobs, (f) =>
      setStatus(`Reading on your phone… ${Math.round(f * 100)}%`),
    );
  }

  async function readAll() {
    setStep("reading");
    setError(null);
    setStatus("Reading your receipt…");
    try {
      applyReceipt(await read(parts.map((p) => p.blob)));
      setStep("review");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't read the receipt. You can type the items instead.",
      );
      setStep("review");
    } finally {
      setStatus(null);
    }
  }

  async function rereadPart(index: number, blob: Blob) {
    setStatus(`Reading part ${index + 1} again…`);
    try {
      const receipt = await read([blob]);
      setLines((list) => {
        const firstAt = list.findIndex((l) => l.part === index);
        const others = list.filter((l) => l.part !== index);
        const fresh = toLines(receipt.lines, index);
        const at = firstAt === -1 ? others.findIndex((l) => l.part > index) : firstAt;
        const insertAt = at === -1 ? others.length : at;
        return [...others.slice(0, insertAt), ...fresh, ...others.slice(insertAt)];
      });
      if (receipt.total && index === parts.length - 1) setTotal(toDecimalString(receipt.total));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that part.");
    } finally {
      setStatus(null);
    }
  }

  const check = useMemo(() => {
    const parsed = lines.map((l) => ({
      name: l.name,
      qty: Number(l.qty) || 1,
      total: parseAmount(l.total) ?? 0,
      part: l.part,
      confidence: l.confidence,
    }));
    return checkTotal(
      {
        lines: parsed,
        serviceCharge: parseAmount(service || "0") ?? 0,
        deliveryFee: parseAmount(delivery || "0") ?? 0,
        discount: parseAmount(discount || "0") ?? 0,
        total: total ? (parseAmount(total) ?? undefined) : undefined,
      },
      Math.max(parts.length, 1),
    );
  }, [lines, service, delivery, discount, total, parts.length]);

  function update(key: string, patch: Partial<Line>) {
    setLines((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function submit() {
    setError(null);
    const items = lines.map((l) => ({
      name: l.name.trim(),
      qty: Math.max(1, Math.min(99, Math.round(Number(l.qty) || 1))),
      total: parseAmount(l.total),
      sharedByAll: l.sharedByAll,
      part: l.part,
    }));
    const bad = items.findIndex((i) => !i.name || i.total === null || i.total < 0);
    if (bad !== -1) {
      setError(`Line ${bad + 1} needs a name and a price.`);
      return;
    }
    const payload = {
      title: title.trim() || merchant.trim() || "Receipt",
      merchant: merchant.trim() || undefined,
      date,
      payerId: groupToken ? payerId : undefined,
      payerName: groupToken ? undefined : payerName.trim(),
      receiptTotal: total ? (parseAmount(total) ?? undefined) : undefined,
      items,
      serviceCharge: parseAmount(service || "0") ?? 0,
      deliveryFee: parseAmount(delivery || "0") ?? 0,
      discount: parseAmount(discount || "0") ?? 0,
    };
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    for (const [i, p] of parts.entries()) form.append("part", p.blob, `part-${i + 1}.jpg`);
    startSubmit(async () => {
      const result = await createBill(groupToken, null, form);
      if (result && !result.ok) setError(result.error);
    });
  }

  // ---------- Capture ----------
  if (step === "capture") {
    return (
      <div className="flex flex-col gap-4">
        {camera && (
          <CameraSheet
            partNumber={camera.replace !== undefined ? camera.replace + 1 : parts.length + 1}
            previousUrl={camera.replace === undefined ? parts.at(-1)?.url : undefined}
            onClose={() => setCamera(null)}
            onCapture={(blob) => addPhoto(blob, camera.replace)}
          />
        )}
        <div className="card m-card-in flex flex-col gap-4">
          <div>
            <h2 className="display m-0 text-[22px] font-bold">Photos of the receipt</h2>
            <p className="m-0 mt-1 text-[15px] text-muted-light">
              Long receipt? Take it in parts, top to bottom, up to {MAX_PARTS}. Let each part
              overlap the last a little.
            </p>
          </div>
          {parts.length > 0 && (
            <ol className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4">
              {parts.map((p, i) => (
                <li key={p.id} className="flex flex-col gap-1.5">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-paper">
                    {/* biome-ignore lint/performance/noImgElement: local blob preview */}
                    <img src={p.url} alt={`Part ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-paper">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move part ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="flex size-11 items-center justify-center rounded-full hover:bg-black/5"
                    >
                      <Icon name="up" size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move part ${i + 1} down`}
                      disabled={i === parts.length - 1}
                      onClick={() => move(i, 1)}
                      className="flex size-11 items-center justify-center rounded-full hover:bg-black/5"
                    >
                      <Icon name="down" size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove part ${i + 1}`}
                      onClick={() => setParts((l) => l.filter((x) => x.id !== p.id))}
                      className="flex size-11 items-center justify-center rounded-full text-coral-dark hover:bg-black/5"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ink"
              disabled={parts.length >= MAX_PARTS}
              onClick={() => setCamera({})}
            >
              <Icon name="camera" size={16} /> {parts.length ? "Add next part" : "Take photo"}
            </button>
            <button
              type="button"
              className="btn-outline-light"
              disabled={parts.length >= MAX_PARTS}
              onClick={() => gallery.current?.click()}
            >
              From gallery
            </button>
            <input
              ref={gallery}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              aria-label="Choose receipt photos"
              onChange={(e) => addFromGallery(e.target.files)}
            />
          </div>
          {error && <p className="form-error m-0">{error}</p>}
          <p className="m-0 text-[13px] text-muted-light">
            Receipts are read by Google's free Gemini service, which may use them to improve its
            models. Photos are deleted once the bill is fully paid.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton type="button" disabled={parts.length === 0} onClick={readAll}>
            Done, read it
          </PrimaryButton>
          <button type="button" className="btn-outline" onClick={() => setStep("review")}>
            Type items instead
          </button>
        </div>
      </div>
    );
  }

  // ---------- Reading ----------
  if (step === "reading") {
    return (
      <div
        className="glass m-card-in flex flex-col items-center gap-4 py-12 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="m-pulse size-6 rounded-full bg-mint" />
        <p className="m-0 text-lg">{status ?? "Reading…"}</p>
      </div>
    );
  }

  // ---------- Review ----------
  const itemsTotal = lines.reduce((s, l) => s + (parseAmount(l.total) ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      {camera && (
        <CameraSheet
          partNumber={(camera.replace ?? 0) + 1}
          onClose={() => setCamera(null)}
          onCapture={(blob) => addPhoto(blob, camera.replace)}
        />
      )}
      {status && (
        <p className="chip-glass m-0 self-start" role="status">
          <span className="m-pulse size-2 rounded-full bg-mint" /> {status}
        </p>
      )}

      <div className="card m-card-in flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="display m-0 text-[22px] font-bold">Check the items</h2>
          {source && (
            <span className="badge-count">
              Read by{" "}
              {source === "gemini" ? "Gemini" : source === "ocrspace" ? "OCR.space" : "your phone"}
            </span>
          )}
        </div>

        {!check.ok && (
          <div role="alert" className="rounded-2xl bg-[var(--coral-soft)] p-3 text-[15px] text-ink">
            Items and charges add up to <strong>{formatMoney(check.itemsTotal, currency)}</strong>
            {" + charges, but the receipt total is "}
            <strong>{formatMoney(check.expectedTotal ?? 0, currency)}</strong> (
            {check.gap > 0 ? "missing " : "extra "}
            {formatMoney(Math.abs(check.gap), currency)}).
            {parts.length > 1 && check.suspectPart !== undefined && (
              <>
                {" "}
                Check part {check.suspectPart + 1}.{" "}
                <button
                  type="button"
                  className="font-semibold text-mint-dark underline"
                  onClick={() => setCamera({ replace: check.suspectPart })}
                >
                  Retake part {check.suspectPart + 1}
                </button>
              </>
            )}
          </div>
        )}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {lines.map((l, i) => (
            <li
              key={l.key}
              className={`grid grid-cols-1 items-center gap-2 rounded-2xl p-1.5 sm:grid-cols-[minmax(0,1fr)_56px_96px_44px] ${l.confidence < 0.7 ? "bg-[var(--coral-soft)]" : ""}`}
            >
              <input
                aria-label={`Item ${i + 1} name`}
                value={l.name}
                onChange={(e) => update(l.key, { name: e.target.value })}
                className="input min-w-0"
              />
              <div className="grid grid-cols-[56px_minmax(0,96px)_44px] items-center gap-2 sm:contents">
                <input
                  aria-label={`Item ${i + 1} quantity`}
                  inputMode="numeric"
                  value={l.qty}
                  onChange={(e) => update(l.key, { qty: e.target.value })}
                  className="input money px-2 text-center"
                />
                <input
                  aria-label={`Item ${i + 1} line total`}
                  inputMode="decimal"
                  value={l.total}
                  onChange={(e) => update(l.key, { total: e.target.value })}
                  className="input money px-2 text-right"
                />
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() => setLines((list) => list.filter((x) => x.key !== l.key))}
                  className="flex size-11 items-center justify-center rounded-full text-muted-light hover:bg-black/5"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <div className="col-span-1 flex flex-wrap items-center gap-3 px-1 text-[13px] text-muted-light sm:col-span-4">
                {parts.length > 1 && <span>Part {l.part + 1}</span>}
                {l.merged && <span className="text-mint-dark">Merged from overlap</span>}
                {l.confidence < 0.7 && (
                  <span className="font-semibold text-coral-dark">Please check</span>
                )}
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={l.sharedByAll}
                    onChange={(e) => update(l.key, { sharedByAll: e.target.checked })}
                    className="size-4 accent-[var(--mint-dark)]"
                  />
                  Shared by all
                </label>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-outline-light"
            onClick={() =>
              setLines((list) => [
                ...list,
                {
                  key: uid(),
                  name: "",
                  qty: "1",
                  total: "",
                  part: Math.max(parts.length - 1, 0),
                  confidence: 1,
                  sharedByAll: false,
                },
              ])
            }
          >
            <Icon name="plus" size={16} /> Add a line
          </button>
          {parts.map((_, i) => (
            <button
              key={i}
              type="button"
              className="btn-outline-light"
              onClick={() => setCamera({ replace: i })}
            >
              <Icon name="refresh" size={16} /> Retake part {i + 1}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">
            Service charge
            <input
              inputMode="decimal"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="0.00"
              className="input money"
            />
          </label>
          <label className="field">
            Delivery fee
            <input
              inputMode="decimal"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              placeholder="0.00"
              className="input money"
            />
          </label>
          <label className="field">
            Discount for everyone
            <input
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
              className="input money"
            />
          </label>
          <label className="field">
            Receipt total
            <input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0.00"
              className="input money"
            />
          </label>
        </div>
        <p className="m-0 text-[13px] text-muted-light">
          Items: <span className="money">{formatMoney(itemsTotal, currency)}</span>. Charges and
          discounts are shared in proportion to what each person had. Senior/PWD discounts are added
          per person on the claim page.
        </p>
      </div>

      <div className="card flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            Bill name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Dinner at Mang Inasal"
              className="input"
            />
          </label>
          <label className="field">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </label>
          {groupToken && people ? (
            <label className="field">
              Who paid the bill?
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="input"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.id === meId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              Your name (you paid)
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                maxLength={40}
                required
                className="input"
              />
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="form-error-dark m-0">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <PrimaryButton
          type="button"
          pending={submitting}
          disabled={lines.length === 0}
          onClick={submit}
          icon="share"
        >
          Create claim link
        </PrimaryButton>
        <button type="button" className="btn-outline" onClick={() => setStep("capture")}>
          Back to photos
        </button>
      </div>
    </div>
  );
}
