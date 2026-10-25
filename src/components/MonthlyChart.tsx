"use client";

import { useMemo, useState } from "react";
import { totalsByMonth } from "@/lib/analytics";
import { niceTicks } from "@/lib/chart";
import { formatCompactCurrency, formatCurrency, formatMonthKey } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Card, CardHeader } from "./ui";
import { useElementWidth } from "./useElementWidth";

const HEIGHT = 220;
const PAD = { top: 24, right: 8, bottom: 28, left: 48 };
const MAX_BAR = 24;
const RADIUS = 4;

/** Column path with a rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function MonthlyChart({ expenses }: { expenses: Expense[] }) {
  const [range, setRange] = useState<6 | 12>(6);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [ref, width] = useElementWidth<HTMLDivElement>();

  const data = useMemo(() => totalsByMonth(expenses, range), [expenses, range]);
  const max = Math.max(...data.map((d) => d.totalCents));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.min(MAX_BAR, band * 0.6);
  const yOf = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const peakIndex = max > 0 ? data.findIndex((d) => d.totalCents === max) : -1;
  const hovered = hover !== null ? data[hover] : null;

  return (
    <Card>
      <CardHeader
        title="Monthly spending"
        subtitle={`Total spent per month, last ${range} months`}
        action={
          <div role="group" aria-label="Time range" className="flex rounded-lg border border-line p-0.5 text-xs font-medium">
            {([6, 12] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 ${range === r ? "bg-accent text-white" : "text-ink-secondary hover:text-ink"}`}
              >
                {r}M
              </button>
            ))}
          </div>
        }
      />

      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={`Column chart of monthly spending over the last ${range} months`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="var(--chart-grid)" strokeWidth={1} />
                <text x={PAD.left - 8} y={yOf(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
                  {formatCompactCurrency(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = PAD.left + band * i + (band - barW) / 2;
              const h = (d.totalCents / top) * plotH;
              const y = PAD.top + plotH - h;
              const showLabel = i === peakIndex || i === data.length - 1;
              const showTick = range === 6 || i % 2 === data.length % 2 || width > 520;
              return (
                <g key={d.key}>
                  {h > 0 && (
                    <path
                      d={columnPath(x, y, barW, h)}
                      fill="rgb(var(--accent))"
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )}
                  {showLabel && d.totalCents > 0 && (
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="fill-ink-secondary text-[11px] font-medium tabular-nums">
                      {formatCompactCurrency(d.totalCents)}
                    </text>
                  )}
                  {showTick && (
                    <text x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                      {formatMonthKey(d.key)}
                    </text>
                  )}
                  {/* Hit target spans the whole band, larger than the mark. */}
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    aria-label={`${formatMonthKey(d.key, "long")}: ${formatCurrency(d.totalCents)}`}
                    className="cursor-default outline-none"
                  />
                </g>
              );
            })}
          </svg>
        )}
        {!width && <div style={{ height: HEIGHT }} />}

        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(PAD.left + band * hover + band / 2, 70), width - 70),
              top: 0,
            }}
          >
            <p className="font-medium text-ink">{formatMonthKey(hovered.key, "long")}</p>
            <p className="mt-0.5 tabular-nums text-ink-secondary">
              {formatCurrency(hovered.totalCents)} · {hovered.count} {hovered.count === 1 ? "expense" : "expenses"}
            </p>
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowTable((s) => !s)} className="mt-2 text-xs font-medium text-accent-strong hover:underline">
        {showTable ? "Hide table" : "Show as table"}
      </button>
      {showTable && (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted">
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 text-right font-medium">Expenses</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.key} className="border-t border-line">
                <td className="py-1.5 text-ink-secondary">{formatMonthKey(d.key, "long")}</td>
                <td className="py-1.5 text-right text-ink-secondary">{d.count}</td>
                <td className="py-1.5 text-right text-ink">{formatCurrency(d.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
