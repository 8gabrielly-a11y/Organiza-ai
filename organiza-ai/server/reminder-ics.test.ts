import { describe, expect, it } from "vitest";
import { selectUpcomingReminder, upcomingReminderDedupeKey } from "./reminderRoutes";
import { buildPlannerIcs } from "./ics";
import { connectionTokens, googleTitleForStatus } from "./googleCalendar";
import { decryptUserSecret } from "./profile";

describe("conversational reminders", () => {
  it("selects the nearest planned item within the reminder window", () => {
    const now = new Date("2026-08-25T10:00:00Z").getTime();
    const result = selectUpcomingReminder([
      { id: 1, title: "Depois", plannedAt: now + 80 * 60_000, status: "planned" },
      { id: 2, title: "Antes", plannedAt: now + 20 * 60_000, status: "planned" },
      { id: 3, title: "Concluído", plannedAt: now + 10 * 60_000, status: "completed" },
    ], now);
    expect(result?.id).toBe(2);
  });

  it("does not remind outside the 90-minute window", () => {
    const now = Date.now();
    expect(selectUpcomingReminder([{ id: 1, title: "Mais tarde", plannedAt: now + 91 * 60_000, status: "planned" }], now)).toBeUndefined();
  });

  it("deduplicates by planner item and planned time", () => {
    expect(upcomingReminderDedupeKey(10, 1000)).toBe("upcoming:10:1000");
    expect(upcomingReminderDedupeKey(11, 1000)).not.toBe(upcomingReminderDedupeKey(10, 1000));
    expect(upcomingReminderDedupeKey(10, 2000)).not.toBe(upcomingReminderDedupeKey(10, 1000));
  });
});

describe("Google Calendar status mapping", () => {
  it("encrypts access and refresh tokens independently", () => {
    const tokens = connectionTokens("access-a", "refresh-a", 3600);
    expect(tokens.accessTokenEncrypted).not.toContain("access-a");
    expect(tokens.refreshTokenEncrypted).not.toContain("refresh-a");
    expect(decryptUserSecret(tokens.accessTokenEncrypted)).toBe("access-a");
    expect(decryptUserSecret(tokens.refreshTokenEncrypted!)).toBe("refresh-a");
  });
  it("keeps completed events visible with a completed marker", () => {
    expect(googleTitleForStatus("Estudar", "completed")).toBe("✓ Estudar");
    expect(googleTitleForStatus("Estudar", "skipped")).toBe("Estudar");
  });
});

describe("ICS calendar feed", () => {
  it("escapes event text and excludes skipped items", () => {
    const ics = buildPlannerIcs([
      { id: 1, title: "Reunião, sala 2", notes: "Pauta; revisão", plannedAt: Date.parse("2026-08-25T12:00:00Z"), durationMinutes: 30, status: "planned" },
      { id: 2, title: "Não realizado", plannedAt: Date.parse("2026-08-25T13:00:00Z"), durationMinutes: 30, status: "skipped" },
    ]);
    expect(ics).toContain("SUMMARY:Reunião\\, sala 2");
    expect(ics).toContain("DESCRIPTION:\\nPauta\\; revisão");
    expect(ics).not.toContain("Não realizado");
  });
});
