import { CATEGORIES, type Expense } from "../types";
import type { ExportQuery, ExportSummary } from "./types";

/** Rows matching the query, oldest first (reads naturally in reports). */
export function selectExportRows(expenses: Expense[], query: ExportQuery): Expense[] {
  const allowed = new Set(query.categories);
  return expenses
    .filter(
      (e) =>
        allowed.has(e.category) &&
        (!query.from || e.date >= query.from) &&
        (!query.to || e.date <= query.to),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/** Expects rows sorted by date, as returned by selectExportRows. */
export function summarizeExport(rows: Expense[]): ExportSummary {
  const byCategory = CATEGORIES.map((category) => {
    const items = rows.filter((e) => e.category === category);
    return { category, count: items.length, totalCents: items.reduce((t, e) => t + e.amountCents, 0) };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    count: rows.length,
    totalCents: rows.reduce((t, e) => t + e.amountCents, 0),
    firstDate: rows[0]?.date ?? null,
    lastDate: rows[rows.length - 1]?.date ?? null,
    byCategory,
  };
}

export type QueryIssue = "no-categories" | "inverted-range";

export function validateQuery(query: ExportQuery): QueryIssue | null {
  if (query.categories.length === 0) return "no-categories";
  if (query.from && query.to && query.from > query.to) return "inverted-range";
  return null;
}

/** Human description of the query, used in report headers and JSON metadata. */
export function describeQuery(query: ExportQuery): { dateRange: string; categories: string } {
  const dateRange =
    query.from && query.to
      ? `${query.from} to ${query.to}`
      : query.from
        ? `From ${query.from}`
        : query.to
          ? `Through ${query.to}`
          : "All dates";
  const categories =
    query.categories.length === CATEGORIES.length ? "All categories" : query.categories.join(", ");
  return { dateRange, categories };
}
