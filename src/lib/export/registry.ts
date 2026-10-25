import { csvFormat } from "./formats/csv";
import { jsonFormat } from "./formats/json";
import { pdfFormat } from "./formats/pdf";
import type { ExportFormat, ExportFormatSpec } from "./types";

export const EXPORT_FORMATS: Record<ExportFormat, ExportFormatSpec> = {
  csv: csvFormat,
  json: jsonFormat,
  pdf: pdfFormat,
};

export const EXPORT_FORMAT_ORDER: ExportFormat[] = ["csv", "json", "pdf"];
