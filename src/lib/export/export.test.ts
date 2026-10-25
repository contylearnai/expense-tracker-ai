import { describe, expect, it } from "vitest";
import { CATEGORIES, type Expense } from "../types";
import { defaultFilename, sanitizeFilename } from "./filename";
import { buildCsvText } from "./formats/csv";
import { buildJsonDocument } from "./formats/json";
import { toPdfText } from "./formats/pdf";
import { describeQuery, selectExportRows, summarizeExport, validateQuery } from "./query";
import { runExport } from "./run";

function exp(p: Partial<Expense>): Expense {
  return {
    id: p.id ?? Math.random().toString(36),
    date: "2026-05-01",
    amountCents: 1000,
    category: "Food",
    description: "Item",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...p,
  };
}

const data = [
  exp({ id: "c", date: "2026-05-20", amountCents: 3000, category: "Shopping", description: "Shoes" }),
  exp({ id: "a", date: "2026-04-15", amountCents: 5000, category: "Bills", description: "Electric" }),
  exp({ id: "b", date: "2026-05-02", amountCents: 1250, category: "Food", description: 'Lunch, "team"' }),
];
const all = { from: "", to: "", categories: [...CATEGORIES] };

describe("selectExportRows", () => {
  it("returns all rows oldest first", () => {
    expect(selectExportRows(data, all).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("applies inclusive date range and category set", () => {
    expect(selectExportRows(data, { ...all, from: "2026-05-02", to: "2026-05-20" }).map((e) => e.id)).toEqual(["b", "c"]);
    expect(selectExportRows(data, { ...all, categories: ["Bills", "Food"] }).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("summary and validation", () => {
  it("summarizes count, total, span and per-category totals", () => {
    const s = summarizeExport(selectExportRows(data, all));
    expect(s).toMatchObject({ count: 3, totalCents: 9250, firstDate: "2026-04-15", lastDate: "2026-05-20" });
    expect(s.byCategory.map((c) => c.category)).toEqual(["Bills", "Shopping", "Food"]);
  });

  it("flags empty category selection and inverted ranges", () => {
    expect(validateQuery({ ...all, categories: [] })).toBe("no-categories");
    expect(validateQuery({ ...all, from: "2026-06-01", to: "2026-05-01" })).toBe("inverted-range");
    expect(validateQuery(all)).toBeNull();
  });

  it("describes queries for report headers", () => {
    expect(describeQuery(all)).toEqual({ dateRange: "All dates", categories: "All categories" });
    expect(describeQuery({ from: "2026-01-01", to: "", categories: ["Food"] })).toEqual({
      dateRange: "From 2026-01-01",
      categories: "Food",
    });
  });
});

describe("sanitizeFilename", () => {
  it("strips illegal characters, path separators and a typed extension", () => {
    expect(sanitizeFilename("../q1: report?.csv", "csv")).toBe("q1- report-");
    expect(sanitizeFilename("  My   Report  ", "pdf")).toBe("My Report");
    expect(sanitizeFilename("taxes.PDF", "pdf")).toBe("taxes");
  });

  it("avoids Windows reserved names and empties", () => {
    expect(sanitizeFilename("CON", "csv")).toBe("CON-export");
    expect(sanitizeFilename("///", "csv")).toBe("");
  });

  it("builds a dated default", () => {
    expect(defaultFilename(new Date(2026, 0, 5))).toBe("expenses-2026-01-05");
  });
});

describe("format builders", () => {
  const rows = selectExportRows(data, all);
  const ctx = { query: all, summary: summarizeExport(rows), generatedAt: new Date("2026-06-01T12:00:00Z") };

  it("CSV escapes cells and formats amounts", () => {
    expect(buildCsvText(rows)).toBe(
      'Date,Category,Description,Amount\r\n2026-04-15,Bills,Electric,50.00\r\n2026-05-02,Food,"Lunch, ""team""",12.50\r\n2026-05-20,Shopping,Shoes,30.00',
    );
  });

  it("JSON includes metadata, summary and both amount representations", () => {
    const doc = buildJsonDocument(rows, ctx);
    expect(doc.schemaVersion).toBe(1);
    expect(doc.filters).toMatchObject({ from: null, to: null });
    expect(doc.summary).toMatchObject({ count: 3, total: 92.5 });
    expect(doc.expenses[1]).toMatchObject({ id: "b", amount: 12.5, amountCents: 1250 });
  });

  it("PDF text falls back to Latin-1", () => {
    expect(toPdfText("“Café” – done…🍕")).toBe('"Café" - done...??');
  });
});

describe("runExport", () => {
  it("produces a named file for each format", async () => {
    const now = new Date(2026, 5, 1);
    const csv = await runExport(data, { ...all, format: "csv", filename: "" }, now);
    expect(csv.filename).toBe("expenses-2026-06-01.csv");
    expect(csv.count).toBe(3);

    const json = await runExport(data, { ...all, format: "json", filename: "backup.json" }, now);
    expect(json.filename).toBe("backup.json");
    expect(JSON.parse(await json.blob.text()).expenses).toHaveLength(3);

    const pdf = await runExport(data, { ...all, format: "pdf", filename: "Report" }, now);
    expect(pdf.filename).toBe("Report.pdf");
    expect((await pdf.blob.text()).startsWith("%PDF-")).toBe(true);
  });

  it("rejects an empty selection", async () => {
    await expect(runExport(data, { ...all, categories: ["Other"], format: "csv", filename: "x" })).rejects.toThrow(
      "No expenses match",
    );
  });
});
