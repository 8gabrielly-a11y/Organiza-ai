import { describe, expect, it } from "vitest";
import { routineOccurrences } from "./routers";

describe("fixed routine occurrences", () => {
  it("creates weekday occurrences in São Paulo and starts before the commitment for the commute", () => {
    const now = Date.UTC(2026, 7, 24, 12, 0);
    const occurrences = routineOccurrences(8 * 60, 17 * 60, [1, 2, 3, 4, 5], 30, 30, now);
    expect(occurrences).toHaveLength(44);
    expect(occurrences[0]).toBe(Date.UTC(2026, 7, 24, 10, 30));
    expect(occurrences.every(value => new Date(value).getUTCHours() === 10)).toBe(true);
  });

  it("does not create occurrences on excluded days", () => {
    const now = Date.UTC(2026, 7, 24, 12, 0);
    const occurrences = routineOccurrences(6 * 60, 7 * 60, [6, 0], 0, 0, now);
    expect(occurrences).toHaveLength(16);
    expect(new Date(occurrences[0]).getUTCDay()).toBe(6);
  });
});
