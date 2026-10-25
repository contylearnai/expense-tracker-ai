import { toISODate } from "./format";
import { CATEGORIES, type Category, type Expense, type ExpenseFilters, type SortKey } from "./types";

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  const q = filters.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (filters.category !== "All" && e.category !== filters.category) return false;
    if (filters.from && e.date < filters.from) return false;
    if (filters.to && e.date > filters.to) return false;
    if (q && !e.description.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortExpenses(expenses: Expense[], sort: SortKey): Expense[] {
  const sorted = [...expenses];
  sorted.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      case "amount-desc":
        return b.amountCents - a.amountCents;
      case "amount-asc":
        return a.amountCents - b.amountCents;
      case "date-desc":
      default:
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }
  });
  return sorted;
}

export function sumCents(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + e.amountCents, 0);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export interface CategoryTotal {
  category: Category;
  totalCents: number;
  count: number;
  share: number;
}

/** Totals for every category (including zeros), sorted largest first. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const grand = sumCents(expenses);
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    const totalCents = sumCents(items);
    return { category, totalCents, count: items.length, share: grand ? totalCents / grand : 0 };
  }).sort((a, b) => b.totalCents - a.totalCents);
}

export interface MonthTotal {
  key: string;
  totalCents: number;
  count: number;
}

/** The last `months` calendar months ending at `now`, oldest first, zero-filled. */
export function totalsByMonth(expenses: Expense[], months: number, now: Date = new Date()): MonthTotal[] {
  const buckets: MonthTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: toISODate(d).slice(0, 7), totalCents: 0, count: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const e of expenses) {
    const bucket = index.get(monthKey(e.date));
    if (bucket) {
      bucket.totalCents += e.amountCents;
      bucket.count += 1;
    }
  }
  return buckets;
}

export interface SummaryStats {
  totalCents: number;
  count: number;
  thisMonthCents: number;
  lastMonthCents: number;
  /** Fractional change vs last month, or null when last month had no spending. */
  monthChange: number | null;
  avgPerExpenseCents: number;
  topCategory: CategoryTotal | null;
}

export function summarize(expenses: Expense[], now: Date = new Date()): SummaryStats {
  const thisKey = toISODate(now).slice(0, 7);
  const lastKey = toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const totalCents = sumCents(expenses);
  const thisMonthCents = sumCents(expenses.filter((e) => monthKey(e.date) === thisKey));
  const lastMonthCents = sumCents(expenses.filter((e) => monthKey(e.date) === lastKey));
  const top = totalsByCategory(expenses)[0];
  return {
    totalCents,
    count: expenses.length,
    thisMonthCents,
    lastMonthCents,
    monthChange: lastMonthCents ? (thisMonthCents - lastMonthCents) / lastMonthCents : null,
    avgPerExpenseCents: expenses.length ? Math.round(totalCents / expenses.length) : 0,
    topCategory: top && top.totalCents > 0 ? top : null,
  };
}
