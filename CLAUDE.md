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
- **Share & Export** (`/exports`) is a cloud-style export hub. Third-party integrations are **simulated** (no network calls). Keep the "Simulated" labelling honest when touching it.
  - `src/lib/cloud/` holds pure logic: `templates.ts` (Tax Report, Monthly Summary, Category Analysis, Full Backup → `ExportArtifact`), `destinations.ts` (catalog and fake job stages), `schedule.ts` (`computeNextRun`), `snapshot.ts` (share links).
  - `CloudProvider` (inside `ExpensesProvider`) owns connections, schedules, history and shares in localStorage (`expense-tracker:cloud-v1`). It also holds in-memory background `jobs`, a client-side scheduler that runs due schedules and catches up on missed ones (deduped per slot), and debounced live sync on expense changes.
  - **Share links are real.** The summary is deflate-compressed into the URL fragment (`/shared#s=…`), so no server is involved. That means links can't be revoked, and expiry is advisory. `decodeSnapshot` validates strictly because the payload is untrusted. Only aggregates go into a snapshot, never descriptions.

## Conventions that aren't obvious

- **Money is integer cents** (`amountCents`). Parse user input with `parseAmountToCents` and display with `formatCurrency`. Never store floats.
- **Dates are `YYYY-MM-DD` strings**, compared lexically. Use `parseISODate`/`toISODate` from `lib/format.ts`. `new Date("YYYY-MM-DD")` parses as UTC and shifts the day in western time zones.
- **Colors are CSS variables** in `src/app/globals.css`, exposed as Tailwind tokens (`bg-surface`, `text-ink-muted`, `bg-accent`, …), with dark mode via `prefers-color-scheme`. Use the tokens, not raw Tailwind palette colors.
- **Category colors** (`--cat-*`, mapped in `lib/category-style.ts`) are a fixed-order, colorblind-validated palette. Keep each category's color stable and don't reorder them. Chart text uses ink tokens, never the category color.
- CSV export guards against spreadsheet formula injection in `escapeCsvCell`. Keep that when changing the export.
- `Modal` ignores `close` events from nested dialogs (React propagates them up the tree). Without that, closing the Connect dialog would also close the dialog that opened it.
- A `<dialog>` inside a `space-y-*` container picks up a top margin from it, which is why `Modal` forces `!m-auto`.
- Adding a category: update `CATEGORIES` in `lib/types.ts` plus the matching entries in `lib/category-style.ts` and `globals.css`.

## Code style

2-space indentation; prefer `async/await` over `.then()` chains.
