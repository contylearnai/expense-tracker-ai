import { describe, expect, it } from "vitest";
import { formatCurrency, parseAmountToCents, parseISODate, toISODate } from "./format";

describe("parseAmountToCents", () => {
  it("parses whole and decimal amounts without float error", () => {
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("0.29")).toBe(29);
    expect(parseAmountToCents("$1,234.56")).toBe(123456);
  });

  it("rejects invalid input", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("1.234")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("1e3")).toBeNull();
  });
});

describe("dates", () => {
  it("round-trips ISO dates in local time", () => {
    expect(toISODate(parseISODate("2024-03-01"))).toBe("2024-03-01");
  });
});

describe("formatCurrency", () => {
  it("formats cents as USD", () => {
    expect(formatCurrency(123456)).toBe("$1,234.56");
  });
});
