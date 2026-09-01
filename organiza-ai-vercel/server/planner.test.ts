import { describe, expect, it, vi } from "vitest";
import { tomorrowBounds } from "@shared/calendar";
import { buildChildTaskItem, buildPlannerItem, creationAssistantResponse, findPlannerConflicts, nextAvailable, parseExtraction, persistPlannerCreation, statusForIntent } from "./routers";

describe("planner rescheduling", () => {
  it("moves an item to the next useful hour", () => {
    const original = new Date("2026-08-25T14:20:00-03:00").getTime();
    const planned = new Date(nextAvailable(original));
    expect(planned.getTime()).toBeGreaterThan(original);
    expect(planned.getMinutes()).toBe(0);
    expect(planned.getHours()).toBe(15);
  });

  it("skips an occupied slot", () => {
    const original = new Date("2026-08-25T14:20:00-03:00").getTime();
    const firstSlot = nextAvailable(original);
    const planned = nextAvailable(original, [{ plannedAt: firstSlot, durationMinutes: 60, status: "planned" }]);
    expect(planned).toBe(firstSlot + 60 * 60000);
  });

  it("reserves the full duration of a long item", () => {
    const original = new Date("2026-08-25T14:20:00-03:00").getTime();
    const firstSlot = nextAvailable(original);
    const planned = nextAvailable(original, [{ plannedAt: firstSlot + 60 * 60000, durationMinutes: 60, status: "planned" }], 90);
    expect(planned).toBe(firstSlot + 2 * 60 * 60000);
  });

  it("moves late-night items to the next morning", () => {
    const original = new Date("2026-08-25T21:10:00-03:00").getTime();
    const planned = new Date(nextAvailable(original));
    expect(planned.getDate()).toBe(26);
    expect(planned.getHours()).toBe(8);
  });
});

describe("planner conflict detection", () => {
  it("identifies overlapping planned records", () => {
    const start = new Date("2026-08-26T09:00:00-03:00").getTime();
    expect(findPlannerConflicts({ plannedAt: start + 15 * 60000, durationMinutes: 30 }, [{ title: "Reunião", plannedAt: start, durationMinutes: 60, status: "planned" }])).toHaveLength(1);
    expect(findPlannerConflicts({ plannedAt: start + 60 * 60000, durationMinutes: 30 }, [{ title: "Reunião", plannedAt: start, durationMinutes: 60, status: "planned" }])).toHaveLength(0);
  });
});

describe("planner item creation", () => {
  it("builds a persistent item from natural language extraction", () => {
    const extraction = parseExtraction(JSON.stringify({ intent: "create", title: "Revisar relatório", groupName: "Trabalho", kind: "task", plannedAt: 1777078800000, durationMinutes: 45, targetText: null, notes: "Levar os dados da reunião", response: "Registrei no trabalho." }));
    expect(buildPlannerItem(7, 3, extraction, 12)).toMatchObject({ userId: 7, groupId: 3, title: "Revisar relatório", plannedAt: 1777078800000, durationMinutes: 45, notes: "Levar os dados da reunião", sourceMessageId: 12, detailsNeeded: false });
  });

  it("keeps an incomplete reminder when date or time is missing", () => {
    const extraction = parseExtraction(JSON.stringify({ intent: "create", title: "Comprar remédio", groupName: "Vida adulta", kind: "task", plannedAt: null, durationMinutes: 30, targetText: null, notes: null, response: "Vou deixar isso como lembrete." }));
    const item = buildPlannerItem(7, 3, extraction, 13);
    expect(item).toMatchObject({ userId: 7, title: "Comprar remédio", detailsNeeded: true });
  });

  it("binds an internal task to its appointment block", () => {
    const task = buildChildTaskItem(7, 3, 44, 1777078800000, "Entregar trabalho", "Enviar PDF", 14);
    expect(task).toMatchObject({ userId: 7, parentItemId: 44, plannedAt: 1777078800000, kind: "task", title: "Entregar trabalho", notes: "Enviar PDF" });
  });
});

