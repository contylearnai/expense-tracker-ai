import type { Expense } from "../types";
import { defaultFilename, sanitizeFilename } from "./filename";
import { selectExportRows, summarizeExport } from "./query";
import { EXPORT_FORMATS } from "./registry";
import type { ExportOptions, ExportResult } from "./types";

export async function runExport(
  expenses: Expense[],
  options: ExportOptions,
  now: Date = new Date(),
): Promise<ExportResult> {
  const spec = EXPORT_FORMATS[options.format];
  const rows = selectExportRows(expenses, options);
  if (rows.length === 0) throw new Error("No expenses match these filters.");
  const summary = summarizeExport(rows);
  const blob = await spec.build(rows, { query: options, summary, generatedAt: now });
  const base = sanitizeFilename(options.filename, spec.extension) || defaultFilename(now);
  return { blob, filename: `${base}.${spec.extension}`, count: rows.length };
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later: some browsers start the download asynchronously.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
