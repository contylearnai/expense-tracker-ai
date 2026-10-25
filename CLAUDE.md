# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build (also runs lint + type checks)
npm start            # serve the production build
npm run lint         # next lint (eslint-config-next)
npm run typecheck    # tsc --noEmit
npm test             # vitest, all unit tests
npx vitest run src/lib/csv.test.ts         # single test file
npx vitest run -t "neutralizes spreadsheet" # single test by name
```

## Architecture

Next.js 14 App Router + TypeScript + Tailwind 3. Client-only app: there is no backend, and all data lives in `localStorage` under the key `expense-tracker:v1`.

- **`src/lib/`** holds pure, framework-free logic, and it's the only layer with unit tests (`*.test.ts` next to each module). Keep business logic here so it stays testable. Covers types, money/date formatting, validation, filtering/aggregation (`analytics.ts`), CSV export, storage, chart tick math, and sample data.
- **`src/context/`** has three nested providers, wired together in `src/components/Providers.tsx` (order matters: Toast → Expenses → ExpenseDialog):
  - `ExpensesProvider` is the single source of truth (a `useReducer`). It loads from localStorage *after mount*, so `status` starts as `"loading"` and pages must render a loading state first. It persists on every change and syncs across tabs via the `storage` event.
  - `ExpenseDialogProvider` owns the one add/edit modal. Any component opens it with `useExpenseDialog().openAdd()` / `openEdit(expense)` instead of rendering its own form.
  - `ToastProvider` gives `showToast({ tone, message, action? })`. Deletes use an Undo toast action (`useDeleteWithUndo`) rather than a confirm dialog.
- **Pages** (`src/app/page.tsx` dashboard, `src/app/expenses/page.tsx` list) are client components that read from these contexts.
- **Export** (`src/lib/export/`) is a format registry. Each format in `formats/` is an `ExportFormatSpec` with an async `build(rows, ctx) → Blob`, and `run.ts` handles filtering, summary and filename sanitizing for all of them. To add a format, write a spec and register it in `registry.ts`. The UI is `components/export/ExportDrawer.tsx` (derived state lives in `useExportForm`), opened from the dashboard and from the Expenses page, which pre-fills its current filters. The PDF format dynamically imports `jspdf`/`jspdf-autotable` so they stay out of the main bundle. Keep it that way, and keep jsPDF ≥ 4.2.1 (older versions have critical advisories).

## Conventions that aren't obvious

- **Money is integer cents** (`amountCents`). Parse user input with `parseAmountToCents` and display with `formatCurrency`. Never store floats.
- **Dates are `YYYY-MM-DD` strings**, compared lexically. Use `parseISODate`/`toISODate` from `lib/format.ts`. `new Date("YYYY-MM-DD")` parses as UTC and shifts the day in western time zones.
- **Colors are CSS variables** in `src/app/globals.css`, exposed as Tailwind tokens (`bg-surface`, `text-ink-muted`, `bg-accent`, …), with dark mode via `prefers-color-scheme`. Use the tokens, not raw Tailwind palette colors.
- **Category colors** (`--cat-*`, mapped in `lib/category-style.ts`) are a fixed-order, colorblind-validated palette. Keep each category's color stable and don't reorder them. Chart text uses ink tokens, never the category color.
- CSV export guards against spreadsheet formula injection in `escapeCsvCell`. Keep that when changing the export.
- PDF text goes through `toPdfText`, because jsPDF's built-in Helvetica only covers Latin-1. Emoji and other scripts become `?`.
- A `<dialog>` placed inside a `space-y-*` container picks up a margin from it. That's why `Modal`/`ExportDrawer` force `!m-auto`/`!m-0`.
- Adding a category: update `CATEGORIES` in `lib/types.ts` plus the matching entries in `lib/category-style.ts` and `globals.css`.

## Code style

2-space indentation; prefer `async/await` over `.then()` chains.
