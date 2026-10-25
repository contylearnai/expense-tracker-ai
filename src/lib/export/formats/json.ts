import type { Expense } from "../../types";
import { describeQuery } from "../query";
import type { ExportContext, ExportFormatSpec } from "../types";

export const JSON_SCHEMA_VERSION = 1;

export function buildJsonDocument(rows: Expense[], ctx: ExportContext) {
  const { dateRange, categories } = describeQuery(ctx.query);
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    exportedAt: ctx.generatedAt.toISOString(),
    currency: "USD",
    filters: {
      from: ctx.query.from || null,
      to: ctx.query.to || null,
      categories: ctx.query.categories,
      description: `${dateRange} · ${categories}`,
    },
    summary: {
      count: ctx.summary.count,
      total: ctx.summary.totalCents / 100,
      firstDate: ctx.summary.firstDate,
      lastDate: ctx.summary.lastDate,
      byCategory: ctx.summary.byCategory.map((c) => ({ category: c.category, count: c.count, total: c.totalCents / 100 })),
    },
    expenses: rows.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amountCents / 100,
      amountCents: e.amountCents,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  };
}

export const jsonFormat: ExportFormatSpec = {
  id: "json",
  label: "JSON",
  extension: "json",
  mimeType: "application/json",
  description: "Structured data with filters and summary metadata",
  textPreview: true,
  build: async (rows, ctx) =>
    new Blob([JSON.stringify(buildJsonDocument(rows, ctx), null, 2)], { type: "application/json" }),
};
