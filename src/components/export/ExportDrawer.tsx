"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useToast } from "@/context/ToastProvider";
import { defaultFilename, formatBytes } from "@/lib/export/filename";
import { loadPreferredFormat, savePreferredFormat } from "@/lib/export/prefs";
import { describeQuery } from "@/lib/export/query";
import { EXPORT_FORMAT_ORDER, EXPORT_FORMATS } from "@/lib/export/registry";
import { runExport, saveBlob } from "@/lib/export/run";
import type { ExportOptions, ExportQuery, ExportResult, ExportSummary } from "@/lib/export/types";
import { CATEGORY_COLOR } from "@/lib/category-style";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { CATEGORIES, type Expense } from "@/lib/types";
import { Button } from "../ui";
import { ExportPreview } from "./ExportPreview";
import { useExportForm } from "./useExportForm";

type Phase =
  | { kind: "editing" }
  | { kind: "working"; step: string }
  | { kind: "done"; result: ExportResult }
  | { kind: "error"; message: string };

const RANGE_PRESETS: Array<{ label: string; range: (now: Date) => { from: string; to: string } }> = [
  { label: "All time", range: () => ({ from: "", to: "" }) },
  {
    label: "This month",
    range: (n) => ({ from: toISODate(new Date(n.getFullYear(), n.getMonth(), 1)), to: toISODate(n) }),
  },
  {
    label: "Last month",
    range: (n) => ({
      from: toISODate(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
      to: toISODate(new Date(n.getFullYear(), n.getMonth(), 0)),
    }),
  },
  {
    label: "Last 90 days",
    range: (n) => ({ from: toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 89)), to: toISODate(n) }),
  },
  { label: "Year to date", range: (n) => ({ from: `${n.getFullYear()}-01-01`, to: toISODate(n) }) },
  {
    label: "Last year",
    range: (n) => ({ from: `${n.getFullYear() - 1}-01-01`, to: `${n.getFullYear() - 1}-12-31` }),
  },
];

const FORMAT_GLYPH = { csv: "▦", json: "{ }", pdf: "▤" } as const;

/** Waits for the browser to paint, so status text is visible before heavy work starts. */
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export interface ExportDrawerProps {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  /** Pre-fill filters, e.g. from the Expenses page's current view. */
  initialQuery?: Partial<ExportQuery>;
}

export function ExportDrawer(props: ExportDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (props.open && !dialog.open) dialog.showModal();
    if (!props.open && dialog.open) dialog.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      onClose={props.onClose}
      onClick={(e) => e.target === ref.current && props.onClose()}
      aria-labelledby="export-title"
      className="export-drawer fixed inset-y-0 left-auto right-0 !m-0 h-dvh max-h-dvh w-full max-w-2xl border-l border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      {props.open && <ExportPanel {...props} />}
    </dialog>
  );
}

