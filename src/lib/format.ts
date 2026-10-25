const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(cents: number): string {
  return currency.format(cents / 100);
}

/** $1.2K-style labels for chart axes. */
export function formatCompactCurrency(cents: number): string {
  return cents / 100 < 1000 ? currency.format(Math.round(cents / 100)).replace(/\.00$/, "") : compactCurrency.format(cents / 100);
}

/** Parses a user-typed amount ("12", "12.5", "$1,234.56") into integer cents, or null if invalid. */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Today's local date as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses YYYY-MM-DD as a local date (new Date("2024-01-01") would be UTC midnight). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthKey(key: string, style: "short" | "long" = "short"): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
  });
}
