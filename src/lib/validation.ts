import { parseAmountToCents, parseISODate, todayISO } from "./format";
import { isCategory, type ExpenseInput } from "./types";

export interface ExpenseFormValues {
  date: string;
  amount: string;
  category: string;
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000
export const MAX_DESCRIPTION_LENGTH = 200;

export function validateExpense(
  values: ExpenseFormValues,
  today: string = todayISO(),
): { ok: true; data: ExpenseInput } | { ok: false; errors: ExpenseFormErrors } {
  const errors: ExpenseFormErrors = {};

  if (!values.date) {
    errors.date = "Date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(parseISODate(values.date).getTime())) {
    errors.date = "Enter a valid date.";
  } else if (values.date > today) {
    errors.date = "Date can't be in the future.";
  } else if (values.date < "1900-01-01") {
    errors.date = "Date is too far in the past.";
  }

  const cents = values.amount.trim() ? parseAmountToCents(values.amount) : null;
  if (!values.amount.trim()) {
    errors.amount = "Amount is required.";
  } else if (cents === null) {
    errors.amount = "Enter a number with up to 2 decimal places.";
  } else if (cents <= 0) {
    errors.amount = "Amount must be greater than $0.";
  } else if (cents > MAX_AMOUNT_CENTS) {
    errors.amount = "Amount must be $1,000,000 or less.";
  }

  if (!isCategory(values.category)) {
    errors.category = "Choose a category.";
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep it under ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      date: values.date,
      amountCents: cents as number,
      category: values.category as ExpenseInput["category"],
      description,
    },
  };
}
