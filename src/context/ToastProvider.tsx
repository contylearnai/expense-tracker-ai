"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);

  const icon = toast.tone === "success" ? "✓" : toast.tone === "error" ? "!" : "i";
  const iconClass =
    toast.tone === "success" ? "bg-success text-white" : toast.tone === "error" ? "bg-danger text-white" : "bg-accent text-white";

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg"
    >
      <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${iconClass}`}>
        {icon}
      </span>
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="rounded-md px-2 py-1 font-semibold text-accent-strong hover:bg-accent/10"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss" className="rounded-md p-1 text-ink-muted hover:text-ink">
        ×
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
