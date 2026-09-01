import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Calendar from "./Calendar";

const plannerState = vi.hoisted(() => ({ result: { data: undefined as unknown, isLoading: false, isError: false } }));

const snapshot = {
  items: [{ id: 10, userId: 7, groupId: 3, parentItemId: null, title: "Aula de processos", kind: "appointment", plannedAt: new Date(2026, 7, 27, 9, 0).getTime(), durationMinutes: 90, status: "planned", notes: null, detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() }],
  groups: [{ id: 3, userId: 7, name: "Faculdade", color: "lavender", createdAt: new Date() }],
  messages: [],
};

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Bia", email: "bia@example.com" }, loading: false }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/pages/Onboarding", () => ({ default: () => <div>Onboarding</div> }));
vi.mock("@/lib/trpc", () => ({ trpc: { profile: { get: { useQuery: () => ({ data: { onboardingComplete: true } }) } }, planner: { snapshot: { useQuery: () => plannerState.result } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/calendar", vi.fn()] }));

describe("Calendar page rendering contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 27, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("renders loading, error and empty states through the page", () => {
    plannerState.result = { data: undefined, isLoading: true, isError: false };
    expect(renderToStaticMarkup(<Calendar />)).toContain('role="status"');

    plannerState.result = { data: undefined, isLoading: false, isError: true };
    expect(renderToStaticMarkup(<Calendar />)).toContain('role="alert"');

    plannerState.result = { data: { items: [], groups: [], messages: [] }, isLoading: false, isError: false };
    const empty = renderToStaticMarkup(<Calendar />);
    expect(empty).toContain('data-agenda-state="empty"');
    expect(empty).toContain("Nenhum item neste mês");
  });

  it("renders the weekly controls and accessible day navigation with planner content", () => {
    plannerState.result = { data: snapshot, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Calendar />);
    expect(html).toContain("Sua semana");
    expect(html).toContain("Escolher visão da agenda");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Selecionar");
    expect(html).toContain("Dia anterior");
    expect(html).toContain("Próximo dia");
    expect(html).toContain("Aula de processos");
  });

  it("groups a same-day work task inside the recurring work block", () => {
    plannerState.result = { data: { ...snapshot, items: [{ ...snapshot.items[0], id: 30, notes: "Rotina recorrente", title: "Trabalho", kind: "appointment", plannedAt: new Date(2026, 7, 27, 6, 30).getTime() }, { ...snapshot.items[0], id: 31, title: "Ajeitar os indicadores", kind: "task", notes: null, plannedAt: Date.UTC(2026, 7, 27, 9, 40), parentItemId: null }] }, isLoading: false, isError: false };
    vi.stubGlobal("window", { location: { search: "?view=month&date=2026-08-27" } });
    const html = renderToStaticMarkup(<Calendar />);
    expect(html).toContain("Trabalho");
    expect(html).toContain("Ajeitar os indicadores");
    expect(html).toContain("Tarefas deste compromisso");
    vi.unstubAllGlobals();
  });

  it("renders the tomorrow item and local time in the selected day panel", () => {
    plannerState.result = { data: { ...snapshot, items: [{ ...snapshot.items[0], title: "Fazer os indicadores", plannedAt: Date.UTC(2026, 7, 27, 9, 40) }] }, isLoading: false, isError: false };
    vi.stubGlobal("window", { location: { search: "?view=month&date=2026-08-27" } });
    const html = renderToStaticMarkup(<Calendar />);
    expect(html).toContain("Fazer os indicadores");
    expect(html).toContain("06:40");
    vi.unstubAllGlobals();
  });

  it("renders the monthly view and grouped month agenda when requested by URL", () => {
    plannerState.result = { data: snapshot, isLoading: false, isError: false };
    vi.stubGlobal("window", { location: { search: "?view=month" } });
    const html = renderToStaticMarkup(<Calendar />);
    expect(html).toContain("Seu mês");
    expect(html).toContain("Agenda do mês");
    expect(html).toContain("Compromissos e tarefas organizados por dia");
    expect(html).toContain('aria-pressed="true"');
    vi.unstubAllGlobals();

    vi.stubGlobal("window", { location: { search: "?view=month&date=2026-08-27" } });
    const selectedDateHtml = renderToStaticMarkup(<Calendar />);
    expect(selectedDateHtml).toContain("27 de agosto");
    vi.unstubAllGlobals();
  });
});
