import React from "react";
import { agendaUiCopy, getAgendaState } from "@shared/agenda";
import { CalendarDays, CircleAlert, LoaderCircle } from "lucide-react";

type AgendaStatePanelProps = {
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
};

export function AgendaStatePanel({ isLoading, isError, itemCount }: AgendaStatePanelProps) {
  const state = getAgendaState({ isLoading, isError, itemCount });
  if (state === "ready") return null;
  if (state === "loading") {
    return <div role="status" aria-label={agendaUiCopy.loading} data-agenda-state={state} className="flex min-h-72 flex-col items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500"><LoaderCircle className="size-6 animate-spin text-emerald-600" aria-hidden="true" /><span className="mt-3">{agendaUiCopy.loading}</span></div>;
  }
  if (state === "error") {
    return <div role="alert" data-agenda-state={state} className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-5 text-center text-sm text-rose-800"><CircleAlert className="size-6 text-rose-500" aria-hidden="true" /><span className="mt-3 max-w-sm">{agendaUiCopy.error}</span></div>;
  }
  return <div data-agenda-state={state} className="flex min-h-72 flex-col items-center justify-center rounded-2xl bg-slate-50 px-5 text-center"><CalendarDays className="size-6 text-slate-300" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-slate-700">{agendaUiCopy.emptyMonthTitle}</p><p className="mt-1 max-w-sm text-xs text-slate-500">{agendaUiCopy.emptyMonthDescription}</p></div>;
}
