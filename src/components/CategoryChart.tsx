"use client";

import { useMemo, useState } from "react";
import { totalsByCategory } from "@/lib/analytics";
import { CATEGORY_COLOR } from "@/lib/category-style";
import { formatCurrency } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Card, CardHeader, EmptyState } from "./ui";

/**
 * Horizontal bars, one per category. Every row carries its own name and value,
 * so identity never depends on color alone and the chart doubles as its table.
 */
export function CategoryChart({ expenses, subtitle }: { expenses: Expense[]; subtitle: string }) {
  const totals = useMemo(() => totalsByCategory(expenses), [expenses]);
  const [hover, setHover] = useState<string | null>(null);
  const max = totals[0]?.totalCents ?? 0;

  return (
    <Card>
      <CardHeader title="Spending by category" subtitle={subtitle} />
      {max === 0 ? (
        <EmptyState title="Nothing to chart yet" description="Category totals appear once you add expenses." />
      ) : (
        <ul className="space-y-3.5">
          {totals.map((t) => (
            <li
              key={t.category}
              onMouseEnter={() => setHover(t.category)}
              onMouseLeave={() => setHover(null)}
              className="relative"
            >
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[t.category] }} />
                  {t.category}
                </span>
                <span className="tabular-nums text-ink">
                  {formatCurrency(t.totalCents)}
                  <span className="ml-2 inline-block w-10 text-right text-xs text-ink-muted">{Math.round(t.share * 100)}%</span>
                </span>
              </div>
              <div className="h-3 w-full">
                <div
                  className="h-full rounded-r transition-[width,opacity] duration-300"
                  style={{
                    width: `${max ? Math.max((t.totalCents / max) * 100, t.totalCents ? 1 : 0) : 0}%`,
                    background: CATEGORY_COLOR[t.category],
                    opacity: hover === null || hover === t.category ? 1 : 0.45,
                  }}
                />
              </div>
              {hover === t.category && (
                <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                  <p className="font-medium text-ink">{t.category}</p>
                  <p className="mt-0.5 tabular-nums text-ink-secondary">
                    {t.count} {t.count === 1 ? "expense" : "expenses"} · avg{" "}
                    {formatCurrency(t.count ? Math.round(t.totalCents / t.count) : 0)}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
