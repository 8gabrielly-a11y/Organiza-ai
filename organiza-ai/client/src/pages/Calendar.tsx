import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AgendaStatePanel } from "@/components/AgendaStatePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Onboarding from "@/pages/Onboarding";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { isSameLocalDay, itemKindLabel, itemsForDay, monthGridDayStarts, startOfLocalDay, weekDayStarts } from "@shared/calendar";
import { accessibleDayLabel, agendaUiCopy } from "@shared/agenda";
import { CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Clock3, Link2, Rows3, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type ViewMode = "week" | "month";
type TypeFilter = "all" | PlannerItem["kind"];
type StatusFilter = "all" | PlannerItem["status"];

type PlannerItem = {
  id: number;
  title: string;
  kind: "task" | "appointment" | "update";
  status: "planned" | "completed" | "skipped";
  plannedAt: number;
  durationMinutes: number;
  groupId: number;
  parentItemId: number | null;
  detailsNeeded: boolean;
  notes?: string | null;
};

const kindStyles = {
  appointment: "border-sky-200 bg-sky-50 text-sky-800",
  task: "border-emerald-200 bg-emerald-50 text-emerald-800",
  update: "border-violet-200 bg-violet-50 text-violet-800",
};

const kindDotStyles = {
  appointment: "bg-sky-500",
  task: "bg-emerald-500",
  update: "bg-violet-500",
};

function dateLabel(timestamp: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "America/Sao_Paulo" }).format(new Date(timestamp));
}

function timeLabel(timestamp: number) {
  return dateLabel(timestamp, { hour: "2-digit", minute: "2-digit" });
}

function monthLabel(timestamp: number) {
  return dateLabel(timestamp, { month: "long", year: "numeric" });
}

function statusLabel(status: PlannerItem["status"]) {
  if (status === "completed") return "concluído";
  if (status === "skipped") return "não realizado";
  return "planejado";
}

function initialCalendarDate() {
  if (typeof window !== "undefined") {
    const value = new URLSearchParams(window.location.search).get("date");
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      if (!Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return date;
    }
  }
  return new Date();
}

