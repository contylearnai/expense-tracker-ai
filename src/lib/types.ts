export const CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** Calendar date as YYYY-MM-DD (no time zone, so it never shifts a day). */
  date: string;
  /** Integer cents, to avoid floating-point rounding errors. */
  amountCents: number;
  category: Category;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, "date" | "amountCents" | "category" | "description">;

export interface ExpenseFilters {
  search: string;
  category: Category | "All";
  /** Inclusive YYYY-MM-DD bounds; empty string means unbounded. */
  from: string;
  to: string;
}

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export const EMPTY_FILTERS: ExpenseFilters = {
  search: "",
  category: "All",
  from: "",
  to: "",
};

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
