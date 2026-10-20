import "server-only";
import ExcelJS from "exceljs";
import type { Centavos } from "@/core/money";
import type { GroupContext } from "@/server/access";
import type { Ledger } from "./queries";

// Palette from ui/tokens.css (ARGB, as Excel wants it).
const INK = "FF10202E";
const PAPER = "FFF5F6F1";
const MINT_DARK = "FF0B7A5E";
const MINT_SOFT = "FFE3F5EE";
const CORAL_DARK = "FFD9532C";
const MUTED = "FF5B6875";
const LINE = "FFE1E5DA";

const FONT = "Calibri";
const MONEY = "#,##0.00;-#,##0.00;0.00";

const fill = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});
const hairline: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: LINE } },
  bottom: { style: "thin", color: { argb: LINE } },
  left: { style: "thin", color: { argb: LINE } },
  right: { style: "thin", color: { argb: LINE } },
};

/** Excel needs real numbers to sum and sort, so centavos become pesos only here. */
const pesos = (amount: Centavos) => amount / 100;

/** Big ink banner across the sheet's used width, with a muted caption under it. */
function banner(ws: ExcelJS.Worksheet, width: number, title: string, caption: string) {
  ws.mergeCells(1, 1, 1, width);
  const head = ws.getCell(1, 1);
  head.value = title;
  head.font = { name: FONT, size: 18, bold: true, color: { argb: PAPER } };
  head.fill = fill(INK);
  head.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 36;

  ws.mergeCells(2, 1, 2, width);
  const sub = ws.getCell(2, 1);
  sub.value = caption;
  sub.font = { name: FONT, size: 10, color: { argb: MUTED } };
  sub.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 20;
}

/** Section label, e.g. "Balances", above a table. */
function label(ws: ExcelJS.Worksheet, row: number, text: string, note?: string) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { name: FONT, size: 13, bold: true, color: { argb: INK } };
  if (note) {
    const n = ws.getCell(row, 2);
    n.value = note;
    n.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } };
  }
  ws.getRow(row).height = 22;
}

function headerRow(ws: ExcelJS.Worksheet, row: number, titles: string[], moneyFrom = Infinity) {
  titles.forEach((title, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = title;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: PAPER } };
    cell.fill = fill(INK);
    cell.border = hairline;
    cell.alignment = {
      vertical: "middle",
      horizontal: i >= moneyFrom ? "right" : "left",
      indent: 1,
    };
  });
  ws.getRow(row).height = 22;
}

/** Writes one body row with zebra striping; `money` marks which columns are amounts. */
function bodyRow(
  ws: ExcelJS.Worksheet,
  row: number,
  values: (string | number | Date | null)[],
  money: Set<number>,
  striped: boolean,
) {
  values.forEach((value, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = value;
    cell.font = { name: FONT, size: 10, color: { argb: INK } };
    cell.border = hairline;
    if (striped) cell.fill = fill(PAPER);
    if (money.has(i)) {
      cell.numFmt = MONEY;
      cell.alignment = { horizontal: "right", indent: 1 };
    } else if (value instanceof Date) {
      cell.numFmt = "mmm d, yyyy";
      cell.alignment = { horizontal: "left", indent: 1 };
    } else {
      cell.alignment = { indent: 1 };
    }
  });
}

function totalRow(ws: ExcelJS.Worksheet, row: number, width: number, labelText: string) {
  for (let c = 1; c <= width; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: MINT_DARK } };
    cell.fill = fill(MINT_SOFT);
    cell.border = { ...hairline, top: { style: "medium", color: { argb: MINT_DARK } } };
  }
  const first = ws.getCell(row, 1);
  first.value = labelText;
  first.alignment = { indent: 1 };
}

const KIND_LABEL: Record<string, string> = {
  expense: "Expense",
  transfer: "Transfer",
  income: "Income",
};

/**
 * Builds a styled .xlsx: a Summary sheet (balances and the settle-up list)
 * and an Entries sheet with every entry and each person's share.
 */
