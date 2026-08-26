import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Submodule from "./Submodule";

const state = vi.hoisted(() => ({ result: { data: undefined as unknown, isLoading: false, isError: false } }));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
  useRoute: () => [true, { id: "1", moduleSlug: "Aulas" }],
  useLocation: () => ["/groups/1/module/Aulas", vi.fn()],
}));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/AIChatBox", () => ({ AIChatBox: ({ messages, emptyStateMessage }: { messages: Array<{ content: string }>; emptyStateMessage: string }) => <section aria-label="Conversa do tópico">{messages.length ? messages.map(message => <p key={message.content}>{message.content}</p>) : emptyStateMessage}</section> }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ planner: { groupSnapshot: { invalidate: vi.fn() } } }), planner: { groupSnapshot: { useQuery: () => state.result }, sendMessage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));

describe("Submodule", () => {
  it("renders a topic summary and isolates its conversation", () => {
    state.result = { data: { group: { id: 1, userId: 7, name: "Faculdade", color: "lavender", createdAt: new Date() }, messages: [
      { id: 1, userId: 7, groupId: 1, role: "user", content: "[Tópico: Aulas] Revisar aula de processos", createdAt: new Date() },
      { id: 2, userId: 7, groupId: 1, role: "user", content: "[Tópico: Provas] Preparar avaliação", createdAt: new Date() },
    ], items: [{ id: 1, userId: 7, groupId: 1, parentItemId: null, title: "Revisar aula de processos", kind: "task", plannedAt: Date.now() + 86400000, durationMinutes: 30, status: "planned", notes: "Aulas", detailsNeeded: false, sourceMessageId: null, googleEventId: null, createdAt: new Date(), updatedAt: new Date() }] }, isLoading: false, isError: false };
    const html = renderToStaticMarkup(<Submodule />);
    expect(html).toContain("Resumo de Aulas");
    expect(html).toContain("Revisar aula de processos");
    expect(html).not.toContain("Preparar avaliação");
    expect(html).toContain("Conversa sobre Aulas");
  });
});
