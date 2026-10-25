import { escapeCsvCell } from "../csv";
import { formatMonthKey } from "../format";
import { CATEGORIES, type Category, type Expense } from "../types";
import type { ExportArtifact, TemplateId, TemplateParams } from "./types";

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  format: "CSV" | "JSON";
  params: "year" | "month" | "none";
  includes: string[];
  build: (expenses: Expense[], params: TemplateParams, now: Date) => ExportArtifact;
}

const dollars = (cents: number) => (cents / 100).toFixed(2);
const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

function toCsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows].map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
}

function csvArtifact(filename: string, columns: string[], rows: string[][], records: number): ExportArtifact {
  return { filename, mimeType: "text/csv;charset=utf-8", content: toCsv(columns, rows), records, table: { columns, rows } };
}

/** "+12%" / "-5%" vs a prior value, or "new" when there was nothing before. */
function change(cur: number, prior: number): string {
  if (!prior) return "new";
  const v = Math.round(((cur - prior) / prior) * 100);
  return `${v >= 0 ? "+" : ""}${v}%`;
}

function sum(items: Expense[]): number {
  return items.reduce((t, e) => t + e.amountCents, 0);
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Itemized by category with subtotals: the shape accountants ask for. */
function taxReport(expenses: Expense[], params: TemplateParams, now: Date): ExportArtifact {
  const year = params.year ?? now.getFullYear() - 1;
  const inYear = expenses.filter((e) => e.date.startsWith(`${year}-`));
  const rows: string[][] = [];
  for (const category of CATEGORIES) {
    const items = inYear.filter((e) => e.category === category).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) continue;
    for (const e of items) rows.push([category, e.date, e.description, dollars(e.amountCents)]);
    rows.push([`${category} subtotal`, "", `${items.length} items`, dollars(sum(items))]);
  }
  rows.push(["TOTAL", "", `${inYear.length} items`, dollars(sum(inYear))]);
  return csvArtifact(`tax-report-${year}.csv`, ["Category", "Date", "Description", "Amount"], rows, inYear.length);
}

function monthlySummary(expenses: Expense[], params: TemplateParams, now: Date): ExportArtifact {
  const month = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = prevMonthKey(month);
  const cur = expenses.filter((e) => e.date.startsWith(month));
  const before = expenses.filter((e) => e.date.startsWith(prev));
  const total = sum(cur);
  const rows = CATEGORIES.map((category): [Category, number, number, number] => {
    const items = cur.filter((e) => e.category === category);
    return [category, items.length, sum(items), sum(before.filter((e) => e.category === category))];
  })
    .filter(([, count, cents, prior]) => count || cents || prior)
    .sort((a, b) => b[2] - a[2])
    .map(([category, count, cents, prior]) => [
      category,
      String(count),
      dollars(cents),
      pct(cents, total),
      change(cents, prior),
    ]);
  rows.push(["TOTAL", String(cur.length), dollars(total), total ? "100.0%" : "0.0%", change(total, sum(before))]);
  return csvArtifact(
    `monthly-summary-${month}.csv`,
    ["Category", "Expenses", "Total", "Share", `vs ${formatMonthKey(prev)}`],
    rows,
    cur.length,
  );
}

/** Category × month pivot over the trailing 12 months. */
function categoryAnalysis(expenses: Expense[], _params: TemplateParams, now: Date): ExportArtifact {
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const inWindow = expenses.filter((e) => months.includes(e.date.slice(0, 7)));
  const grand = sum(inWindow);
  const rows = CATEGORIES.map((category) => {
    const items = inWindow.filter((e) => e.category === category);
    const perMonth = months.map((m) => dollars(sum(items.filter((e) => e.date.startsWith(m)))));
    const total = sum(items);
    return [category, ...perMonth, dollars(total), dollars(Math.round(total / 12)), pct(total, grand)];
  });
  return csvArtifact(
    `category-analysis-${months[11]}.csv`,
    ["Category", ...months.map((m) => formatMonthKey(m)), "Total", "Avg / month", "Share"],
    rows,
    inWindow.length,
  );
}

export const BACKUP_FORMAT = "spendwise-backup";

function fullBackup(expenses: Expense[], _params: TemplateParams, now: Date): ExportArtifact {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const doc = { format: BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), count: sorted.length, expenses: sorted };
  const stamp = now.toISOString().slice(0, 10);
  return {
    filename: `spendwise-backup-${stamp}.json`,
    mimeType: "application/json",
    content: JSON.stringify(doc, null, 2),
    records: sorted.length,
    table: {
      columns: ["Date", "Category", "Description", "Amount"],
      rows: sorted.map((e) => [e.date, e.category, e.description, dollars(e.amountCents)]),
    },
  };
}

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  "tax-report": {
    id: "tax-report",
    name: "Tax Report",
    tagline: "Itemized for your accountant",
    description: "Every expense for a tax year, grouped by category with subtotals and a grand total.",
    icon: "🧾",
    format: "CSV",
    params: "year",
    includes: ["Itemized expenses", "Category subtotals", "Annual total"],
    build: taxReport,
  },
  "monthly-summary": {
    id: "monthly-summary",
    name: "Monthly Summary",
    tagline: "Where the month went",
    description: "Category totals and shares for one month, compared against the month before.",
    icon: "📅",
    format: "CSV",
    params: "month",
    includes: ["Category totals", "Share of spend", "Month-over-month change"],
    build: monthlySummary,
  },
  "category-analysis": {
    id: "category-analysis",
    name: "Category Analysis",
    tagline: "12-month trends by category",
    description: "A category × month pivot for the trailing year with averages, ready for charts.",
    icon: "📊",
    format: "CSV",
    params: "none",
    includes: ["12-month pivot", "Monthly averages", "Share of total"],
    build: categoryAnalysis,
  },
  "full-backup": {
    id: "full-backup",
    name: "Full Backup",
    tagline: "Everything, restorable",
    description: "A complete, versioned JSON copy of all your expenses, ideal for scheduled backups.",
    icon: "🛟",
    format: "JSON",
    params: "none",
    includes: ["All expenses", "Timestamps & IDs", "Versioned format"],
    build: fullBackup,
  },
};

export const TEMPLATE_ORDER: TemplateId[] = ["monthly-summary", "tax-report", "category-analysis", "full-backup"];

export function defaultParams(id: TemplateId, now: Date = new Date()): TemplateParams {
  const spec = TEMPLATES[id];
  if (spec.params === "year") return { year: now.getMonth() < 4 ? now.getFullYear() - 1 : now.getFullYear() };
  if (spec.params === "month") return { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` };
  return {};
}

export function describeParams(id: TemplateId, params: TemplateParams): string {
  if (TEMPLATES[id].params === "year") return `Tax year ${params.year}`;
  if (TEMPLATES[id].params === "month" && params.month) return formatMonthKey(params.month, "long");
  if (id === "category-analysis") return "Last 12 months";
  return "All expenses";
}
