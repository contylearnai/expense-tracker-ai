"use client";

import { useExpenses } from "@/context/ExpensesProvider";

export function StorageBanner() {
  const { storageError } = useExpenses();
  if (!storageError) return null;
  return (
    <div role="alert" className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm font-medium text-danger">
      {storageError}
    </div>
  );
}
