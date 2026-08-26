import { describe, expect, it, vi } from "vitest";
import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Group from "./Group";

const state = vi.hoisted(() => ({ result: { data: undefined as unknown, isLoading: false, isError: false } }));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
  useRoute: () => [true, { id: "3" }],
}));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/AIChatBox", () => ({ AIChatBox: ({ emptyStateMessage }: { emptyStateMessage: string }) => <section aria-label="Conversa do grupo">{emptyStateMessage}</section> }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ planner: { groupSnapshot: { invalidate: vi.fn() }, submodules: { invalidate: vi.fn() } } }), planner: { groupSnapshot: { useQuery: () => state.result }, submodules: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, createSubmodule: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, sendMessage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, updateStatus: { useMutation: () => ({ mutate: vi.fn() }) } } } }));

describe("Group", () => {
  it("renders the group's conversation and filtered planning", () => {
    state.result = { data: { group: { id: 3, userId: 7, name: "Trabalho", color: "blue", createdAt: new Date() }, messages: [{ id: 1, userId: 7, groupId: 3, role: "user", content: "Foco no relatório", createdAt: new Date() }], items: [{ id: 20, userId: 7, groupId: 3, parentItemId: null, title: "Bloco Trabalho", kind: "appointment", plannedAt: new Date(2026, 7, 27, 6, 30).getTime(), durationMinutes: 570, status: "planned", notes: "Rotina recorrente", detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() }, { id: 21, userId: 7, groupId: 3, parentItemId: 20, title: "Revisar indicadores", kind: "task", plannedAt: new Date(2026, 7, 27, 9, 40).getTime(), durationMinutes: 30, status: "planned", notes: null, detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() }] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Group />);
    expect(html).toContain("Tudo sobre Trabalho");
    expect(html).toContain("Conversa de Trabalho");
    expect(html).toContain("Revisar indicadores");
    expect(html).toContain("Tarefas deste compromisso");
  });

  it("renders household shortcuts for the Casa group", () => {
    state.result = { data: { group: { id: 3, userId: 7, name: "Casa", color: "sage", createdAt: new Date() }, messages: [], items: [] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Group />);
    expect(html).toContain("Ideias para Casa");
    expect(html).toContain("Compras");
    expect(html).toContain("Rotina semanal");
    expect(html).toContain("Manutenção");
    expect(html).toContain("Contas");
  });

  it("renders an academic overview for Faculdade", () => {
    const now = Date.now();
    state.result = { data: { group: { id: 3, userId: 7, name: "Faculdade", color: "lavender", createdAt: new Date() }, messages: [], items: [
      { id: 30, userId: 7, groupId: 3, parentItemId: null, title: "Prova de Processos", kind: "appointment", plannedAt: now + 86_400_000, durationMinutes: 120, status: "planned", notes: null, detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 31, userId: 7, groupId: 3, parentItemId: null, title: "Leitura atrasada", kind: "task", plannedAt: now - 86_400_000, durationMinutes: 30, status: "planned", notes: null, detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 32, userId: 7, groupId: 3, parentItemId: null, title: "Trabalho concluído", kind: "task", plannedAt: now - 172_800_000, durationMinutes: 60, status: "completed", notes: null, detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() },
    ] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Group />);
    expect(html).toContain("Resumo acadêmico");
    expect(html).toContain("próximo compromisso");
    expect(html).toContain("Prova de Processos");
    expect(html).toContain("Leitura atrasada");
    expect(html).toContain("Trabalho concluído");
  });

  it("renders an actionable empty state when the group has no records", () => {
    state.result = { data: { group: { id: 3, userId: 7, name: "Faculdade", color: "lavender", createdAt: new Date() }, messages: [], items: [] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Group />);
    expect(html).toContain("Este grupo ainda está livre");
    expect(html).toContain("Ainda não há conversa em Faculdade");
  });
});
