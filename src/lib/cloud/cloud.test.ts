import { describe, expect, it } from "vitest";
import type { Expense } from "../types";
import { parseRecipients } from "./format";
import { computeNextRun, describeTiming } from "./schedule";
import { buildSnapshot, decodeSnapshot, encodeSnapshot, isExpired } from "./snapshot";
import { BACKUP_FORMAT, defaultParams, TEMPLATES } from "./templates";

function exp(p: Partial<Expense>): Expense {
  return {
    id: p.id ?? Math.random().toString(36),
    date: "2026-05-01",
    amountCents: 1000,
    category: "Food",
    description: "Item",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...p,
  };
}

const now = new Date(2026, 9, 25, 10, 0); // Sun Oct 25 2026, 10:00
const data = [
  exp({ date: "2025-03-02", amountCents: 12000, category: "Bills", description: "Electric" }),
  exp({ date: "2025-07-10", amountCents: 4500, category: "Food", description: "Groceries" }),
  exp({ date: "2025-07-11", amountCents: 500, category: "Food", description: "=cmd()" }),
  exp({ date: "2026-09-05", amountCents: 2000, category: "Food", description: "Lunch" }),
  exp({ date: "2026-10-03", amountCents: 3000, category: "Food", description: "Dinner" }),
  exp({ date: "2026-10-04", amountCents: 1000, category: "Shopping", description: "Socks" }),
];

describe("templates", () => {
  it("tax report itemizes one year with subtotals and escapes formulas", () => {
    const a = TEMPLATES["tax-report"].build(data, { year: 2025 }, now);
    expect(a.filename).toBe("tax-report-2025.csv");
    expect(a.records).toBe(3);
    expect(a.table.rows.map((r) => r[0])).toEqual(["Food", "Food", "Food subtotal", "Bills", "Bills subtotal", "TOTAL"]);
    expect(a.table.rows.at(-1)?.[3]).toBe("170.00");
    expect(a.content).toContain("'=cmd()");
  });

  it("monthly summary compares with the previous month", () => {
    const a = TEMPLATES["monthly-summary"].build(data, { month: "2026-10" }, now);
    expect(a.table.rows[0]).toEqual(["Food", "1", "30.00", "75.0%", "+50%"]);
    expect(a.table.rows[1]).toEqual(["Shopping", "1", "10.00", "25.0%", "new"]);
    expect(a.table.rows.at(-1)).toEqual(["TOTAL", "2", "40.00", "100.0%", "+100%"]);
  });

  it("category analysis pivots the trailing 12 months", () => {
    const a = TEMPLATES["category-analysis"].build(data, {}, now);
    expect(a.table.columns).toHaveLength(1 + 12 + 3);
    expect(a.records).toBe(3);
    const food = a.table.rows.find((r) => r[0] === "Food")!;
    expect(food.at(-3)).toBe("50.00");
  });

  it("full backup is versioned JSON with every expense", () => {
    const a = TEMPLATES["full-backup"].build(data, {}, now);
    const doc = JSON.parse(a.content);
    expect(doc).toMatchObject({ format: BACKUP_FORMAT, version: 1, count: 6 });
  });

  it("defaults the tax year to last year early in the year", () => {
    expect(defaultParams("tax-report", new Date(2026, 1, 1))).toEqual({ year: 2025 });
    expect(defaultParams("tax-report", now)).toEqual({ year: 2026 });
  });
});

describe("computeNextRun", () => {
  const t = (frequency: "daily" | "weekly" | "monthly", time: string, extra = {}) => ({
    frequency,
    time,
    weekday: 1,
    monthDay: 1,
    ...extra,
  });

  it("daily: later today, else tomorrow", () => {
    expect(computeNextRun(t("daily", "18:00"), now)).toEqual(new Date(2026, 9, 25, 18, 0));
    expect(computeNextRun(t("daily", "09:00"), now)).toEqual(new Date(2026, 9, 26, 9, 0));
  });

  it("weekly: next matching weekday", () => {
    expect(computeNextRun(t("weekly", "09:00", { weekday: 1 }), now)).toEqual(new Date(2026, 9, 26, 9, 0));
    expect(computeNextRun(t("weekly", "09:00", { weekday: 0 }), now)).toEqual(new Date(2026, 10, 1, 9, 0));
  });

  it("monthly: rolls into next month (and year)", () => {
    expect(computeNextRun(t("monthly", "09:00", { monthDay: 1 }), now)).toEqual(new Date(2026, 10, 1, 9, 0));
    expect(computeNextRun(t("monthly", "09:00", { monthDay: 28 }), now)).toEqual(new Date(2026, 9, 28, 9, 0));
    expect(computeNextRun(t("monthly", "09:00", { monthDay: 5 }), new Date(2026, 11, 20))).toEqual(new Date(2027, 0, 5, 9, 0));
  });

  it("describes timings", () => {
    expect(describeTiming(t("monthly", "09:30", { monthDay: 2 }))).toBe("On the 2nd of every month at 9:30 AM");
  });
});

describe("snapshot links", () => {
  it("round-trips through a compact URL-safe payload with aggregates only", async () => {
    const snap = buildSnapshot(data, { title: "All time", period: "All time", now, expiresAt: null });
    const payload = await encodeSnapshot(snap);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeSnapshot(payload)).toEqual(snap);
    expect(JSON.stringify(snap)).not.toContain("Groceries");
  });

  it("rejects tampered or malformed payloads", async () => {
    expect(await decodeSnapshot("not base64!")).toBeNull();
    expect(await decodeSnapshot("AAAA")).toBeNull();
    const evil = await encodeSnapshot({ v: 1, title: "x", totalCents: -5 } as never);
    expect(await decodeSnapshot(evil)).toBeNull();
  });

  it("honours expiry", () => {
    const snap = buildSnapshot(data, { title: "t", period: "p", now, expiresAt: new Date(2026, 9, 26) });
    expect(isExpired(snap, now)).toBe(false);
    expect(isExpired(snap, new Date(2026, 9, 27))).toBe(true);
  });
});

describe("parseRecipients", () => {
  it("splits valid and invalid addresses", () => {
    expect(parseRecipients("a@x.com, bad; c@y.org")).toEqual({ valid: ["a@x.com", "c@y.org"], invalid: ["bad"] });
  });
});
