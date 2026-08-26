import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Inbox, Mail, Circle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const labels = { suggestion: "Sugestão", problem: "Problema", compliment: "Elogio", other: "Outro" } as const;
type Category = keyof typeof labels;

export function FeedbackPanel() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("suggestion");
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const submit = trpc.feedback.submit.useMutation({ onSuccess: () => { setMessage(""); toast.success("Feedback enviado. Obrigada por ajudar a melhorar o Organiza AI."); utils.feedback.inbox.invalidate(); }, onError: error => toast.error(error.message) });
  const inbox = trpc.feedback.inbox.useQuery(undefined, { enabled: user?.role === "admin" });
  const myFeedback = trpc.feedback.myFeedback?.useQuery ? trpc.feedback.myFeedback.useQuery(undefined, { enabled: Boolean(user) }) : { data: undefined };
  const respond = trpc.feedback.respond?.useMutation ? trpc.feedback.respond.useMutation({ onSuccess: () => { utils.feedback.inbox.invalidate(); toast.success("Resposta enviada"); }, onError: error => toast.error(error.message) }) : { mutate: () => undefined };
  const markRead = trpc.feedback.markRead.useMutation({ onSuccess: () => utils.feedback.inbox.invalidate() });

  return <div className="space-y-6">
    <header><div className="flex items-center gap-2 text-emerald-700"><MessageSquare className="size-5" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Escuta aberta</span></div><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">O que você acha do Organiza AI?</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Conte o que funcionou, o que pode melhorar ou qual ideia deixaria sua rotina mais leve. Sua mensagem chega somente para a equipe responsável pelo aplicativo.</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="border-emerald-100 bg-white/90 shadow-sm"><CardHeader><CardTitle className="text-lg text-slate-800">Enviar feedback</CardTitle><p className="text-sm text-slate-500">Não precisa escrever muito. Uma frase já ajuda.</p><p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">Privado: outros usuários não verão sua mensagem. Depois do envio, você verá apenas a confirmação.</p></CardHeader><CardContent className="space-y-4"><div><label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="feedback-category">Tipo de mensagem</label><select id="feedback-category" value={category} onChange={event => setCategory(event.target.value as Category)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="feedback-message">Sua mensagem</label><Textarea id="feedback-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={3000} placeholder="Ex.: Seria ótimo receber um lembrete antes de sair para o trabalho." className="min-h-36 resize-y rounded-xl" /></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{message.length}/3000</span><Button disabled={message.trim().length < 5 || submit.isPending} onClick={() => submit.mutate({ category, message })} className="gap-2 bg-emerald-700 hover:bg-emerald-800"><Send className="size-4" />{submit.isPending ? "Enviando…" : "Enviar feedback"}</Button></div></CardContent></Card>
      {user?.role === "admin" && <Card className="border-slate-200 bg-white/90 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-slate-800"><Inbox className="size-5 text-emerald-700" />Feedbacks recebidos</CardTitle><p className="text-sm text-slate-500">Mensagens novas ficam destacadas para você revisar.</p></CardHeader><CardContent>{inbox.isLoading ? <div className="h-24 animate-pulse rounded-2xl bg-slate-100" /> : inbox.data?.length ? <div className="space-y-3">{inbox.data.map(item => <article key={item.id} className={`rounded-2xl border p-4 ${item.status === "new" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600">{item.status === "new" ? <Circle className="size-3 fill-emerald-500 text-emerald-500" /> : <CheckCircle2 className="size-4 text-slate-400" />}{labels[item.category as Category]}<span className="font-normal text-slate-400">· {item.userName || item.userEmail || "Usuário"}</span></div>{item.status === "new" && <Button variant="ghost" size="sm" onClick={() => markRead.mutate({ id: item.id })} className="h-7 text-xs text-emerald-700">Marcar como lido</Button>}{user?.role === "admin" && <Button variant="ghost" size="sm" onClick={() => { const response = window.prompt("Resposta para este feedback"); if (response?.trim()) respond.mutate({ id: item.id, response: response.trim() }); }} className="h-7 text-xs text-emerald-700">Responder</Button>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p><p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400"><Mail className="size-3" />{new Date(item.createdAt).toLocaleString("pt-BR")}</p>{item.adminResponse && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-900"><strong>Resposta enviada:</strong> {item.adminResponse}</div>}</article>)}</div> : <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center"><Inbox className="mx-auto size-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">Nenhum feedback recebido ainda.</p></div>}</CardContent></Card>}
    </div>{user?.role !== "admin" && myFeedback.data?.some(item => item.adminResponse) && <Card className="border-emerald-100 bg-white/90 shadow-sm"><CardHeader><CardTitle className="text-lg text-slate-800">Respostas da equipe</CardTitle></CardHeader><CardContent className="space-y-3">{myFeedback.data.filter(item => item.adminResponse).map(item => <div key={item.id} className="rounded-2xl bg-emerald-50/70 p-4"><p className="text-xs text-slate-500">{labels[item.category as Category]}</p><p className="mt-2 text-sm leading-6 text-emerald-900">{item.adminResponse}</p></div>)}</CardContent></Card>}
  </div>;
}

export default function Feedback() {
  return <DashboardLayout><div className="mx-auto max-w-5xl pb-10"><FeedbackPanel /></div></DashboardLayout>;
}
