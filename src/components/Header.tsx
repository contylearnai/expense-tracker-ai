"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseDialog } from "@/context/ExpenseDialogProvider";
import { SyncIndicator } from "./cloud/SyncIndicator";
import { Button } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", short: "Home" },
  { href: "/expenses", label: "Expenses", short: "Expenses" },
  { href: "/exports", label: "Share & Export", short: "Share" },
];

export function Header() {
  const pathname = usePathname();
  const { openAdd } = useExpenseDialog();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            $
          </span>
          <span className="hidden sm:inline">Spendwise</span>
        </Link>
        <nav aria-label="Main" className="flex gap-0.5 sm:gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
                  active ? "bg-page text-ink" : "text-ink-secondary hover:text-ink"
                }`}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SyncIndicator />
          <Button onClick={openAdd}>
            <span aria-hidden className="text-base leading-none">+</span>
            <span>
              Add<span className="hidden sm:inline"> expense</span>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
