import { describe, expect, it } from "vitest";
import { filterExpenses, sortExpenses, summarize, totalsByCategory, totalsByMonth } from "./analytics";
import { EMPTY_FILTERS, type Expense } from "./types";

function exp(partial: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(),
    date: "2024-05-01",
    amountCents: 1000,
    category: "Food",
    description: "Item",
    createdAt: "2024-05-01T00:00:00.000Z",
    updatedAt: "2024-05-01T00:00:00.000Z",
    ...partial,
  };
}

const data = [
  exp({ date: "2024-04-15", amountCents: 5000, category: "Bills", description: "Electric bill" }),
  exp({ date: "2024-05-02", amountCents: 1200, category: "Food", description: "Groceries" }),
  exp({ date: "2024-05-20", amountCents: 800, category: "Food", description: "Coffee beans" }),
  exp({ date: "2024-05-21", amountCents: 3000, category: "Shopping", description: "Shoes" }),
];

describe("filterExpenses", () => {
  it("filters by category, inclusive date range and search", () => {
    expect(filterExpenses(data, { ...EMPTY_FILTERS, category: "Food" })).toHaveLength(2);
    expect(filterExpenses(data, { ...EMPTY_FILTERS, from: "2024-05-02", to: "2024-05-20" })).toHaveLength(2);
    expect(filterExpenses(data, { ...EMPTY_FILTERS, search: "COFFEE" })).toHaveLength(1);
  });
});

describe("sortExpenses", () => {
  it("sorts by amount and date", () => {
    expect(sortExpenses(data, "amount-desc")[0].amountCents).toBe(5000);
    expect(sortExpenses(data, "date-desc")[0].date).toBe("2024-05-21");
    expect(sortExpenses(data, "date-asc")[0].date).toBe("2024-04-15");
  });
});

describe("aggregations", () => {
  const now = new Date(2024, 4, 25); // May 25, 2024

  it("totals by category, largest first, including empty categories", () => {
    const totals = totalsByCategory(data);
    expect(totals).toHaveLength(6);
    expect(totals[0]).toMatchObject({ category: "Bills", totalCents: 5000, count: 1 });
    expect(totals.find((t) => t.category === "Food")?.totalCents).toBe(2000);
  });

  it("zero-fills monthly buckets oldest first", () => {
    const months = totalsByMonth(data, 3, now);
    expect(months.map((m) => m.key)).toEqual(["2024-03", "2024-04", "2024-05"]);
    expect(months.map((m) => m.totalCents)).toEqual([0, 5000, 5000]);
  });

  it("summarizes this month vs last month", () => {
    const s = summarize(data, now);
    expect(s.thisMonthCents).toBe(5000);
    expect(s.lastMonthCents).toBe(5000);
    expect(s.monthChange).toBe(0);
    expect(s.topCategory?.category).toBe("Bills");
  });
});
