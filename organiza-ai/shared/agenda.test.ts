import { describe, expect, it } from "vitest";
import { accessibleDayLabel, agendaUiCopy, getAgendaState } from "./agenda";

describe("agenda UI contracts", () => {
  it("prioritizes loading and error states before ready or empty", () => {
    expect(getAgendaState({ isLoading: true, isError: false, itemCount: 0 })).toBe("loading");
    expect(getAgendaState({ isLoading: false, isError: true, itemCount: 4 })).toBe("error");
    expect(getAgendaState({ isLoading: false, isError: false, itemCount: 0 })).toBe("empty");
    expect(getAgendaState({ isLoading: false, isError: false, itemCount: 2 })).toBe("ready");
  });

  it("keeps critical calendar controls labeled for keyboard and assistive technology", () => {
    expect(agendaUiCopy.previousDay).toBe("Dia anterior");
    expect(agendaUiCopy.nextDay).toBe("Próximo dia");
    expect(accessibleDayLabel("terça-feira, 25 de agosto", 2)).toBe("Selecionar terça-feira, 25 de agosto — 2 itens");
    expect(accessibleDayLabel("quarta-feira, 26 de agosto", 0)).toBe("Selecionar quarta-feira, 26 de agosto");
  });
});
