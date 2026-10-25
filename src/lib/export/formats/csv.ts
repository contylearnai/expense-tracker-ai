import { escapeCsvCell } from "../../csv";
import type { Expense } from "../../types";
import type { ExportFormatSpec } from "../types";

export function buildCsvText(rows: Expense[]): string {
  const header = ["Date", "Category", "Description", "Amount"];
  const lines = rows.map((e) => [e.date, e.category, e.description, (e.amountCents / 100).toFixed(2)]);
  return [header, ...lines].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export const csvFormat: ExportFormatSpec = {
  id: "csv",
  label: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  description: "Spreadsheets — Excel, Numbers, Google Sheets",
  textPreview: true,
  // BOM so Excel detects UTF-8.
  build: async (rows) => new Blob(["﻿" + buildCsvText(rows)], { type: "text/csv;charset=utf-8" }),
};
