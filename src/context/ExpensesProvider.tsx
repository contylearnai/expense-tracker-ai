"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { createId, loadExpenses, saveExpenses } from "@/lib/storage";
import type { Expense, ExpenseInput } from "@/lib/types";

type Status = "loading" | "ready" | "error";

type Action =
  | { type: "load"; expenses: Expense[] }
  | { type: "add"; expense: Expense }
  | { type: "update"; id: string; input: ExpenseInput; updatedAt: string }
  | { type: "delete"; id: string }
  | { type: "restore"; expense: Expense }
  | { type: "replaceAll"; expenses: Expense[] };

function reducer(state: Expense[], action: Action): Expense[] {
  switch (action.type) {
    case "load":
    case "replaceAll":
      return action.expenses;
    case "add":
    case "restore":
      return [...state, action.expense];
    case "update":
      return state.map((e) => (e.id === action.id ? { ...e, ...action.input, updatedAt: action.updatedAt } : e));
    case "delete":
      return state.filter((e) => e.id !== action.id);
  }
}

interface ExpensesContextValue {
  expenses: Expense[];
  status: Status;
  storageError: string | null;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  replaceAll: (expenses: Expense[]) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, dispatch] = useReducer(reducer, []);
  const [status, setStatus] = useState<Status>("loading");
  const [storageError, setStorageError] = useState<string | null>(null);
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  // localStorage only exists in the browser, so load after mount.
  useEffect(() => {
    try {
      dispatch({ type: "load", expenses: loadExpenses() });
      setStatus("ready");
    } catch {
      setStatus("error");
      setStorageError("Your browser blocked local storage, so expenses can't be saved.");
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    try {
      saveExpenses(expenses);
      setStorageError(null);
    } catch {
      setStorageError("Couldn't save your changes. Local storage may be full or disabled.");
    }
  }, [expenses, status]);

  // Keep tabs in sync when another tab edits the same data.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      try {
        dispatch({ type: "load", expenses: loadExpenses() });
      } catch {
        // Ignore: the next local save will surface any problem.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addExpense = useCallback((input: ExpenseInput) => {
    const now = new Date().toISOString();
    const expense: Expense = { ...input, id: createId(), createdAt: now, updatedAt: now };
    dispatch({ type: "add", expense });
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    dispatch({ type: "update", id, input, updatedAt: new Date().toISOString() });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    const existing = expensesRef.current.find((e) => e.id === id);
    dispatch({ type: "delete", id });
    return existing;
  }, []);

  const restoreExpense = useCallback((expense: Expense) => dispatch({ type: "restore", expense }), []);
  const replaceAll = useCallback((next: Expense[]) => dispatch({ type: "replaceAll", expenses: next }), []);

  const value = useMemo(
    () => ({ expenses, status, storageError, addExpense, updateExpense, deleteExpense, restoreExpense, replaceAll }),
    [expenses, status, storageError, addExpense, updateExpense, deleteExpense, restoreExpense, replaceAll],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used inside <ExpensesProvider>");
  return ctx;
}
