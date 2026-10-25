"use client";

import { useMemo } from "react";
import { summarize } from "@/lib/analytics";
import { CATEGORY_COLOR } from "@/lib/category-style";
import { formatCurrency } from "@/lib/format";
import type { Expense } from "@/lib/types";

export function SummaryCards({ expenses }: { expenses: Expense[] }) {
  const s = useMemo(() => summarize(expenses), [expenses]);
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  const dailyAvg = Math.round(s.thisMonthCents / now.getDate());

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label={`Spent in ${monthName}`} value={formatCurrency(s.thisMonthCents)} hero>
        <MonthDelta change={s.monthChange} lastMonthCents={s.lastMonthCents} />
      </Tile>
      <Tile label="Total spending" value={formatCurrency(s.totalCents)}>
        <span className="text-ink-muted">
          {s.count} {s.count === 1 ? "expense" : "expenses"} recorded
        </span>
      </Tile>
      <Tile label="Top category" value={s.topCategory?.category ?? "—"}>
        {s.topCategory ? (
          <span className="flex items-center gap-1.5 text-ink-muted">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[s.topCategory.category] }} />
            {formatCurrency(s.topCategory.totalCents)} · {Math.round(s.topCategory.share * 100)}% of total
          </span>
        ) : (
          <span className="text-ink-muted">No expenses yet</span>
        )}
      </Tile>
      <Tile label="Daily average" value={formatCurrency(dailyAvg)}>
        <span className="text-ink-muted">This month · avg {formatCurrency(s.avgPerExpenseCents)} per expense</span>
      </Tile>
    </div>
  );
}

function Tile({ label, value, hero, children }: { label: string; value: string; hero?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${hero ? "border-accent/30 bg-accent/[0.06]" : "border-line bg-surface"}`}>
      <p className="text-sm font-medium text-ink-secondary">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <div className="mt-1.5 text-xs">{children}</div>
    </div>
  );
}

/** Spending going up is bad, so an increase shows as danger, a decrease as success. */
function MonthDelta({ change, lastMonthCents }: { change: number | null; lastMonthCents: number }) {
  if (change === null) return <span className="text-ink-muted">No spending last month to compare</span>;
  const up = change > 0;
  const pct = Math.abs(Math.round(change * 100));
  return (
    <span className="flex items-center gap-1">
      <span className={`font-semibold ${up ? "text-danger" : "text-success"}`}>
        {up ? "▲" : "▼"} {pct}%
      </span>
      <span className="text-ink-muted">vs all of last month ({formatCurrency(lastMonthCents)})</span>
    </span>
  );
}
