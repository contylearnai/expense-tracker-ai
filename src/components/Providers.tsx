"use client";

import type { ReactNode } from "react";
import { ExpenseDialogProvider } from "@/context/ExpenseDialogProvider";
import { ExpensesProvider } from "@/context/ExpensesProvider";
import { ToastProvider } from "@/context/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseDialogProvider>{children}</ExpenseDialogProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
