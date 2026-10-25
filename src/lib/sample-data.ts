import { toISODate } from "./format";
import { createId } from "./storage";
import type { Category, Expense } from "./types";

const TEMPLATES: Array<[Category, string, number, number]> = [
  ["Food", "Groceries", 4500, 12000],
  ["Food", "Lunch with coworkers", 1200, 3000],
  ["Food", "Coffee", 400, 700],
  ["Transportation", "Gas", 3500, 6500],
  ["Transportation", "Rideshare", 1200, 3500],
  ["Entertainment", "Movie tickets", 1800, 3200],
  ["Entertainment", "Streaming subscription", 1599, 1599],
  ["Shopping", "Clothing", 3000, 12000],
  ["Shopping", "Household supplies", 1500, 5000],
  ["Bills", "Electricity", 8000, 14000],
  ["Bills", "Internet", 6999, 6999],
  ["Bills", "Phone", 4500, 4500],
  ["Other", "Gift", 2000, 8000],
];

/** Roughly six months of plausible expenses, for trying the app out. */
export function generateSampleExpenses(now: Date = new Date()): Expense[] {
  const out: Expense[] = [];
  const stamp = now.toISOString();
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const lastDay = monthsAgo === 0 ? now.getDate() : new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0).getDate();
    const count = monthsAgo === 0 ? Math.max(3, Math.round(lastDay / 2)) : 14;
    for (let i = 0; i < count; i++) {
      const [category, description, min, max] = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      const day = 1 + Math.floor(Math.random() * lastDay);
      out.push({
        id: createId(),
        date: toISODate(new Date(now.getFullYear(), now.getMonth() - monthsAgo, day)),
        amountCents: min + Math.floor(Math.random() * (max - min + 1)),
        category,
        description,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }
  return out;
}
