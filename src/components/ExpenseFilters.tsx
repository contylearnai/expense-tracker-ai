"use client";

import { CATEGORIES, EMPTY_FILTERS, type ExpenseFilters, type SortKey } from "@/lib/types";
import { toISODate } from "@/lib/format";
import { Button } from "./ui";

const controlClass =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

const PRESETS: Array<{ label: string; range: () => { from: string; to: string } }> = [
  {
    label: "This month",
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
    },
  },
  {
    label: "Last month",
    range: () => {
      const now = new Date();
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: "Last 90 days",
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)), to: toISODate(now) };
    },
  },
  {
    label: "This year",
    range: () => {
      const now = new Date();
      return { from: `${now.getFullYear()}-01-01`, to: toISODate(now) };
    },
  },
];

export function ExpenseFiltersBar({
  filters,
  onChange,
  sort,
  onSortChange,
}: {
  filters: ExpenseFilters;
  onChange: (next: ExpenseFilters) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}) {
  const set = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => onChange({ ...filters, [key]: value });
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const rangeInvalid = !!filters.from && !!filters.to && filters.from > filters.to;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search expenses</span>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">
            ⌕
          </span>
          <input
            type="search"
            placeholder="Search descriptions…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className={`${controlClass} w-full pl-8`}
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select value={filters.category} onChange={(e) => set("category", e.target.value as ExpenseFilters["category"])} className={`${controlClass} w-full`}>
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-muted">From</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)} className={`${controlClass} w-full min-w-0`} />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-muted">To</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} className={`${controlClass} w-full min-w-0`} />
        </label>
        <label>
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)} className={`${controlClass} w-full`}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const r = p.range();
          const active = filters.from === r.from && filters.to === r.to;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filters, ...r })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-ink-secondary hover:border-ink-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {isFiltered && (
          <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>
      {rangeInvalid && <p className="text-xs font-medium text-danger">“From” date is after “To” date — no expenses can match.</p>}
    </div>
  );
}
