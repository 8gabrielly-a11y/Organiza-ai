import { describe, expect, it } from "vitest";
import { dayBounds, formatUserDateTime, itemKindLabel, itemsForDay, monthGridDayStarts, normalizeRelativeDateHint, parseWeekdayRoutine, startOfLocalDay, startOfLocalWeek, tomorrowBounds, weekDayStarts } from "./calendar";

describe("calendar date boundaries", () => {
  const reference = new Date(2026, 7, 25, 15, 30, 0, 0).getTime();

  it("keeps tomorrow in the next local calendar day", () => {
    const today = dayBounds(reference);
    const tomorrow = tomorrowBounds(reference);
    expect(tomorrow.start).toBe(today.end);
    expect(tomorrow.end).toBeGreaterThan(tomorrow.start);
  });

  it("groups items by local day using an exclusive end boundary", () => {
    const { start, end } = dayBounds(reference);
    const items = [
      { plannedAt: start + 60_000, durationMinutes: 30, status: "planned", kind: "task" },
      { plannedAt: end, durationMinutes: 30, status: "planned", kind: "appointment" },
    ];
    expect(itemsForDay(items, reference)).toHaveLength(1);
  });

  it("parses a Monday-to-Thursday work routine with local times", () => {
    const routine = parseWeekdayRoutine("de segunda a quinta eu trabalho das 06:30 até as 16h", new Date(2026, 7, 26, 12, 0).getTime());
    expect(routine).not.toBeNull();
    expect(routine).toMatchObject({ title: "Trabalho", groupName: "Trabalho", days: [1, 2, 3, 4], startHour: 6, startMinute: 30, endHour: 16, endMinute: 0 });
    expect(routine?.occurrences.length).toBeGreaterThanOrEqual(4);
    expect(routine?.occurrences.every(timestamp => formatUserDateTime(timestamp).includes("06:30"))).toBe(true);
  });

  it("formats persisted timestamps in the user's local timezone", () => {
    expect(formatUserDateTime(Date.UTC(2026, 7, 26, 9, 40))).toContain("06:40");
  });

  it("normalizes tomorrow and its explicit time in São Paulo before persistence", () => {
    const normalized = normalizeRelativeDateHint("Amanhã às 6h40 eu tenho aula", new Date(2026, 7, 25, 6, 40).getTime(), reference);
    const expected = Date.UTC(2026, 7, 26, 9, 40);
    expect(normalized).toBe(expected);
    const tomorrow = tomorrowBounds(reference);
    expect(normalized).toBeGreaterThanOrEqual(tomorrow.start);
    expect(normalized).toBeLessThan(tomorrow.end);
  });
});

describe("calendar views", () => {
  const reference = new Date(2026, 7, 25, 15, 30, 0, 0).getTime();

  it("starts weekly planning on Monday and returns seven days", () => {
    const week = weekDayStarts(reference);
    expect(week).toHaveLength(7);
    expect(new Date(startOfLocalWeek(reference)).getDay()).toBe(1);
    expect(week[0]).toBe(startOfLocalWeek(reference));
  });

  it("returns a six-row monthly grid beginning on Monday", () => {
    const grid = monthGridDayStarts(reference);
    expect(grid).toHaveLength(42);
    expect(new Date(grid[0]).getDay()).toBe(1);
    expect(grid.every(day => day === startOfLocalDay(day))).toBe(true);
  });

  it("labels planner kinds distinctly", () => {
    expect(itemKindLabel("appointment")).toBe("Compromisso");
    expect(itemKindLabel("task")).toBe("Tarefa");
  });
});
