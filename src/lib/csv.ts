import type { Expense } from "./types";

/**
 * Escapes one CSV cell. Values starting with = + - @ (or tab/CR) are prefixed with a
 * quote so spreadsheet apps don't execute them as formulas (CSV injection).
 */
export function escapeCsvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function expensesToCsv(expenses: Expense[]): string {
  const header = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    (e.amountCents / 100).toFixed(2),
    e.description,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function downloadCsv(csv: string, filename: string): void {
  // BOM so Excel opens the file as UTF-8.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
