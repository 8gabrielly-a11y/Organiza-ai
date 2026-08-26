import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Car, Check, KeyRound, Leaf, MessageCircle, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const tones = [
  { value: "gentle" as const, title: "Acolhedor", text: "Me lembra com calma e me ajuda a escolher o próximo passo." },
  { value: "balanced" as const, title: "Equilibrado", text: "É prático, claro e respeita o meu ritmo." },
  { value: "direct" as const, title: "Direto", text: "Me chama para a ação quando algo precisa acontecer." },
];
const weekOptions: Array<[number, string]> = [[1, "S"], [2, "T"], [3, "Q"], [4, "Q"], [5, "S"], [6, "S"], [0, "D"]];
type RoutineDraft = { title: string; groupId?: number; daysOfWeek: number[]; startMinute: number; endMinute: number; commuteBeforeMinutes: number; commuteAfterMinutes: number };

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: planner } = trpc.planner.snapshot.useQuery();
  const [name, setName] = useState(user?.name?.split(" ")[0] ?? "");
  const [tone, setTone] = useState<(typeof tones)[number]["value"]>("balanced");
  const [step, setStep] = useState(0);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineGroupId, setRoutineGroupId] = useState("");
  const [routineDays, setRoutineDays] = useState([1, 2, 3, 4, 5]);
  const [routineStart, setRoutineStart] = useState("08:00");
  const [routineEnd, setRoutineEnd] = useState("17:00");
  const [commuteBefore, setCommuteBefore] = useState("0");
  const [commuteAfter, setCommuteAfter] = useState("0");
  const [savedRoutines, setSavedRoutines] = useState<RoutineDraft[]>([]);

  const createRoutine = trpc.planner.createRoutine.useMutation();
  const complete = trpc.profile.completeOnboarding.useMutation({
    onSuccess: async () => {
      const currentRoutine = routineTitle.trim() ? [{ title: routineTitle.trim(), groupId: Number(routineGroupId) || undefined, daysOfWeek: routineDays, startMinute: toMinutes(routineStart), endMinute: toMinutes(routineEnd), commuteBeforeMinutes: Number(commuteBefore) || 0, commuteAfterMinutes: Number(commuteAfter) || 0 }] : [];
      for (const routine of [...savedRoutines, ...currentRoutine]) await createRoutine.mutateAsync(routine);
      await utils.profile.get.invalidate();
      await utils.planner.snapshot.invalidate();
      setLocation("/");
    },
  });

  const addRoutine = () => {
    if (!routineTitle.trim() || routineDays.length === 0) return;
    setSavedRoutines(routines => [...routines, { title: routineTitle.trim(), groupId: Number(routineGroupId) || undefined, daysOfWeek: routineDays, startMinute: toMinutes(routineStart), endMinute: toMinutes(routineEnd), commuteBeforeMinutes: Number(commuteBefore) || 0, commuteAfterMinutes: Number(commuteAfter) || 0 }]);
    setRoutineTitle("");
    setRoutineGroupId("");
  };
  const finish = () => complete.mutate({ preferredName: name.trim() || "Você", communicationTone: tone });
  const busy = complete.isPending || createRoutine.isPending;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_80%_0%,rgba(167,243,208,.35),transparent_35%),oklch(0.975_0.012_150)] px-5 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-700"><Leaf className="size-4" /> organiza ai</div>
          <div className="mb-5 flex justify-center gap-2">{[0, 1, 2].map(index => <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-10 bg-emerald-500" : "w-5 bg-emerald-100"}`} />)}</div>
        </div>
        <Card className="overflow-hidden border-emerald-100 bg-white/90 shadow-[0_28px_80px_-45px_rgba(15,118,110,.45)]">
          <CardContent className="p-8 sm:p-12">
            {step === 0 && <div className="text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600"><Sparkles className="size-8" /></div><h1 className="mt-7 font-display text-4xl font-semibold tracking-tight text-slate-900">Sua vida, em uma conversa.</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-500">O Organiza AI transforma pensamentos soltos em um plano possível. Você fala do seu jeito; ele entende, organiza e acompanha o que importa.</p><div className="mx-auto mt-9 grid max-w-md gap-3 text-left"><div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><MessageCircle className="mt-0.5 size-5 text-emerald-600" /><div><p className="text-sm font-semibold text-slate-800">Converse naturalmente</p><p className="mt-1 text-xs leading-5 text-slate-500">Até uma informação incompleta já vira um lembrete útil.</p></div></div><div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><KeyRound className="mt-0.5 size-5 text-amber-600" /><div><p className="text-sm font-semibold text-slate-800">IA opcional, do seu jeito</p><p className="mt-1 text-xs leading-5 text-slate-500">Você pode adicionar sua chave Gemini depois, em Configurações.</p></div></div></div><Button className="mt-9 gap-2" size="lg" onClick={() => setStep(1)}>Começar <ArrowRight className="size-4" /></Button></div>}
            {step === 1 && <div><Badge className="border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Um ajuste pessoal</Badge><h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900">Como você quer que eu fale com você?</h1><p className="mt-3 text-sm leading-6 text-slate-500">Isso pode ser alterado a qualquer momento. Sem a chave Gemini, o modo básico continua funcionando.</p><label className="mt-8 block text-sm font-medium text-slate-700">Como posso te chamar?<Input className="mt-2 max-w-md" value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" autoFocus /></label><div className="mt-7 grid gap-3">{tones.map(item => <button type="button" key={item.value} onClick={() => setTone(item.value)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left ${tone === item.value ? "border-emerald-400 bg-emerald-50/70" : "border-slate-200 hover:border-emerald-200"}`}><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${tone === item.value ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>{tone === item.value && <Check className="size-3" />}</span><span><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.text}</span></span></button>)}</div><div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button variant="ghost" onClick={() => setStep(0)}>Voltar</Button><Button className="gap-2" onClick={() => setStep(2)}>Continuar <ArrowRight className="size-4" /></Button></div></div>}
            {step === 2 && <div><Badge className="border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-50">Sua rotina real</Badge><h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900">O que não pode ser esquecido?</h1><p className="mt-3 text-sm leading-6 text-slate-500">Cadastre trabalho, faculdade ou outro compromisso fixo. O deslocamento também ocupa espaço no seu dia.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{savedRoutines.length > 0 && <div className="sm:col-span-2 rounded-2xl bg-emerald-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Compromissos adicionados</p><div className="mt-2 flex flex-wrap gap-2">{savedRoutines.map((routine, index) => <Badge key={`${routine.title}-${index}`} variant="outline" className="border-emerald-200 bg-white text-emerald-800">{routine.title} · {String(Math.floor(routine.startMinute / 60)).padStart(2, "0")}:{String(routine.startMinute % 60).padStart(2, "0")}</Badge>)}</div></div>}<label className="text-sm font-medium text-slate-700 sm:col-span-2">Compromisso fixo<Input className="mt-2" value={routineTitle} onChange={event => setRoutineTitle(event.target.value)} placeholder="Ex.: Trabalho ou faculdade" /></label><label className="text-sm font-medium text-slate-700">Grupo<select className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={routineGroupId} onChange={event => setRoutineGroupId(event.target.value)}><option value="">Tarefas gerais</option>{(planner?.groups ?? []).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div><span className="text-sm font-medium text-slate-700">Dias da semana</span><div className="mt-2 flex flex-wrap gap-2">{weekOptions.map(([day, label]) => <button type="button" key={day} aria-pressed={routineDays.includes(day)} onClick={() => setRoutineDays(days => days.includes(day) ? days.filter(item => item !== day) : [...days, day])} className={`size-9 rounded-full border text-xs font-semibold ${routineDays.includes(day) ? "border-emerald-400 bg-emerald-100 text-emerald-700" : "border-slate-200 text-slate-400"}`}>{label}</button>)}</div></div><label className="text-sm font-medium text-slate-700">Começa às<Input type="time" className="mt-2" value={routineStart} onChange={event => setRoutineStart(event.target.value)} /></label><label className="text-sm font-medium text-slate-700">Termina às<Input type="time" className="mt-2" value={routineEnd} onChange={event => setRoutineEnd(event.target.value)} /></label><label className="text-sm font-medium text-slate-700"><span className="inline-flex items-center gap-1">Deslocamento antes <Car className="size-3" /></span><Input type="number" min="0" max="240" className="mt-2" value={commuteBefore} onChange={event => setCommuteBefore(event.target.value)} /></label><label className="text-sm font-medium text-slate-700"><span className="inline-flex items-center gap-1">Deslocamento depois <Car className="size-3" /></span><Input type="number" min="0" max="240" className="mt-2" value={commuteAfter} onChange={event => setCommuteAfter(event.target.value)} /></label><div className="sm:col-span-2"><Button type="button" variant="outline" className="gap-2 bg-white" onClick={addRoutine} disabled={!routineTitle.trim() || routineDays.length === 0}><Plus className="size-4" />Adicionar outro compromisso</Button></div></div><div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button><div className="flex gap-2"><Button variant="ghost" onClick={finish} disabled={busy}>Pular por enquanto</Button><Button className="gap-2" onClick={finish} disabled={busy || routineDays.length === 0}>{busy ? "Salvando..." : <><Plus className="size-4" />Salvar rotina</>}</Button></div></div></div>}
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-400">Você poderá editar suas rotinas fixas e deslocamentos em Configurações.</p>
      </div>
    </main>
  );
}
