import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Feedback from "./Feedback";

const state = vi.hoisted(() => ({ user: { id: 7, name: "Bia", email: "bia@example.com", role: "admin" as "admin" | "user" }, inbox: [] as unknown[] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ feedback: { inbox: { invalidate: vi.fn() } } }), feedback: { submit: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, inbox: { useQuery: () => ({ data: state.inbox, isLoading: false }) }, markRead: { useMutation: () => ({ mutate: vi.fn() }) } } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Feedback", () => {
  it("renders the feedback form and categories", () => {
    const html = renderToStaticMarkup(<Feedback />);
    expect(html).toContain("Enviar feedback");
    expect(html).toContain("Sugestão");
    expect(html).toContain("Problema");
    expect(html).toContain("outros usuários não verão sua mensagem");
  });
  it("renders the admin inbox empty state", () => {
    const html = renderToStaticMarkup(<Feedback />);
    expect(html).toContain("Feedbacks recebidos");
    expect(html).toContain("Nenhum feedback recebido ainda.");
  });
  it("does not render the admin inbox for regular users", () => {
    state.user = { id: 8, name: "Usuário", email: "user@example.com", role: "user" };
    const html = renderToStaticMarkup(<Feedback />);
    expect(html).not.toContain("Feedbacks recebidos");
    expect(html).toContain("somente para a equipe responsável pelo aplicativo");
  });
});
