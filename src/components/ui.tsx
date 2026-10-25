"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CATEGORY_COLOR, CATEGORY_ICON } from "@/lib/category-style";
import type { Category } from "@/lib/types";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong dark:hover:bg-accent/85 shadow-sm",
  secondary: "border border-line bg-surface text-ink hover:bg-page",
  ghost: "text-ink-secondary hover:bg-page hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger/90 shadow-sm",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-line/70 ${className}`} />;
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[category] }} />
      {category}
    </span>
  );
}

export function CategoryIcon({ category }: { category: Category }) {
  return (
    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-page text-lg">
      {CATEGORY_ICON[category]}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Native <dialog> gives us focus trapping, Escape-to-close and a backdrop for free. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="!m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-xl leading-none text-ink-muted hover:text-ink">
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
