import { describe, expect, it } from "vitest";
import { escapeCsvCell, expensesToCsv } from "./csv";

describe("CSV export", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("writes a header and one row per expense", () => {
    const csv = expensesToCsv([
      {
        id: "1",
        date: "2024-05-01",
        amountCents: 1234,
        category: "Food",
        description: "Lunch",
        createdAt: "",
        updatedAt: "",
      },
    ]);
    expect(csv).toBe("Date,Category,Description,Amount\r\n2024-05-01,Food,Lunch,12.34");
  });
});
