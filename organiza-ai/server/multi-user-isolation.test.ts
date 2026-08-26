import { describe, expect, it } from "vitest";
import { buildPlannerItem } from "./routers";
import { googleAuthorizationUrl } from "./googleCalendar";

const extraction = {
  intent: "create" as const,
  title: "Consulta",
  groupName: "Família",
  kind: "appointment" as const,
  plannedAt: 1777078800000,
  durationMinutes: 60,
  targetText: null,
  notes: null,
  response: "Registrado.",
};

describe("multi-user isolation contracts", () => {
  it("keeps planner records explicitly bound to the requesting user", () => {
    const first = buildPlannerItem(101, 11, extraction, 1);
    const second = buildPlannerItem(202, 22, extraction, 2);
    expect(first?.userId).toBe(101);
    expect(second?.userId).toBe(202);
    expect(first?.userId).not.toBe(second?.userId);
    expect(first?.groupId).not.toBe(second?.groupId);
  });

  it("binds Google authorization state to the user id", () => {
    const first = googleAuthorizationUrl(101);
    const second = googleAuthorizationUrl(202);
    expect(first).toContain("state=101");
    expect(second).toContain("state=202");
    expect(first).not.toBe(second);
  });
});
