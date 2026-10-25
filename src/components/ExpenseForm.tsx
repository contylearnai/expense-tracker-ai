"use client";

import { useState, type FormEvent } from "react";
import { centsToInput, todayISO } from "@/lib/format";
import { CATEGORIES, type Expense, type ExpenseInput } from "@/lib/types";
import { MAX_DESCRIPTION_LENGTH, validateExpense, type ExpenseFormErrors, type ExpenseFormValues } from "@/lib/validation";
import { Button } from "./ui";

const inputClass =
  "block w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40";

function fieldBorder(error?: string) {
  return error ? "border-danger focus:border-danger" : "border-line focus:border-accent";
}

export function ExpenseForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ExpenseFormValues>(() => ({
    date: initial?.date ?? todayISO(),
    amount: initial ? centsToInput(initial.amountCents) : "",
    category: initial?.category ?? "Food",
    description: initial?.description ?? "",
  }));
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof ExpenseFormValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Re-validate live only after the first submit attempt, so users aren't nagged while typing.
    if (submitted) {
      const result = validateExpense(next);
      setErrors(result.ok ? {} : result.errors);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const result = validateExpense(values);
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = Object.keys(result.errors)[0];
      document.getElementById(`expense-${firstInvalid}`)?.focus();
      return;
    }
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="expense-amount" label="Amount" error={errors.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">$</span>
            <input
              id="expense-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              autoFocus
              value={values.amount}
              onChange={(e) => update("amount", e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "expense-amount-error" : undefined}
              className={`${inputClass} ${fieldBorder(errors.amount)} pl-7 tabular-nums`}
            />
          </div>
        </Field>
        <Field id="expense-date" label="Date" error={errors.date}>
          <input
            id="expense-date"
            type="date"
            max={todayISO()}
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? "expense-date-error" : undefined}
            className={`${inputClass} ${fieldBorder(errors.date)}`}
          />
        </Field>
      </div>

      <Field id="expense-category" label="Category" error={errors.category}>
        <select
          id="expense-category"
          value={values.category}
          onChange={(e) => update("category", e.target.value)}
          aria-invalid={!!errors.category}
          className={`${inputClass} ${fieldBorder(errors.category)}`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="expense-description"
        label="Description"
        error={errors.description}
        hint={`${values.description.trim().length}/${MAX_DESCRIPTION_LENGTH}`}
      >
        <input
          id="expense-description"
          placeholder="e.g. Weekly groceries"
          maxLength={MAX_DESCRIPTION_LENGTH + 20}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "expense-description-error" : undefined}
          className={`${inputClass} ${fieldBorder(errors.description)}`}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add expense"}</Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-secondary">
          {label}
        </label>
        {hint && <span className="text-xs tabular-nums text-ink-muted">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