export async function buildWorkbook(
  ctx: GroupContext,
  ledger: Ledger,
  nameOf: (id: string) => string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Parity";
  wb.created = new Date();
  const people = ctx.participants;
  const currency = ctx.group.currency;
  const exported = new Date().toLocaleDateString("en-PH", { dateStyle: "long" });
  const caption = `${currency} · ${people.length} people · Exported ${exported}`;

  // ---- Summary ----
  const sum = wb.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: MINT_DARK } },
  });
  sum.columns = [{ width: 28 }, { width: 22 }, { width: 18 }];
  banner(sum, 3, ctx.group.name, caption);

  let r = 4;
  label(sum, r, "Balances", "Positive = is owed money");
  r += 1;
  headerRow(sum, r, ["Person", `Balance (${currency})`, "Status"], 1);
  people.forEach((p, i) => {
    r += 1;
    const balance = ledger.balances[p.id] ?? 0;
    bodyRow(sum, r, [p.name, pesos(balance), ""], new Set([1]), i % 2 === 1);
    const status = sum.getCell(r, 3);
    status.value = balance > 0 ? "Is owed" : balance < 0 ? "Owes" : "Settled";
    const tone = balance > 0 ? MINT_DARK : balance < 0 ? CORAL_DARK : MUTED;
    status.font = { name: FONT, size: 10, bold: balance !== 0, color: { argb: tone } };
    sum.getCell(r, 2).font = { name: FONT, size: 10, color: { argb: tone } };
  });

  r += 2;
  label(sum, r, "How to settle all debts");
  r += 1;
  headerRow(sum, r, ["From", "To", `Amount (${currency})`], 2);
  if (ledger.transfers.length === 0) {
    r += 1;
    sum.mergeCells(r, 1, r, 3);
    const none = sum.getCell(r, 1);
    none.value = "Everyone is settled up.";
    none.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
    none.alignment = { indent: 1 };
    none.border = hairline;
  } else {
    const firstTransfer = r + 1;
    ledger.transfers.forEach((t, i) => {
      r += 1;
      bodyRow(sum, r, [nameOf(t.from), nameOf(t.to), pesos(t.amount)], new Set([2]), i % 2 === 1);
    });
    r += 1;
    totalRow(sum, r, 3, "Total to move");
    const total = sum.getCell(r, 3);
    total.value = { formula: `SUM(C${firstTransfer}:C${r - 1})` };
    total.numFmt = MONEY;
    total.alignment = { horizontal: "right", indent: 1 };
  }

  // ---- Entries ----
  const headers = [
    "Date",
    "Type",
    "Title",
    "Category",
    "Paid by",
    "To",
    `Amount (${currency})`,
    ...people.map((p) => p.name),
  ];
  const width = headers.length;
  const ent = wb.addWorksheet("Entries", {
    views: [{ state: "frozen", ySplit: 5, xSplit: 3, showGridLines: false }],
    properties: { tabColor: { argb: CORAL_DARK } },
  });
  ent.columns = [
    { width: 14 },
    { width: 11 },
    { width: 30 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    ...people.map(() => ({ width: 14 })),
  ];
  banner(ent, width, `${ctx.group.name}: entries`, caption);

  // Group the per-person share columns under one "Shares" band.
  if (people.length > 0) {
    ent.mergeCells(4, 8, 4, width);
    const band = ent.getCell(4, 8);
    band.value = "Each person's share";
    band.font = { name: FONT, size: 10, bold: true, color: { argb: MINT_DARK } };
    band.fill = fill(MINT_SOFT);
    band.alignment = { horizontal: "center", vertical: "middle" };
    band.border = hairline;
  }
  headerRow(ent, 5, headers, 6);

  const moneyCols = new Set(headers.map((_, i) => i).filter((i) => i >= 6));
  const entries = [...ledger.entries].reverse();
  entries.forEach((e, i) => {
    const shares = new Map((e.entry_splits ?? []).map((s) => [s.participant_id, s.amount]));
    bodyRow(
      ent,
      6 + i,
      [
        new Date(`${e.entry_date}T00:00:00Z`),
        KIND_LABEL[e.kind] ?? e.kind,
        e.title,
        e.category ?? "",
        nameOf(e.payer_id),
        e.recipient_id ? nameOf(e.recipient_id) : "",
        pesos(e.amount),
        ...people.map((p) => (shares.has(p.id) ? pesos(shares.get(p.id) ?? 0) : null)),
      ],
      moneyCols,
      i % 2 === 1,
    );
    if (e.kind !== "expense") {
      ent.getCell(6 + i, 2).font = { name: FONT, size: 10, color: { argb: MUTED }, italic: true };
    }
  });

  const last = 5 + entries.length;
  if (entries.length > 0) {
    ent.autoFilter = { from: { row: 5, column: 1 }, to: { row: last, column: width } };
    const totals = last + 1;
    totalRow(ent, totals, width, "Total expenses");
    for (const c of moneyCols) {
      const col = ent.getColumn(c + 1).letter;
      const cell = ent.getCell(totals, c + 1);
      // Only expenses count toward spending; transfers and income just move money.
      cell.value = { formula: `SUMIF($B$6:$B$${last},"Expense",${col}6:${col}${last})` };
      cell.numFmt = MONEY;
      cell.alignment = { horizontal: "right", indent: 1 };
    }
  } else {
    ent.mergeCells(6, 1, 6, width);
    const none = ent.getCell(6, 1);
    none.value = "No entries yet.";
    none.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
    none.alignment = { indent: 1 };
  }

  for (const ws of [sum, ent]) {
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }

  return wb.xlsx.writeBuffer();
}
