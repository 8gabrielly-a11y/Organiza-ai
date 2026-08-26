import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { itemsForDay, itemKindLabel, weekDayStarts, type CalendarItem, zonedDayBounds } from "@shared/calendar";
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { Link } from "wouter";

export type TemporalSummaryItem = CalendarItem & {
  id: number;
  title: string;
};

type HomeTemporalSummaryProps = {
  items: TemporalSummaryItem[];
  isLoading: boolean;
  isError: boolean;
};

function timeLabel(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function weekdayLabel(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function dayNumber(timestamp: number) {
  return new Date(timestamp).getDate();
}

export default function HomeTemporalSummary({ items, isLoading, isError }: HomeTemporalSummaryProps) {
  const now = Date.now();
  const { start: todayStart, end: todayEnd } = zonedDayBounds(now);
  const todayItems = items
    .filter(item => item.plannedAt >= todayStart && item.plannedAt < todayEnd && item.status !== "skipped")
    .sort((first, second) => first.plannedAt - second.plannedAt);
  const hourSlots = Array.from({ length: 24 }, (_, hour) => todayStart + hour * 60 * 60 * 1000);
  const currentHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date(now))) % 24;
  const weekDays = weekDayStarts(now);

  return (
    <div className="space-y-4" aria-label="Resumo temporal">
      <Card className="overflow-hidden border-emerald-100/80 bg-white/95 shadow-[0_18px_45px_-35px_rgba(15,118,110,0.4)]">
        <CardHeader className="border-b border-slate-100 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Clock3 className="size-4 text-emerald-600" />
                Hoje por horário
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">Uma visão rápida do que vem primeiro.</p>
            </div>
            <Link href="/calendar" className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              Ver agenda
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-4">
          {isLoading ? (
            <div className="space-y-3" role="status" aria-label="Carregando resumo do dia">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isError ? (
            <div role="alert" className="rounded-xl bg-rose-50 px-4 py-4 text-sm text-rose-800">
              Não foi possível carregar o resumo do dia agora.
            </div>
          ) : (
            <ol className="max-h-[440px] space-y-1 overflow-y-auto pr-1" aria-label="Todos os horários de hoje">
              {hourSlots.map((slot, hour) => {
                const slotEnd = slot + 60 * 60 * 1000;
                const slotItems = todayItems.filter(item => item.plannedAt < slotEnd && item.plannedAt + item.durationMinutes * 60000 > slot);
                const isCurrent = hour === currentHour;
                return (
                  <li key={slot} className={cn("flex min-h-10 items-start gap-3 rounded-xl px-2 py-2", isCurrent && "bg-amber-50/80 ring-1 ring-amber-100")}>
                    <time dateTime={new Date(slot).toISOString()} className={cn("w-11 shrink-0 pt-0.5 text-xs font-semibold tabular-nums", isCurrent ? "text-amber-700" : "text-slate-500")}>{timeLabel(slot)}</time>
                    <div className="min-w-0 flex-1">
                      {slotItems.length ? <div className="space-y-1">{slotItems.map(item => <div key={item.id} className="flex min-w-0 items-center gap-2"><span className={cn("size-2 shrink-0 rounded-full", item.kind === "appointment" ? "bg-sky-500" : "bg-emerald-500")} aria-hidden="true" /><span className="truncate text-xs font-medium text-slate-800">{item.title}</span><Badge variant="outline" className={cn("ml-auto shrink-0 text-[9px]", item.kind === "appointment" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{itemKindLabel(item.kind)}</Badge></div>)}</div> : <span className="text-xs text-slate-400">Livre</span>}
                    </div>
                    {isCurrent && <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-amber-700">agora</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <CalendarDays className="size-4 text-sky-600" />
            Semana em uma olhada
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">Compromissos e tarefas distribuídos pelos próximos dias.</p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-7 gap-1.5" aria-label="Resumo dos próximos sete dias">
            {weekDays.map(day => {
              const count = itemsForDay(items, day).filter(item => item.status !== "skipped").length;
              const isToday = new Date(day).toDateString() === new Date(now).toDateString();
              return (
                <Link key={day} href={`/calendar?date=${new Date(day).toISOString().slice(0, 10)}`} className={cn("rounded-xl border px-1 py-2 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", isToday ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-slate-50/60")} aria-label={`${weekdayLabel(day)} ${dayNumber(day)}: ${count} ${count === 1 ? "item" : "itens"}`}>
                  <span className="block text-[10px] font-semibold uppercase text-slate-500">{weekdayLabel(day)}</span>
                  <span className="mt-1 block text-sm font-semibold text-slate-800">{dayNumber(day)}</span>
                  <span className={cn("mx-auto mt-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold", count ? "bg-emerald-600 text-white" : "text-slate-300")}>
                    {count || <ListTodo className="size-3" aria-hidden="true" />}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><ArrowUpRight className="size-3 text-sky-600" /> Abra a Agenda para ver os detalhes de cada dia.</p>
        </CardContent>
      </Card>
    </div>
  );
}