function ExportPanel({ onClose, expenses, initialQuery }: ExportDrawerProps) {
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const filenameId = useId();
  const [initial] = useState<ExportOptions>(() => ({
    format: loadPreferredFormat() ?? "csv",
    from: initialQuery?.from ?? "",
    to: initialQuery?.to ?? "",
    categories: initialQuery?.categories?.length ? initialQuery.categories : [...CATEGORIES],
    filename: defaultFilename(),
  }));
  const { options, dispatch, spec, issue, rows, summary, cleanName, filenameChanged } = useExportForm(expenses, initial);
  const now = new Date();
  const ctx = { query: options, summary, generatedAt: now };
  const busy = phase.kind === "working";
  const { dateRange } = describeQuery(options);
  const activePreset = RANGE_PRESETS.find((p) => {
    const r = p.range(now);
    return r.from === options.from && r.to === options.to;
  })?.label;

  const handleExport = async () => {
    try {
      setPhase({ kind: "working", step: `Collecting ${rows.length} records…` });
      await nextFrame();
      setPhase({ kind: "working", step: spec.id === "pdf" ? "Loading PDF engine & laying out report…" : `Generating ${spec.label}…` });
      await nextFrame();
      const result = await runExport(expenses, options);
      setPhase({ kind: "working", step: "Preparing download…" });
      await nextFrame();
      saveBlob(result.blob, result.filename);
      savePreferredFormat(options.format);
      setPhase({ kind: "done", result });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : "Export failed." });
    }
  };

  if (phase.kind === "done") {
    const { result } = phase;
    return (
      <div className="flex h-full flex-col">
        <PanelHeader onClose={onClose} />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success" aria-hidden>
            ✓
          </div>
          <h3 className="mt-4 text-lg font-semibold">Export complete</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            {result.count} {result.count === 1 ? "record" : "records"} saved to
          </p>
          <p className="mt-2 rounded-lg border border-line bg-page px-3 py-1.5 font-mono text-sm">{result.filename}</p>
          <p className="mt-1 text-xs text-ink-muted">{formatBytes(result.blob.size)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => saveBlob(result.blob, result.filename)}>
              Download again
            </Button>
            <Button variant="secondary" onClick={() => setPhase({ kind: "editing" })}>
              Export something else
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PanelHeader onClose={onClose} />

      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
        {/* 1. Format */}
        <Section step={1} title="Format">
          <div role="radiogroup" aria-label="Export format" className="grid gap-2 sm:grid-cols-3">
            {EXPORT_FORMAT_ORDER.map((id) => {
              const f = EXPORT_FORMATS[id];
              const selected = options.format === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => dispatch({ type: "format", format: id })}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selected ? "border-accent bg-accent/[0.07] ring-1 ring-accent" : "border-line hover:border-ink-muted"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink">
                      <span aria-hidden className="mr-1.5 text-ink-muted">
                        {FORMAT_GLYPH[id]}
                      </span>
                      {f.label}
                    </span>
                    <span
                      aria-hidden
                      className={`h-4 w-4 rounded-full border-2 ${selected ? "border-accent bg-accent shadow-[inset_0_0_0_2px_rgb(var(--surface))]" : "border-line"}`}
                    />
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-muted">{f.description}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 2. Date range */}
        <Section step={2} title="Date range" aside={dateRange}>
          <div className="flex flex-wrap gap-1.5">
            {RANGE_PRESETS.map((p) => (
              <Chip key={p.label} active={activePreset === p.label} disabled={busy} onClick={() => dispatch({ type: "range", ...p.range(now) })}>
                {p.label}
              </Chip>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <DateInput label="Start date" value={options.from} max={options.to || undefined} disabled={busy} onChange={(v) => dispatch({ type: "range", from: v, to: options.to })} />
            <DateInput label="End date" value={options.to} min={options.from || undefined} disabled={busy} onChange={(v) => dispatch({ type: "range", from: options.from, to: v })} />
          </div>
          {issue === "inverted-range" && <p className="mt-2 text-xs font-medium text-danger">Start date must be on or before the end date.</p>}
        </Section>

        {/* 3. Categories */}
        <Section
          step={3}
          title="Categories"
          aside={
            <span className="flex gap-3">
              <button type="button" disabled={busy} className="font-medium text-accent-strong hover:underline" onClick={() => dispatch({ type: "categories", categories: [...CATEGORIES] })}>
                Select all
              </button>
              <button type="button" disabled={busy} className="font-medium text-accent-strong hover:underline" onClick={() => dispatch({ type: "categories", categories: [] })}>
                Clear
              </button>
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const checked = options.categories.includes(c);
              const count = expenses.filter((e) => e.category === c).length;
              return (
                <label
                  key={c}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    checked ? "border-accent/60 bg-accent/[0.05]" : "border-line hover:border-ink-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => dispatch({ type: "toggleCategory", category: c })}
                    className="h-4 w-4 rounded accent-[rgb(var(--accent))]"
                  />
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[c] }} />
                  <span className="flex-1 text-ink">{c}</span>
                  <span className="text-xs tabular-nums text-ink-muted">{count}</span>
                </label>
              );
            })}
          </div>
          {issue === "no-categories" && <p className="mt-2 text-xs font-medium text-danger">Select at least one category.</p>}
        </Section>

        {/* 4. Filename */}
        <Section step={4} title="File name">
          <label htmlFor={filenameId} className="sr-only">
            File name
          </label>
          <div className="flex overflow-hidden rounded-lg border border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
            <input
              id={filenameId}
              value={options.filename}
              disabled={busy}
              spellCheck={false}
              onChange={(e) => dispatch({ type: "filename", filename: e.target.value })}
              placeholder={defaultFilename()}
              className="min-w-0 flex-1 bg-surface px-3 py-2 font-mono text-sm text-ink focus:outline-none"
            />
            <span className="flex items-center border-l border-line bg-page px-3 font-mono text-sm text-ink-muted">.{spec.extension}</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {!options.filename.trim() ? (
              <>
                Will save as <span className="font-mono">{defaultFilename()}.{spec.extension}</span>
              </>
            ) : filenameChanged ? (
              <>
                Unsupported characters will be replaced: <span className="font-mono text-ink-secondary">{cleanName || defaultFilename()}.{spec.extension}</span>
              </>
            ) : (
              "Letters, numbers, spaces, dashes and underscores work everywhere."
            )}
          </p>
        </Section>

        {/* Summary + preview */}
        <SummaryPanel summary={summary} issue={issue} />
        {rows.length > 0 && <ExportPreview rows={rows} spec={spec} ctx={ctx} />}

        {phase.kind === "error" && (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            Export failed: {phase.message}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-line bg-surface px-6 py-4">
        <p className="min-w-0 flex-1 truncate text-sm text-ink-secondary" aria-live="polite">
          {phase.kind === "working" ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
              {phase.step}
            </span>
          ) : rows.length ? (
            <>
              <strong className="text-ink">{rows.length}</strong> {rows.length === 1 ? "record" : "records"} ·{" "}
              <span className="tabular-nums">{formatCurrency(summary.totalCents)}</span>
            </>
          ) : (
            "Nothing to export"
          )}
        </p>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            handleExport().catch(() => showToast({ tone: "error", message: "Export failed." }));
          }}
          disabled={busy || rows.length === 0}
        >
          {busy ? "Exporting…" : `Export ${spec.label}`}
        </Button>
      </footer>
    </div>
  );
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-start justify-between border-b border-line px-6 py-4">
      <div>
        <h2 id="export-title" className="text-lg font-semibold">
          Export data
        </h2>
        <p className="text-sm text-ink-muted">Choose a format, narrow the data, and preview before you download.</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close export panel" className="rounded-md p-1 text-xl leading-none text-ink-muted hover:text-ink">
        ×
      </button>
    </header>
  );
}

