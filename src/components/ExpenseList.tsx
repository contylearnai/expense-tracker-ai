"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { CategoryBadge, CategoryIcon } from "./ui";

export function ExpenseList({
  expenses,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}) {
  const actions = !!(onEdit || onDelete);
  return (
    <ul className="divide-y divide-line">
      {expenses.map((e) => (
        <li key={e.id} className="group flex items-center gap-3 py-3">
          <CategoryIcon category={e.category} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{e.description}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <time dateTime={e.date}>{formatDate(e.date)}</time>
              <span className="hidden sm:inline">
                <CategoryBadge category={e.category} />
              </span>
              <span className="sm:hidden">· {e.category}</span>
            </div>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatCurrency(e.amountCents)}</p>
          {actions && (
            <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {onEdit && (
                <IconButton label={`Edit ${e.description}`} onClick={() => onEdit(e)}>
                  <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zM15.7 6.8a.7.7 0 000-1l-1.5-1.5a.7.7 0 00-1 0l-1.2 1.2 2.5 2.5 1.2-1.2z" />
                </IconButton>
              )}
              {onDelete && (
                <IconButton label={`Delete ${e.description}`} onClick={() => onDelete(e)} danger>
                  <path d="M7 3h6l.5 1H17v2H3V4h3.5L7 3zm-2 4h10l-.8 10H5.8L5 7z" />
                </IconButton>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 text-ink-muted transition-colors hover:bg-page ${danger ? "hover:text-danger" : "hover:text-ink"}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
