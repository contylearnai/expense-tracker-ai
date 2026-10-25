import { describe, expect, it } from "vitest";
import { niceTicks } from "./chart";

describe("niceTicks", () => {
  it("produces clean ticks covering the max", () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(950)).toEqual([0, 250, 500, 750, 1000]);
    const t = niceTicks(123456);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(123456);
  });
});
