import type { Category, Expense } from "../types";

export type ExportFormat = "csv" | "json" | "pdf";

/** Which expenses to export. Empty date strings mean unbounded. */
export interface ExportQuery {
  from: string;
  to: string;
  categories: Category[];
}

export interface ExportOptions extends ExportQuery {
  format: ExportFormat;
  /** Base filename without extension, as typed by the user. */
  filename: string;
}

export interface ExportSummary {
  count: number;
  totalCents: number;
  /** Earliest and latest expense dates actually present in the export. */
  firstDate: string | null;
  lastDate: string | null;
  byCategory: Array<{ category: Category; count: number; totalCents: number }>;
}

export interface ExportContext {
  query: ExportQuery;
  summary: ExportSummary;
  generatedAt: Date;
}

export interface ExportFormatSpec {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  description: string;
  /** Formats that can show their raw output in the preview pane. */
  textPreview: boolean;
  build: (rows: Expense[], ctx: ExportContext) => Promise<Blob>;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  count: number;
}