function Section({ step, title, aside, children }: { step: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-page text-[11px] font-semibold text-ink-secondary ring-1 ring-line">
            {step}
          </span>
          {title}
        </h3>
        {aside && <span className="text-xs text-ink-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-ink-secondary hover:border-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
    </label>
  );
}

function SummaryPanel({ summary, issue }: { summary: ExportSummary; issue: string | null }) {
  if (issue) return null;
  if (summary.count === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
        No expenses match these filters. Widen the date range or add categories.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-page p-4">
      <h3 className="text-sm font-semibold text-ink">Export summary</h3>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Records" value={String(summary.count)} />
        <Stat label="Total" value={formatCurrency(summary.totalCents)} />
        <Stat
          label="Covers"
          value={summary.firstDate && summary.lastDate ? `${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)}` : "—"}
          small
        />
      </dl>
      {/* Composition bar: one segment per category, 2px surface gaps between segments. */}
      <div className="mt-4 flex h-2 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {summary.byCategory.map((c) => (
          <span key={c.category} style={{ flexGrow: c.totalCents, background: CATEGORY_COLOR[c.category] }} />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
        {summary.byCategory.map((c) => (
          <li key={c.category} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: CATEGORY_COLOR[c.category] }} />
            {c.category} <span className="tabular-nums text-ink-muted">{c.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 font-semibold text-ink ${small ? "text-xs leading-snug" : "truncate text-lg"}`}>{value}</dd>
    </div>
  );
}
