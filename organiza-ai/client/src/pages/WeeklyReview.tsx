import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardCheck, Clock3, RotateCcw, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export default function WeeklyReview() {
  const { data, isLoading, isError } = trpc.planner.snapshot.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.planner.updateStatus.useMutation({ onSuccess: () => utils.planner.snapshot.invalidate(), onError: error => toast.error(error.message) });
  const reschedule = trpc.planner.reschedule.useMutation({ onSuccess: () => { utils.planner.snapshot.invalidate(); toast.success("Item enviado para o próximo horário livre"); }, onError: error => toast.error(error.message) });
  const tasks = (data?.items ?? []).filter(item => item.kind === "task");
  const now = Date.now();
  const metrics = useMemo(() => ({ pending: tasks.filter(item => item.status === "planned").length, completed: tasks.filter(item => item.status === "completed").length, overdue: tasks.filter(item => item.status === "planned" && item.plannedAt < now).length, skipped: tasks.filter(item => item.status === "skipped").length }), [tasks, now]);
  const backlog = tasks.filter(item => item.status !== "completed").sort((a, b) => a.plannedAt - b.plannedAt).slice(0, 12);
  if (isLoading) return <DashboardLayout><div className="mx-auto max-w-4xl p-6"><div className="h-48 animate-pulse rounded-3xl bg-slate-100" /></div></DashboardLayout>;
  if (isError) return <DashboardLayout><div className="mx-auto max-w-4xl p-6 text-sm text-rose-700">Não foi possível carregar sua revisão semanal.</div></DashboardLayout>;
  return <DashboardLayout><main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6"><header><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"><Sparkles className="size-4" /> revisão semanal</div><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">Feche a semana com clareza.</h1><p className="mt-2 text-sm text-slate-500">Veja o que avançou, o que ficou pendente e escolha o próximo passo sem tentar resolver tudo de uma vez.</p></header><section className="grid gap-3 sm:grid-cols-4">{[["Pendentes", metrics.pending, "text-sky-700"], ["Atrasadas", metrics.overdue, "text-rose-700"], ["Concluídas", metrics.completed, "text-emerald-700"], ["Não realizadas", metrics.skipped, "text-amber-700"]].map(([label, value, color]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p></CardContent></Card>)}</section><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-4 text-emerald-600" />Backlog para decidir</CardTitle></CardHeader><CardContent className="space-y-2">{backlog.length ? backlog.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-800">{item.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="size-3" />{new Date(item.plannedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus.mutate({ id: item.id, status: "completed" })}><CheckCircle2 className="size-3.5" />Concluir</Button><Button size="sm" variant="ghost" className="gap-1 text-emerald-700" onClick={() => reschedule.mutate({ id: item.id })}><RotateCcw className="size-3.5" />Reagendar</Button></div></div>) : <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">Nenhuma tarefa pendente no backlog. Você pode usar este momento para planejar a próxima semana.</p>}</CardContent></Card></main></DashboardLayout>;
}
