"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CategoryChart } from "@/components/CategoryChart";
import { ExpenseFiltersBar } from "@/components/ExpenseFilters";
import { ExpenseList } from "@/components/ExpenseList";
import { Button, Card, EmptyState, Modal, Spinner } from "@/components/ui";
import { useDeleteWithUndo } from "@/components/useDeleteWithUndo";
import { useExpenseDialog } from "@/context/ExpenseDialogProvider";
import { useExpenses } from "@/context/ExpensesProvider";
import { useToast } from "@/context/ToastProvider";
import { filterExpenses, sortExpenses, sumCents } from "@/lib/analytics";
import { downloadCsv, expensesToCsv } from "@/lib/csv";
import { formatCurrency, todayISO } from "@/lib/format";
import { EMPTY_FILTERS, type ExpenseFilters, type SortKey } from "@/lib/types";

const PAGE_SIZE = 25;

export default function ExpensesPage() {
  const { expenses, status, replaceAll } = useExpenses();
  const { openAdd, openEdit } = useExpenseDialog();
  const { showToast } = useToast();
  const handleDelete = useDeleteWithUndo();

  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirmClear, setConfirmClear] = useState(false);
  const deferredFilters = useDeferredValue(filters);

  const filtered = useMemo(
    () => sortExpenses(filterExpenses(expenses, deferredFilters), sort),
    [expenses, deferredFilters, sort],
  );
  const total = sumCents(filtered);
  const isFiltered = filtered.length !== expenses.length;

  const changeFilters = (next: ExpenseFilters) => {
    setFilters(next);
    setVisible(PAGE_SIZE);
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      showToast({ tone: "error", message: "Nothing to export — no expenses match the current filters." });
      return;
    }
    downloadCsv(expensesToCsv(filtered), `expenses-${todayISO()}.csv`);
    showToast({ tone: "success", message: `Exported ${filtered.length} ${filtered.length === 1 ? "expense" : "expenses"} to CSV.` });
  };

  const clearAll = () => {
    const backup = expenses;
    replaceAll([]);
    setConfirmClear(false);
    showToast({ tone: "info", message: "All expenses deleted.", action: { label: "Undo", onClick: () => replaceAll(backup) } });
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading expenses…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-ink-muted">Search, filter, edit and export your expenses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={expenses.length === 0}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M10 3a1 1 0 011 1v7.6l2.3-2.3 1.4 1.4L10 15.4l-4.7-4.7 1.4-1.4L9 11.6V4a1 1 0 011-1zM4 16h12v2H4z" />
            </svg>
            Export CSV
          </Button>
          {expenses.length > 0 && (
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <EmptyState
            title="No expenses yet"
            description="Expenses you add will show up here, where you can search, filter, edit and export them."
            action={<Button onClick={openAdd}>Add expense</Button>}
          />
        </Card>
      ) : (
        <>
          <Card>
            <ExpenseFiltersBar filters={filters} onChange={changeFilters} sort={sort} onSortChange={setSort} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <p className="text-sm text-ink-secondary">
                  {isFiltered ? (
                    <>
                      Showing <strong className="text-ink">{filtered.length}</strong> of {expenses.length} expenses
                    </>
                  ) : (
                    <>
                      <strong className="text-ink">{expenses.length}</strong> expenses
                    </>
                  )}
                </p>
                <p className="text-sm text-ink-secondary">
                  Total <strong className="tabular-nums text-ink">{formatCurrency(total)}</strong>
                </p>
              </div>
              {filtered.length === 0 ? (
                <div className="pt-4">
                  <EmptyState
                    title="No matching expenses"
                    description="Try a different search term, category, or date range."
                    action={
                      <Button variant="secondary" onClick={() => changeFilters(EMPTY_FILTERS)}>
                        Clear filters
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  <ExpenseList expenses={filtered.slice(0, visible)} onEdit={openEdit} onDelete={handleDelete} />
                  {visible < filtered.length && (
                    <div className="pt-4 text-center">
                      <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                        Show more ({filtered.length - visible} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
            <div>
              <CategoryChart expenses={filtered} subtitle={isFiltered ? "Matching current filters" : "All expenses"} />
            </div>
          </div>
        </>
      )}

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Delete all expenses?">
        <p className="text-sm text-ink-secondary">
          This removes all {expenses.length} expenses from this browser. You can undo right after, but consider exporting a CSV
          backup first.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={clearAll}>
            Delete all
          </Button>
        </div>
      </Modal>
    </div>
  );
}
