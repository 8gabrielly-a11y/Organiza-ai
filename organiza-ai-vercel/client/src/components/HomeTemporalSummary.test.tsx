import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomeTemporalSummary from "./HomeTemporalSummary";

vi.mock("wouter", () => ({ Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));

const item = {
  id: 1,
  title: "Reunião de família",
  plannedAt: Date.now() + 60 * 60 * 1000,
  durationMinutes: 60,
  status: "planned",
  kind: "appointment" as const,
  parentItemId: null,
};

describe("HomeTemporalSummary", () => {
  it("shows the hourly day plan and accessible week links", () => {
    const html = renderToStaticMarkup(<HomeTemporalSummary items={[item]} isLoading={false} isError={false} />);
    expect(html).toContain("Hoje por horário");
    expect(html).toContain("Reunião de família");
    expect(html).toContain("Compromisso");
    expect(html).toContain("Semana em uma olhada");
    expect(html).toContain("Resumo dos próximos sete dias");
    expect(html).toContain("Ver agenda");
    expect(html).toContain("Todos os horários de hoje");
    expect(html).toContain("Livre");
  });

  it("renders loading, error, and empty states with meaningful labels", () => {
    expect(renderToStaticMarkup(<HomeTemporalSummary items={[]} isLoading={true} isError={false} />)).toContain("Carregando resumo do dia");
    expect(renderToStaticMarkup(<HomeTemporalSummary items={[]} isLoading={false} isError={true} />)).toContain("Não foi possível carregar o resumo do dia agora.");
    const empty = renderToStaticMarkup(<HomeTemporalSummary items={[]} isLoading={false} isError={false} />);
    expect(empty).toContain("Todos os horários de hoje");
    expect(empty).toContain("Livre");
  });
});
