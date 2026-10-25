"use client";

import type { ReactNode } from "react";
import { CloudProvider } from "@/context/CloudProvider";
import { ExpenseDialogProvider } from "@/context/ExpenseDialogProvider";
import { ExpensesProvider } from "@/context/ExpensesProvider";
import { ToastProvider } from "@/context/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <CloudProvider>
          <ExpenseDialogProvider>{children}</ExpenseDialogProvider>
        </CloudProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