export default function Calendar() {
  const { user } = useAuth();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data, isLoading, isError } = trpc.planner.snapshot.useQuery();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewMode>(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "month" ? "month" : "week");
  const [selectedDate, setSelectedDate] = useState(initialCalendarDate);
  const [monthCursor, setMonthCursor] = useState(initialCalendarDate);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("planned");

  const allItems = (data?.items ?? []) as PlannerItem[];
  const items = useMemo(() => allItems.filter(item => (typeFilter === "all" || item.kind === typeFilter) && (statusFilter === "all" || item.status === statusFilter)), [allItems, typeFilter, statusFilter]);
  const selectedTimestamp = selectedDate.getTime();
  const selectedItems = useMemo(() => itemsForDay(items, selectedTimestamp), [items, selectedTimestamp]);
  const weekStarts = useMemo(() => weekDayStarts(selectedTimestamp), [selectedTimestamp]);
  const monthDayStarts = useMemo(() => monthGridDayStarts(monthCursor.getTime()), [monthCursor]);
  const monthAgenda = useMemo(() => {
    const monthItems = items.filter(item => {
      const date = new Date(item.plannedAt);
      return date.getFullYear() === monthCursor.getFullYear() && date.getMonth() === monthCursor.getMonth();
    });
    return Array.from(new Set(monthItems.map(item => startOfLocalDay(item.plannedAt)))).sort((a, b) => a - b).map(dayStart => ({ dayStart, items: itemsForDay(monthItems, dayStart) }));
  }, [items, monthCursor]);
  const itemDates = useMemo(() => new Set(items.map(item => startOfLocalDay(item.plannedAt))), [items]);
  const groupById = (id: number) => data?.groups.find(group => group.id === id);
  const childItems = useMemo(() => items.filter(item => item.parentItemId), [items]);
  const parentFor = (item: PlannerItem) => {
    if (item.parentItemId) return items.find(candidate => candidate.id === item.parentItemId) ?? null;
    if (item.kind !== "task") return null;
    return items.find(candidate => candidate.kind === "appointment" && candidate.notes === "Rotina recorrente" && candidate.groupId === item.groupId && isSameLocalDay(candidate.plannedAt, item.plannedAt)) ?? null;
  };

  const selectDay = (timestamp: number) => {
    const nextDate = new Date(timestamp);
    setSelectedDate(nextDate);
    setMonthCursor(nextDate);
  };

  const shiftMonth = (offset: number) => {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1);
    setMonthCursor(next);
  };

  const renderItem = (item: PlannerItem, compact = false, showParentContext = true) => {
    const group = groupById(item.groupId);
    const parent = parentFor(item);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => selectDay(item.plannedAt)}
        className={cn("w-full rounded-xl border text-left transition-colors hover:border-emerald-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", compact ? "p-2" : "p-3", item.status === "completed" && "opacity-60")}
        aria-label={`${item.title}, ${itemKindLabel(item.kind)}, ${statusLabel(item.status)}, ${timeLabel(item.plannedAt)}`}
      >
        <div className="flex items-start gap-2">
          <span className={cn("mt-1 size-2 shrink-0 rounded-full", kindDotStyles[item.kind])} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("font-medium text-slate-800", compact ? "line-clamp-2 text-xs" : "text-sm", item.status === "completed" && "line-through")}>{item.title}</p>
              {item.status === "completed" && <Check className="size-3.5 shrink-0 text-emerald-600" aria-label="Concluído" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{timeLabel(item.plannedAt)}</span>
              {!compact && <Badge variant="outline" className={cn("border text-[10px]", kindStyles[item.kind])}>{itemKindLabel(item.kind)}</Badge>}
              {!compact && item.notes === "Rotina recorrente" && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-800">Rotina</Badge>}
              {group && !compact && <span>{group.name}</span>}
            </div>
            {parent && showParentContext && <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500"><Link2 className="size-3" />Dentro de: {parent.title}</p>}
            {item.detailsNeeded && <p className="mt-1 text-[10px] font-medium text-amber-700">Faltam detalhes</p>}
          </div>
        </div>
      </button>
    );
  };

  const renderItemClusters = (dayItems: PlannerItem[], compact = false) => {
    const roots = dayItems.filter(item => !parentFor(item));
    return <div className="space-y-2">{roots.map(root => {
      const children = dayItems.filter(item => parentFor(item)?.id === root.id);
      return <div key={root.id} className={cn(children.length > 0 && "rounded-2xl border border-sky-100 bg-sky-50/25 p-1.5")}>
        {renderItem(root, compact, false)}
        {children.length > 0 && <div className="ml-3 mt-1 border-l-2 border-violet-200 pl-2"><p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700"><Link2 className="size-3" />Tarefas deste compromisso</p><div className="space-y-1">{children.map(child => renderItem(child, true, false))}</div></div>}
      </div>;
    })}</div>;
  };

  if (profile && !profile.onboardingComplete) return <Onboarding />;

  return (
    <DashboardLayout>
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1480px] space-y-5 pb-8">
        <header className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700"><CalendarDays className="size-4" /> agenda</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Tudo no seu tempo.</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Veja compromissos como blocos de tempo e tarefas como ações ligadas a eles ou independentes.</p>
          </div>
          <Button variant="outline" className="w-fit gap-2 border-emerald-200 bg-white/70 text-emerald-800 hover:bg-emerald-50" onClick={() => setLocation("/")}><Sparkles className="size-4" />Voltar para a conversa</Button>
        </header>



        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden border-emerald-100/80 bg-white/90 shadow-[0_20px_60px_-40px_rgba(15,118,110,0.35)]">
            <CardHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800"><CalendarRange className="size-4 text-emerald-600" />{view === "week" ? "Sua semana" : "Seu mês"}</CardTitle>
                  <p className="mt-1 text-xs capitalize text-slate-500">{view === "week" ? `${dateLabel(weekStarts[0], { day: "2-digit", month: "short" })} — ${dateLabel(weekStarts[6], { day: "2-digit", month: "short", year: "numeric" })}` : monthLabel(monthCursor.getTime())}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros e visualização da agenda"><select aria-label="Filtrar por tipo" value={typeFilter} onChange={event => setTypeFilter(event.target.value as TypeFilter)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option value="all">Todos os tipos</option><option value="appointment">Compromissos</option><option value="task">Tarefas</option><option value="update">Atualizações</option></select><select aria-label="Filtrar por status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option value="all">Todos os status</option><option value="planned">Pendentes</option><option value="completed">Concluídos</option><option value="skipped">Não realizados</option></select>
                  <div className="flex items-center gap-2" role="group" aria-label={agendaUiCopy.chooseView}>
                  <Button type="button" variant={view === "week" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setView("week")} aria-pressed={view === "week"}><Rows3 className="size-4" />Semana</Button>
                  <Button type="button" variant={view === "month" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setView("month")} aria-pressed={view === "month"}><CalendarDays className="size-4" />Mês</Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoading || isError || items.length === 0 ? <AgendaStatePanel isLoading={isLoading} isError={isError} itemCount={items.length} /> : view === "week" ? (
                <div className="overflow-x-auto pb-2">
                  <div className="grid min-w-[760px] grid-cols-7 gap-2">
                    {weekStarts.map(dayStart => {
                      const dayItems = itemsForDay(items, dayStart);
                      const isSelected = isSameLocalDay(dayStart, selectedTimestamp);
                      const isToday = isSameLocalDay(dayStart, Date.now());
                      return <div key={dayStart} className={cn("min-h-[390px] rounded-2xl border p-2 transition-colors", isSelected ? "border-emerald-300 bg-emerald-50/30" : "border-slate-100 bg-slate-50/60")}>
                        <button type="button" onClick={() => selectDay(dayStart)} className="mb-2 w-full rounded-xl px-2 py-2 text-left hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={accessibleDayLabel(dateLabel(dayStart, { weekday: "long", day: "numeric", month: "long" }), dayItems.length)}>
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{dateLabel(dayStart, { weekday: "short" }).replace(".", "")}</span>
                          <span className={cn("mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold", isToday ? "bg-emerald-700 text-white" : "text-slate-700")}>{dateLabel(dayStart, { day: "2-digit" })}</span>
                        </button>
                        <div className="space-y-2">{dayItems.length ? renderItemClusters(dayItems, true) : <p className="px-2 pt-4 text-center text-[11px] text-slate-400">Livre</p>}</div>
                      </div>;
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <CalendarPicker
                    mode="single"
                    month={monthCursor}
                    onMonthChange={setMonthCursor}
                    selected={selectedDate}
                    onSelect={date => date && selectDay(date.getTime())}
                    modifiers={{ hasItems: date => itemDates.has(startOfLocalDay(date.getTime())) }}
                    components={{ DayButton: props => {
                      const dayItems = itemsForDay(items, props.day.date.getTime());
                      const hasAppointment = dayItems.some(item => item.kind === "appointment");
                      const hasTask = dayItems.some(item => item.kind === "task");
                      return <CalendarDayButton {...props} className={cn(props.className, dayItems.length > 0 && "bg-slate-50 font-semibold text-slate-800")} aria-label={accessibleDayLabel(dateLabel(props.day.date.getTime(), { weekday: "long", day: "numeric", month: "long" }), dayItems.length)}>
                        <span>{props.children}</span>
                        {dayItems.length > 0 && <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">{hasAppointment && <span className="size-1.5 rounded-full bg-sky-500" />}{hasTask && <span className="size-1.5 rounded-full bg-emerald-500" />}</span>}
                      </CalendarDayButton>;
                    } }}
                    showOutsideDays
                    className="w-full max-w-[560px] [--cell-size:clamp(3rem,8vw,4.5rem)]"
                  />
                  <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-500" />Compromissos</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" />Tarefas</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-500" />Atualizações</span></div>
                  <section className="mt-6 w-full max-w-[560px] border-t border-slate-100 pt-5" aria-label="Itens agrupados deste mês"><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">Agenda do mês</h3><p className="mt-1 text-xs text-slate-500">Compromissos e tarefas organizados por dia.</p></div>{monthAgenda.length > 0 && <span className="text-xs text-slate-400">{monthAgenda.length} {monthAgenda.length === 1 ? "dia" : "dias"}</span>}</div>{monthAgenda.length ? <div className="space-y-3">{monthAgenda.map(day => <div key={day.dayStart} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-2"><div className="mb-1 flex items-center justify-between px-2 py-1"><p className="text-xs font-semibold capitalize text-slate-700">{dateLabel(day.dayStart, { weekday: "long", day: "numeric", month: "long" })}</p><span className="text-[10px] text-slate-400">{day.items.length} {day.items.length === 1 ? "item" : "itens"}</span></div>{renderItemClusters(day.items)}</div>)}</div> : <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center"><p className="text-sm font-medium text-slate-700">{agendaUiCopy.emptyMonthTitle}</p><p className="mt-1 text-xs text-slate-500">{agendaUiCopy.emptyMonthDescription}</p></div>}</section>
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <Card className="border-slate-200/80 bg-white/90 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between px-5 pb-3 pt-5"><div><CardTitle className="text-base text-slate-800">Dia selecionado</CardTitle><p className="mt-1 text-xs capitalize text-slate-500">{dateLabel(selectedTimestamp, { weekday: "long", day: "numeric", month: "long" })}</p></div><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => selectDay(selectedTimestamp - 86400000)} aria-label={agendaUiCopy.previousDay}><ChevronLeft className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => selectDay(selectedTimestamp + 86400000)} aria-label={agendaUiCopy.nextDay}><ChevronRight className="size-4" /></Button></div></CardHeader>
              <CardContent className="px-4 pb-4">{selectedItems.length ? renderItemClusters(selectedItems) : <div className="rounded-2xl bg-slate-50 px-4 py-7 text-center"><CalendarDays className="mx-auto size-6 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700">{agendaUiCopy.emptyDayTitle}</p><p className="mt-1 text-xs text-slate-500">{agendaUiCopy.emptyDayDescription}</p></div>}</CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white/90 shadow-sm">
              <CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-base text-slate-800">Como estamos organizando</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 text-xs leading-relaxed text-slate-500"><p><strong className="text-sky-700">Compromissos</strong> ocupam um bloco de tempo, como aula, reunião ou consulta.</p><p><strong className="text-emerald-700">Tarefas</strong> são ações que você precisa executar, sozinhas ou dentro de um compromisso.</p>{childItems.length > 0 && <p className="inline-flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-violet-800"><Link2 className="mt-0.5 size-3.5 shrink-0" />Você já tem {childItems.length} {childItems.length === 1 ? "tarefa vinculada" : "tarefas vinculadas"} a compromissos.</p>}</CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