describe("planner persistence flow", () => {
  it("persists a tomorrow item that belongs to the tomorrow snapshot range", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 88 }]);
    const db = { insert: vi.fn(() => ({ values })) } as unknown as Parameters<typeof persistPlannerCreation>[0]["db"];
    const reference = new Date(2026, 7, 25, 15, 30).getTime();
    const plannedAt = Date.UTC(2026, 7, 26, 9, 40);
    const extraction = parseExtraction(JSON.stringify({ intent: "create", title: "Fazer os indicadores", groupName: "Trabalho", kind: "task", plannedAt, durationMinutes: 60, targetText: null, response: "Agendei os indicadores." }));
    const result = await persistPlannerCreation({ db, userId: 1, snapshot: { groups: [{ id: 4, name: "Trabalho" }], items: [], messages: [] }, extraction, sourceMessageId: 77 });
    expect(result.persisted).toBe(true);
    expect(result.item).not.toBeNull();
    const tomorrowRange = tomorrowBounds(reference);
    const appearsInTomorrow = result.item!.plannedAt >= tomorrowRange.start && result.item!.plannedAt < tomorrowRange.end;
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ title: "Fazer os indicadores", plannedAt }));
    expect(plannedAt).toBeGreaterThanOrEqual(tomorrowBounds(reference).start);
    expect(appearsInTomorrow).toBe(true);
  });
});

describe("planner creation confirmation", () => {
  it("does not claim an item was scheduled when persistence was skipped", () => {
    const extraction = parseExtraction(JSON.stringify({ intent: "create", title: null, groupName: null, kind: "task", plannedAt: null, durationMinutes: 30, targetText: null, response: "Agendei para você." }));
    expect(creationAssistantResponse(extraction, false)).toContain("Ainda não coloquei isso na Agenda");
  });

  it("does not claim persistence for a non-create response either", () => {
    const extraction = parseExtraction(JSON.stringify({ intent: "chat", title: null, groupName: null, kind: "update", plannedAt: null, durationMinutes: 30, targetText: null, response: "Guardei sua rotina." }));
    expect(creationAssistantResponse(extraction, false)).toContain("Ainda não coloquei isso na Agenda");
  });

  it("keeps the assistant confirmation after a successful persistence", () => {
    const extraction = parseExtraction(JSON.stringify({ intent: "create", title: "Estudar", groupName: "Faculdade", kind: "task", plannedAt: 1777078800000, durationMinutes: 30, targetText: null, response: "Agendei Estudar." }));
    expect(creationAssistantResponse(extraction, true)).toBe("Agendei Estudar.");
  });
});

describe("planner status actions", () => {
  it("maps complete intent to completed status", () => {
    expect(statusForIntent("complete")).toBe("completed");
  });

  it("maps skip intent to not realized status", () => {
    expect(statusForIntent("skip")).toBe("skipped");
  });
});

describe("planner extraction", () => {
  it("normalizes structured AI output with notes", () => {
    const result = parseExtraction(JSON.stringify({ intent: "create", title: "Revisar relatório", groupName: "Trabalho", kind: "task", plannedAt: 1777078800000, durationMinutes: 45, targetText: null, notes: "Levar os dados da reunião", response: "Registrei no trabalho." }));
    expect(result.intent).toBe("create");
    expect(result.notes).toBe("Levar os dados da reunião");
  });

  it("keeps the appointment and its internal task in separate extraction fields", () => {
    const result = parseExtraction(JSON.stringify({ intent: "create", title: "Aula da faculdade", groupName: "Faculdade", kind: "appointment", plannedAt: 1777078800000, durationMinutes: 120, targetText: null, parentTargetText: null, childTaskTitle: "Entregar exercício", childTaskNotes: "Levar impresso", notes: null, response: "Organizei a aula e a entrega." }));
    expect(result.kind).toBe("appointment");
    expect(result.childTaskTitle).toBe("Entregar exercício");
    expect(result.childTaskNotes).toBe("Levar impresso");
  });

  it("returns a safe conversational fallback for invalid JSON", () => {
    expect(parseExtraction("não é json").intent).toBe("chat");
  });
});
