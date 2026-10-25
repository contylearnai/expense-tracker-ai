import { describe, expect, it } from "vitest";
import { validateExpense } from "./validation";

const base = { date: "2024-05-10", amount: "25.00", category: "Food", description: "Lunch" };
const today = "2024-06-01";

describe("validateExpense", () => {
  it("accepts valid input and trims the description", () => {
    const result = validateExpense({ ...base, description: "  Lunch  " }, today);
    expect(result).toEqual({
      ok: true,
      data: { date: "2024-05-10", amountCents: 2500, category: "Food", description: "Lunch" },
    });
  });

  it("reports every invalid field", () => {
    const result = validateExpense({ date: "", amount: "0", category: "Nope", description: " " }, today);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["amount", "category", "date", "description"]);
  });

  it("rejects future dates", () => {
    const result = validateExpense({ ...base, date: "2024-06-02" }, today);
    expect(result.ok).toBe(false);
  });
});
