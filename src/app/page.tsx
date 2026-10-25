"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryChart } from "@/components/CategoryChart";
import { ExpenseList } from "@/components/ExpenseList";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ExportDrawer } from "@/components/export/ExportDrawer";
import { SummaryCards } from "@/components/SummaryCards";
import { Button, Card, CardHeader, EmptyState, Skeleton } from "@/components/ui";
import { useDeleteWithUndo } from "@/components/useDeleteWithUndo";
import { useExpenseDialog } from "@/context/ExpenseDialogProvider";
import { useExpenses } from "@/context/ExpensesProvider";
import { useToast } from "@/context/ToastProvider";
import { sortExpenses } from "@/lib/analytics";
import { generateSampleExpenses } from "@/lib/sample-data";

export default function DashboardPage() {
  const { expenses, status, replaceAll } = useExpenses();
  const { openAdd, openEdit } = useExpenseDialog();
  const { showToast } = useToast();
  const handleDelete = useDeleteWithUndo();
  const recent = useMemo(() => sortExpenses(expenses, "date-desc").slice(0, 6), [expenses]);
  const [exportOpen, setExportOpen] = useState(false);

  if (status === "loading") return <DashboardSkeleton />;

  const loadSample = () => {
    replaceAll(generateSampleExpenses());
    showToast({ tone: "success", message: "Loaded sample data. Clear it anytime from the Expenses page." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-ink-muted">An overview of where your money goes.</p>
        </div>
        {expenses.length > 0 && (
          <Button variant="secondary" onClick={() => setExportOpen(true)}>
            <ExportIcon />
            Export…
          </Button>
        )}
      </div>
      <ExportDrawer open={exportOpen} onClose={() => setExportOpen(false)} expenses={expenses} />

      {expenses.length === 0 ? (
        <Card>
          <EmptyState
            title="Welcome! You haven't added any expenses yet."
            description="Add your first expense to see summaries and charts, or load sample data to explore the app."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openAdd}>Add your first expense</Button>
                <Button variant="secondary" onClick={loadSample}>
                  Load sample data
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <SummaryCards expenses={expenses} />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MonthlyChart expenses={expenses} />
            </div>
            <div className="lg:col-span-2">
              <CategoryChart expenses={expenses} subtitle="All time" />
            </div>
          </div>
          <Card>
            <CardHeader
              title="Recent expenses"
              action={
                <Link href="/expenses" className="text-sm font-medium text-accent-strong hover:underline">
                  View all →
                </Link>
              }
            />
            <ExpenseList expenses={recent} onEdit={openEdit} onDelete={handleDelete} />
          </Card>
        </>
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M10 3a1 1 0 011 1v7.6l2.3-2.3 1.4 1.4L10 15.4l-4.7-4.7 1.4-1.4L9 11.6V4a1 1 0 011-1zM4 16h12v2H4z" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 lg:col-span-3" />
        <Skeleton className="h-72 lg:col-span-2" />
      </div>
    </div>
  );
}
