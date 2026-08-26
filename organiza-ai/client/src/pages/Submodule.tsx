import React from "react";
import { ArrowLeft, CheckCircle2, Clock3, Inbox, MessageCircle, Sparkles } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { itemKindLabel } from "@shared/calendar";

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");

export default function Submodule() {
  const [, params] = useRoute("/groups/:id/module/:moduleSlug");
  const [, setLocation] = useLocation();
  const groupId = Number(params?.id);
  const moduleName = decodeURIComponent(params?.moduleSlug ?? "Tópico").replace(/-/g, " ");
  const { data, isLoading, isError } = trpc.planner.groupSnapshot.useQuery({ groupId }, { enabled: Number.isFinite(groupId) });
  const utils = trpc.useUtils();
  const sendMessage = trpc.planner.sendMessage.useMutation({ onSuccess: () => utils.planner.groupSnapshot.invalidate({ groupId }) });
  const clearChat = trpc.auth?.clearChat?.useMutation ? trpc.auth.clearChat.useMutation({ onSuccess: () => utils.planner.groupSnapshot.invalidate({ groupId }) }) : { mutate: () => undefined };
  const items = data?.items ?? [];
  const keyword = slugify(moduleName);
  const relevantItems = items.filter(item => {
    const searchable = slugify(`${item.title} ${item.notes ?? ""}`);
    return keyword.split(/\s+/).some(word => word.length > 2 && searchable.includes(word));
  });
  const tasks = relevantItems.filter(item => item.kind === "task");
  const pending = tasks.filter(item => item.status === "planned");
  const completed = tasks.filter(item => item.status === "completed");
  const nextItem = relevantItems.filter(item => item.status === "planned" && item.plannedAt >= Date.now()).sort((a, b) => a.plannedAt - b.plannedAt)[0];
  const messages = (data?.messages ?? []).filter(message => message.submodule === moduleName).map(message => ({ role: message.role, content: message.content.replace(`[Tópico: ${moduleName}]`, "").trim() }));

  if (isError || !data?.group) return <DashboardLayout><div role="alert" className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="font-display text-2xl font-semibold text-slate-900">Tópico não encontrado</h1><Link href="/"><Button className="mt-5">Voltar ao planejamento</Button></Link></div></DashboardLayout>;

  return <DashboardLayout><div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1480px] space-y-5 pb-8">
    <header><Link href={`/groups/${groupId}`}><Button variant="ghost" size="sm" className="-ml-3 gap-2 text-slate-500"><ArrowLeft className="size-4" />Voltar para {data.group.name}</Button></Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">módulo de {data.group.name}</p><h1 className="mt-2 font-display text-3xl font-semibold capitalize tracking-tight text-slate-900 sm:text-4xl">{moduleName}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Um espaço só para este tópico, com resumo, registros relacionados e conversa contextualizada.</p></header>
    <Card className="border-violet-100 bg-violet-50/50 shadow-sm"><CardHeader className="px-6 pb-3 pt-5"><CardTitle className="flex items-center gap-2 text-base text-slate-800"><Sparkles className="size-4 text-violet-600" />Resumo de {moduleName}</CardTitle></CardHeader><CardContent className="grid gap-3 px-6 pb-5 sm:grid-cols-3"><div className="rounded-2xl bg-white/80 p-4"><p className="text-2xl font-semibold text-slate-900">{pending.length}</p><p className="text-xs text-slate-500">tarefas pendentes</p></div><div className="rounded-2xl bg-emerald-50/80 p-4"><p className="text-2xl font-semibold text-slate-900">{completed.length}</p><p className="text-xs text-emerald-700">tarefas concluídas</p></div><div className="rounded-2xl bg-white/80 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">próximo registro</p><p className="mt-2 truncate text-sm font-semibold text-slate-800">{nextItem?.title ?? "Nenhum registro próximo"}</p>{nextItem && <p className="mt-1 text-xs text-slate-500">{new Date(nextItem.plannedAt).toLocaleDateString("pt-BR")} · {new Date(nextItem.plannedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>}</div></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]"><Card className="border-slate-200/80 bg-white/90 shadow-sm"><CardHeader className="px-6 pb-3 pt-5"><CardTitle className="flex items-center gap-2 text-base text-slate-800"><CheckCircle2 className="size-4 text-emerald-600" />Registros de {moduleName}</CardTitle></CardHeader><CardContent className="px-4 pb-5">{isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-slate-100" /> : relevantItems.length ? <div className="space-y-2">{relevantItems.sort((a, b) => a.plannedAt - b.plannedAt).map(item => <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3"><Clock3 className="mt-0.5 size-4 text-slate-400" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.plannedAt).toLocaleDateString("pt-BR")} · {new Date(item.plannedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div><Badge variant="outline" className="text-[10px]">{itemKindLabel(item.kind)}</Badge></div>)}</div> : <div className="rounded-2xl bg-emerald-50/60 px-5 py-10 text-center"><Inbox className="mx-auto size-7 text-emerald-400" /><p className="mt-3 text-sm font-medium text-slate-700">Nenhum registro neste tópico.</p><p className="mt-1 text-xs text-slate-500">Converse comigo para começar a organizar {moduleName}.</p></div>}</CardContent></Card><Card className="overflow-hidden border-emerald-100/80 bg-white/90 shadow-sm"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 text-base text-slate-800"><MessageCircle className="size-4 text-emerald-600" />Conversa sobre {moduleName}</CardTitle><p className="mt-1 text-xs text-slate-500">Tudo que você enviar aqui recebe o grupo e o tópico como contexto.</p></CardHeader><CardContent className="p-0"><AIChatBox onClear={() => { if (window.confirm(`Limpar o histórico de ${moduleName}? Os registros continuarão na agenda.`)) clearChat.mutate({ groupId, submodule: moduleName }); }} messages={messages} onSendMessage={content => sendMessage.mutate({ content: `[Tópico: ${moduleName}] ${content}`, groupId, submodule: moduleName })} isLoading={sendMessage.isPending} height="500px" placeholder={`Ex.: organizar ${moduleName.toLowerCase()}`} emptyStateMessage={`Ainda não há conversa sobre ${moduleName}.`} suggestedPrompts={[`O que tenho em ${moduleName.toLowerCase()}?`, `Adicionar uma tarefa de ${moduleName.toLowerCase()}`, "O que exige atenção?"]} /></CardContent></Card></div>
    <Button variant="outline" onClick={() => setLocation(`/groups/${groupId}`)} className="bg-white">Ver todos os módulos de {data.group.name}</Button>
  </div></DashboardLayout>;
}
