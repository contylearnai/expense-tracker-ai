import { CATEGORIES, isCategory, type Category, type Expense } from "../types";

/**
 * Snapshot links carry a read-only summary *inside the URL fragment*. Fragments are
 * never sent to a server, so a shared report needs no backend and leaks nothing to
 * hosting logs. Only aggregates are included, never individual descriptions.
 */
export interface Snapshot {
  v: 1;
  title: string;
  /** Human period label, e.g. "October 2026". */
  period: string;
  createdAt: string;
  expiresAt: string | null;
  totalCents: number;
  count: number;
  categories: Array<[Category, number, number]>; // [category, cents, count]
  months: Array<[string, number]>; // [YYYY-MM, cents]
}

export function buildSnapshot(
  expenses: Expense[],
  opts: { title: string; period: string; now: Date; expiresAt: Date | null },
): Snapshot {
  const months = new Map<string, number>();
  for (const e of expenses) months.set(e.date.slice(0, 7), (months.get(e.date.slice(0, 7)) ?? 0) + e.amountCents);
  return {
    v: 1,
    title: opts.title,
    period: opts.period,
    createdAt: opts.now.toISOString(),
    expiresAt: opts.expiresAt?.toISOString() ?? null,
    totalCents: expenses.reduce((t, e) => t + e.amountCents, 0),
    count: expenses.length,
    categories: CATEGORIES.map((c): [Category, number, number] => {
      const items = expenses.filter((e) => e.category === c);
      return [c, items.reduce((t, e) => t + e.amountCents, 0), items.length];
    }).filter(([, , n]) => n > 0),
    months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSnapshot(s: Snapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(s));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

const MAX_PAYLOAD = 20_000;

/** Decodes and strictly validates a payload. Treat everything in a URL as untrusted. */
export async function decodeSnapshot(payload: string): Promise<Snapshot | null> {
  if (!payload || payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  try {
    const bytes = await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw"));
    const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return isSnapshot(raw) ? raw : null;
  } catch {
    return null;
  }
}

const isInt = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const isShortString = (s: unknown, max = 120) => typeof s === "string" && s.length <= max;

function isSnapshot(x: unknown): x is Snapshot {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    s.v === 1 &&
    isShortString(s.title) &&
    isShortString(s.period) &&
    isShortString(s.createdAt, 40) &&
    (s.expiresAt === null || isShortString(s.expiresAt, 40)) &&
    isInt(s.totalCents) &&
    isInt(s.count) &&
    Array.isArray(s.categories) &&
    s.categories.length <= CATEGORIES.length &&
    s.categories.every((c) => Array.isArray(c) && isCategory(c[0]) && isInt(c[1]) && isInt(c[2])) &&
    Array.isArray(s.months) &&
    s.months.length <= 24 &&
    s.months.every((m) => Array.isArray(m) && typeof m[0] === "string" && /^\d{4}-\d{2}$/.test(m[0]) && isInt(m[1]))
  );
}

export function isExpired(s: Snapshot, now: Date = new Date()): boolean {
  return !!s.expiresAt && new Date(s.expiresAt).getTime() < now.getTime();
}
