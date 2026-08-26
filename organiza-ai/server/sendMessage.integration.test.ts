import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const userTable = { name: "chat" };
const plannerTable = { name: "planner" };
const storedItems: unknown[] = [];
const insertCalls: Array<{ table: unknown; value: unknown }> = [];
let llmExtraction = { intent: "create", title: "Fazer os indicadores", groupName: "Trabalho", kind: "task", plannedAt: null, durationMinutes: 60, targetText: null, parentTargetText: null, childTaskTitle: null, childTaskNotes: null, notes: null, response: "Agendei os indicadores." };
const db = {
  insert: vi.fn((table: unknown) => ({
    values: vi.fn(async (value: unknown) => {
      insertCalls.push({ table, value });
      if (table === plannerTable) storedItems.push({ ...(value as Record<string, unknown>), id: insertCalls.length });
      return [{ insertId: insertCalls.length }];
    }),
  })),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => db),
  ensureDefaultGroups: vi.fn(async () => []),
  getPlannerSnapshot: vi.fn(async () => ({ groups: [{ id: 4, name: "Trabalho" }], items: storedItems, messages: [] })),
  chatMessages: userTable,
  plannerItems: plannerTable,
  getCalendarConnection: vi.fn(async () => undefined),
}));
vi.mock("./profile", () => ({ getOrCreateProfile: vi.fn(async () => ({ communicationTone: "balanced", geminiKeyEncrypted: null })) }));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify(llmExtraction) } }] })),
}));
vi.mock("./googleCalendar", () => ({ getValidGoogleAccessToken: vi.fn(), createGoogleEvent: vi.fn(), updateGoogleEvent: vi.fn(), cancelGoogleEvent: vi.fn() }));

const { appRouter } = await import("./routers");

describe("planner.sendMessage integration", () => {
  const context = () => ({
    user: { id: 1, openId: "local_1", name: "Bia", email: "bia@example.com", role: "user" },
    req: { protocol: "https", headers: {}, get: () => "localhost" },
    res: {},
  } as unknown as TrpcContext);

  it("persists a tomorrow item, returns it from snapshot, and then confirms scheduling", async () => {
    insertCalls.length = 0;
    storedItems.length = 0;
    llmExtraction = { ...llmExtraction, response: "Agendei os indicadores." };
    const result = await appRouter.createCaller(context()).planner.sendMessage({ content: "Amanhã às 6h40 eu tenho que fazer os indicadores." });
    const plannerRow = storedItems[0] as { title: string; plannedAt: number; userId: number };
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const snapshot = await (await import("./db")).getPlannerSnapshot(1);
    expect(result.persisted).toBe(true);
    expect(result.assistant).toBe("Agendei os indicadores.");
    expect(plannerRow).toMatchObject({ title: "Fazer os indicadores", userId: 1 });
    expect(plannerRow.plannedAt).toBeGreaterThanOrEqual(tomorrow.getTime());
    expect(plannerRow.plannedAt).toBeLessThan(tomorrowEnd.getTime());
    expect(snapshot.items).toHaveLength(1);
  });

  it("persists a Monday-to-Thursday work routine as visible appointment blocks", async () => {
    insertCalls.length = 0;
    storedItems.length = 0;
    const result = await appRouter.createCaller(context()).planner.sendMessage({ content: "de segunda a quinta eu trabalho das 06:30 até as 16h" });
    expect(result.persisted).toBe(true);
    expect(result.createdCount).toBeGreaterThanOrEqual(4);
    expect(result.assistant).toContain("já aparece na Agenda");
    expect(storedItems.every(item => (item as { title: string; kind: string; durationMinutes: number }).title === "Trabalho")).toBe(true);
    expect(storedItems.every(item => (item as { kind: string; durationMinutes: number }).kind === "appointment")).toBe(true);
    expect(storedItems.every(item => (item as { kind: string; durationMinutes: number }).durationMinutes === 570)).toBe(true);
  });

  it("links a new work task to the recurring work block on the same day", async () => {
    insertCalls.length = 0;
    storedItems.length = 0;
    llmExtraction = { ...llmExtraction, title: "Trabalho", kind: "appointment", plannedAt: null, response: "Rotina registrada." };
    await appRouter.createCaller(context()).planner.sendMessage({ content: "de segunda a quinta eu trabalho das 06:30 até as 16h" });
    const routine = storedItems[0] as { id: number; plannedAt: number; groupId: number };
    llmExtraction = { ...llmExtraction, title: "Ajeitar os indicadores", kind: "task", groupName: "Trabalho", plannedAt: routine.plannedAt, response: "Anotei essa tarefa." };
    const result = await appRouter.createCaller(context()).planner.sendMessage({ content: "Ajeitar os indicadores" });
    const task = storedItems.find(item => (item as { title?: string }).title === "Ajeitar os indicadores") as { parentItemId?: number };
    expect(result.persisted).toBe(true);
    expect(task.parentItemId).toBe(routine.id);
  });

  it("does not confirm scheduling when the extraction cannot produce a persistible item", async () => {
    insertCalls.length = 0;
    storedItems.length = 0;
    llmExtraction = { ...llmExtraction, title: null, plannedAt: null, response: "Agendei para você." };
    const result = await appRouter.createCaller(context()).planner.sendMessage({ content: "Pode guardar isso para mim?" });

    expect(result.persisted).toBe(false);
    expect(result.assistant).toContain("Ainda não coloquei isso na Agenda");
    expect(storedItems).toHaveLength(0);
  });
});
