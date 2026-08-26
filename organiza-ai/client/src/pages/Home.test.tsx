import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { persistRuntimeUserInfo } from "@shared/auth";
import Home from "./Home";

const plannerState = vi.hoisted(() => ({ result: { data: undefined as unknown, isLoading: false, isError: false } }));

const snapshot = {
  items: [{ id: 22, userId: 7, groupId: 3, parentItemId: null, title: "Revisar planejamento", kind: "task", plannedAt: new Date(2026, 7, 27, 14, 0).getTime(), durationMinutes: 30, status: "planned", notes: null, detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() }],
  groups: [{ id: 3, userId: 7, name: "Trabalho", color: "blue", createdAt: new Date() }],
  messages: [],
};

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => { persistRuntimeUserInfo({ id: 7 }); return { user: { id: 7, name: "Bia", email: "bia@example.com" } }; } }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/AIChatBox", () => ({ AIChatBox: () => <section aria-label="Espaço de conversa">Chat</section> }));
vi.mock("wouter", () => ({ Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ planner: { snapshot: { invalidate: vi.fn() } } }),
    profile: { get: { useQuery: () => ({ data: { onboardingComplete: true } }) } },
    planner: {
      snapshot: { useQuery: () => plannerState.result },
      sendMessage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      transcribeAudio: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      createGroup: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      reschedule: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("Home authenticated rendering contract", () => {
  it("shows a tomorrow item at the local 06:40 time in the Home summary", () => {
    plannerState.result = { data: { ...snapshot, items: [{ ...snapshot.items[0], title: "Fazer os indicadores", plannedAt: new Date(2026, 7, 27, 6, 40).getTime() }] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Fazer os indicadores");
    expect(html).toContain("06:40");
  });

  it("shows the general dashboard with status metrics", () => {
    const now = Date.now();
    plannerState.result = { data: { ...snapshot, items: [
      { ...snapshot.items[0], id: 31, title: "Pendência atrasada", plannedAt: now - 60_000, status: "planned" },
      { ...snapshot.items[0], id: 32, title: "Item concluído", plannedAt: now - 120_000, status: "completed" },
      { ...snapshot.items[0], id: 33, title: "Próximo compromisso", plannedAt: now + 60_000, status: "planned", detailsNeeded: true },
    ] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Seu painel de organização");
    expect(html).toContain("pendências importantes");
    expect(html).toContain("atrasados");
    expect(html).toContain("pendentes no total");
    expect(html).toContain("concluídos");
    expect(html).toContain('aria-label="Filtrar painel"');
    expect(html).toContain("Tudo");
    expect(html).toContain("Pendentes");
    expect(html).toContain("Atrasados");
    expect(html).toContain("Concluídos");
    expect(html).toContain("Pendência atrasada");
    expect(html).toContain("Próximo compromisso");
  });

  it("keeps the real Home content visible when localStorage is blocked", () => {
    plannerState.result = { data: snapshot, isLoading: false, isError: false };
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("storage blocked"); } });
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Bia, vamos deixar o dia mais leve.");
    expect(html).toContain("Seu espaço de conversa");
    expect(html).toContain("Hoje por horário");
    expect(html).toContain("Semana em uma olhada");
    expect(html).toContain("Amanhã");
    expect(html).toContain("Revisar planejamento");
    vi.unstubAllGlobals();
  });
});
