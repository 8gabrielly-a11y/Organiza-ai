export const agendaUiCopy = {
  loading: "Carregando agenda",
  error: "Não consegui carregar a agenda agora. Tente atualizar em alguns instantes.",
  emptyDayTitle: "Esse dia está aberto.",
  emptyDayDescription: "Registre algo pelo chat quando quiser.",
  emptyMonthTitle: "Nenhum item neste mês.",
  emptyMonthDescription: "Quando você registrar algo, ele aparecerá agrupado aqui.",
  previousDay: "Dia anterior",
  nextDay: "Próximo dia",
  selectDay: "Selecionar",
  chooseView: "Escolher visão da agenda",
} as const;

export type AgendaState = "loading" | "error" | "empty" | "ready";

export function getAgendaState({ isLoading, isError, itemCount }: { isLoading: boolean; isError: boolean; itemCount: number }): AgendaState {
  if (isLoading) return "loading";
  if (isError) return "error";
  return itemCount > 0 ? "ready" : "empty";
}

export function accessibleDayLabel(dayLabel: string, itemCount: number) {
  return `${agendaUiCopy.selectDay} ${dayLabel}${itemCount ? ` — ${itemCount} ${itemCount === 1 ? "item" : "itens"}` : ""}`;
}
