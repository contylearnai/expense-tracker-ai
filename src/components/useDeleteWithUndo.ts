"use client";

import { useCallback } from "react";
import { useExpenses } from "@/context/ExpensesProvider";
import { useToast } from "@/context/ToastProvider";
import type { Expense } from "@/lib/types";

/** Deletes immediately and offers Undo, which is friendlier than a confirm prompt. */
export function useDeleteWithUndo() {
  const { deleteExpense, restoreExpense } = useExpenses();
  const { showToast } = useToast();

  return useCallback(
    (expense: Expense) => {
      const removed = deleteExpense(expense.id);
      if (!removed) return;
      showToast({
        tone: "info",
        message: `Deleted “${removed.description}”.`,
        action: { label: "Undo", onClick: () => restoreExpense(removed) },
      });
    },
    [deleteExpense, restoreExpense, showToast],
  );
}
