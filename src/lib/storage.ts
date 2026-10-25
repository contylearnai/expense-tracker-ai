import { isCategory, type Expense } from "./types";

const STORAGE_KEY = "expense-tracker:v1";

function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.amountCents === "number" &&
    Number.isInteger(e.amountCents) &&
    isCategory(e.category) &&
    typeof e.description === "string" &&
    typeof e.createdAt === "string" &&
    typeof e.updatedAt === "string"
  );
}

/** Reads saved expenses, dropping any malformed entries. Throws if storage is unavailable. */
export function loadExpenses(): Expense[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return Array.isArray(parsed) ? parsed.filter(isExpense) : [];
}

export function saveExpenses(expenses: Expense[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
