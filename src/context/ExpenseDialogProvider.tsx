"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Modal } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";
import { useExpenses } from "./ExpensesProvider";
import { useToast } from "./ToastProvider";

interface ExpenseDialogContextValue {
  openAdd: () => void;
  openEdit: (expense: Expense) => void;
}

const ExpenseDialogContext = createContext<ExpenseDialogContextValue | null>(null);

type DialogState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; expense: Expense };

export function ExpenseDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ mode: "closed" });
  const { addExpense, updateExpense } = useExpenses();
  const { showToast } = useToast();

  const openAdd = useCallback(() => setState({ mode: "add" }), []);
  const openEdit = useCallback((expense: Expense) => setState({ mode: "edit", expense }), []);
  const close = useCallback(() => setState({ mode: "closed" }), []);

  const handleSubmit = (input: ExpenseInput) => {
    if (state.mode === "edit") {
      updateExpense(state.expense.id, input);
      showToast({ tone: "success", message: "Expense updated." });
    } else {
      addExpense(input);
      showToast({ tone: "success", message: `Added ${formatCurrency(input.amountCents)} for ${input.category}.` });
    }
    close();
  };

  return (
    <ExpenseDialogContext.Provider value={{ openAdd, openEdit }}>
      {children}
      <Modal open={state.mode !== "closed"} onClose={close} title={state.mode === "edit" ? "Edit expense" : "Add expense"}>
        <ExpenseForm
          key={state.mode === "edit" ? state.expense.id : state.mode}
          initial={state.mode === "edit" ? state.expense : undefined}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </Modal>
    </ExpenseDialogContext.Provider>
  );
}

export function useExpenseDialog(): ExpenseDialogContextValue {
  const ctx = useContext(ExpenseDialogContext);
  if (!ctx) throw new Error("useExpenseDialog must be used inside <ExpenseDialogProvider>");
  return ctx;
}
