import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "./csv";

describe("escapeCsvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
  });
});
