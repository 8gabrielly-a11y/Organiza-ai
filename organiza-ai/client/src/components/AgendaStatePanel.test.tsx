import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgendaStatePanel } from "./AgendaStatePanel";

describe("AgendaStatePanel", () => {
  it("renders observable loading and error semantics", () => {
    const loading = renderToStaticMarkup(<AgendaStatePanel isLoading isError={false} itemCount={0} />);
    expect(loading).toContain('role="status"');
    expect(loading).toContain("Carregando agenda");

    const error = renderToStaticMarkup(<AgendaStatePanel isLoading={false} isError itemCount={2} />);
    expect(error).toContain('role="alert"');
    expect(error).toContain("Não consegui carregar a agenda agora");
  });

  it("renders the empty state and returns no panel for ready content", () => {
    const empty = renderToStaticMarkup(<AgendaStatePanel isLoading={false} isError={false} itemCount={0} />);
    expect(empty).toContain('data-agenda-state="empty"');
    expect(empty).toContain("Nenhum item neste mês");

    const ready = renderToStaticMarkup(<AgendaStatePanel isLoading={false} isError={false} itemCount={1} />);
    expect(ready).toBe("");
  });
});
