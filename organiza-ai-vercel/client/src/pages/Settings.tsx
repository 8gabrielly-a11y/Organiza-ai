import DashboardLayout from "@/components/DashboardLayout";
import { FeedbackPanel } from "@/pages/Feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  subscribeBrowserToPush,
  supportsPushNotifications,
  unsubscribeBrowserFromPush,
} from "@/lib/pushNotifications";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  KeyRound,
  MessageCircle,
  PauseCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const toneOptions = [
  {
    value: "gentle" as const,
    title: "Acolhedor",
    description: "Sugere sem pressionar e ajuda a retomar com calma.",
  },
  {
    value: "balanced" as const,
    title: "Equilibrado",
    description: "Mantém clareza, contexto e incentivo na medida.",
  },
  {
    value: "direct" as const,
    title: "Direto",
    description: "Traz objetividade e chama para a próxima ação.",
  },
];

export default function Settings() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const { data: calendar } = trpc.calendar.status.useQuery();
  const { data: reminders } = trpc.reminders.status.useQuery();
  const { data: routines } = trpc.planner.routines.useQuery();
  const { data: snapshot } = trpc.planner.snapshot.useQuery();
  const { data: calendarAuth } = trpc.calendar.connect.useQuery();
  const utils = trpc.useUtils();
  const updateTone = trpc.profile.updateTone.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Tom atualizado");
    },
  });
  const saveKey = trpc.profile.saveGeminiKey.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setKey("");
      toast.success("Chave Gemini protegida e salva");
    },
  });
  const removeKey = trpc.profile.removeGeminiKey.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Chave removida");
    },
  });
  const disconnectCalendar = trpc.calendar.disconnect.useMutation({
    onSuccess: () => {
      utils.calendar.status.invalidate();
      toast.success("Google Calendar desconectado");
    },
  });
  const enableReminders = trpc.reminders.enable.useMutation({
    onSuccess: () => {
      utils.reminders.status.invalidate();
      toast.success("Lembretes conversacionais ativados");
    },
    onError: error => toast.error(error.message),
  });
  const disableReminders = trpc.reminders.disable.useMutation({
    onSuccess: () => {
      utils.reminders.status.invalidate();
      toast.success("Lembretes pausados");
    },
    onError: error => toast.error(error.message),
  });
  const updateReminderPreferences =
    trpc.reminders.updatePreferences.useMutation({
      onSuccess: () => {
        utils.reminders.status.invalidate();
        toast.success("Preferências de lembretes salvas");
      },
      onError: error => toast.error(error.message),
    });
  const subscribePush = trpc.reminders.subscribePush.useMutation({
    onSuccess: () => {
      utils.reminders.status.invalidate();
      toast.success("Notificações ativadas neste dispositivo");
    },
    onError: error => toast.error(error.message),
  });
  const unsubscribePush = trpc.reminders.unsubscribePush.useMutation({
    onSuccess: () => {
      utils.reminders.status.invalidate();
      toast.success("Notificações desativadas neste dispositivo");
    },
    onError: error => toast.error(error.message),
  });
  const updateRoutine = trpc.planner.updateRoutine.useMutation({
    onSuccess: () => {
      utils.planner.routines.invalidate();
      utils.planner.snapshot.invalidate();
      toast.success("Rotina editada");
    },
    onError: error => toast.error(error.message),
  });
  const pauseRoutine = trpc.planner.pauseRoutine.useMutation({
    onSuccess: () => {
      utils.planner.routines.invalidate();
      utils.planner.snapshot.invalidate();
      toast.success("Rotina atualizada");
    },
    onError: error => toast.error(error.message),
  });
  const deleteRoutine = trpc.planner.deleteRoutine.useMutation({
    onSuccess: () => {
      utils.planner.routines.invalidate();
      utils.planner.snapshot.invalidate();
      toast.success("Rotina excluída");
    },
    onError: error => toast.error(error.message),
  });
  const skipRoutineOccurrence = trpc.planner.skipRoutineOccurrence.useMutation({
    onSuccess: () => {
      utils.planner.routines.invalidate();
      utils.planner.snapshot.invalidate();
      toast.success("Ocorrência de hoje pulada");
    },
    onError: error => toast.error(error.message),
  });
  const deleteAccount = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: error => toast.error(error.message),
  });
  const [tone, setTone] = useState<"gentle" | "balanced" | "direct">(
    "balanced"
  );
  const [key, setKey] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [accountConfirmation, setAccountConfirmation] = useState("");

  useEffect(() => {
    if (profile?.communicationTone) setTone(profile.communicationTone);
  }, [profile?.communicationTone]);
  if (isLoading)
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_24px_70px_-48px_rgba(15,118,110,0.5)] backdrop-blur-sm sm:p-6 pb-10">
        <header>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            <Sparkles className="size-4" /> configurações
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Ajuste o Organiza AI ao seu jeito.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Suas preferências são individuais e podem mudar sempre que fizer
            sentido.
          </p>
        </header>
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="size-4 text-emerald-600" />
              Forma de comunicação
            </CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Escolha como o assistente deve conversar com você.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {toneOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTone(option.value);
                  updateTone.mutate({ communicationTone: option.value });
                }}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${tone === option.value ? "border-emerald-400 bg-emerald-50/70" : "border-slate-200 hover:border-emerald-200"}`}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${tone === option.value ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}
                >
                  {tone === option.value && <Check className="size-3" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-600" />
                Inteligência Gemini
              </span>
              <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Como conseguir uma chave Gemini"
                    className="size-8 rounded-full text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  >
                    <HelpCircle className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Como conseguir sua chave Gemini</DialogTitle>
                    <DialogDescription>
                      Leva poucos minutos e você não precisa compartilhar a
                      chave com ninguém.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-slate-600">
                    <ol className="space-y-3">
                      <li className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                          1
                        </span>
                        <span>
                          Abra o{" "}
                          <a
                            className="font-medium text-emerald-700 underline underline-offset-2"
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Google AI Studio{" "}
                            <ExternalLink className="inline size-3" />
                          </a>{" "}
                          e entre com sua conta Google.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                          2
                        </span>
                        <span>
                          Clique em{" "}
                          <strong className="text-slate-800">
                            Create API key
                          </strong>{" "}
                          e escolha um projeto, ou crie um projeto novo.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                          3
                        </span>
                        <span>
                          Copie a chave gerada e cole no campo{" "}
                          <strong className="text-slate-800">
                            Adicionar chave Gemini
                          </strong>{" "}
                          aqui nas Configurações.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                          4
                        </span>
                        <span>
                          Clique em{" "}
                          <strong className="text-slate-800">
                            Salvar chave
                          </strong>
                          . Ela será protegida e não será exibida novamente.
                        </span>
                      </li>
                    </ol>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs leading-5 text-rose-800">
                      <strong>
                        Nunca envie sua chave no chat, em feedback ou para outra
                        pessoa.
                      </strong>{" "}
                      Se ela vazar, revogue-a no Google AI Studio e gere uma
                      nova.
                    </div>
                    <Button
                      className="w-full bg-amber-600 text-white hover:bg-amber-700"
                      onClick={() => setTutorialOpen(false)}
                    >
                      Entendi
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Opcional. Sua chave é criptografada antes de ser persistida e
              nunca é devolvida para a interface.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {profile?.hasGeminiKey
                      ? "Uma chave já está configurada"
                      : "Você está usando o modo básico"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Com a chave, consigo interpretar melhor mensagens
                    incompletas, horários e intenções. Sem ela, o aplicativo
                    continua funcionando.
                  </p>
                </div>
              </div>
            </div>
            <Label htmlFor="gemini-key" className="mt-6 block text-sm">
              {profile?.hasGeminiKey
                ? "Substituir chave"
                : "Adicionar chave Gemini"}
            </Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="gemini-key"
                type="password"
                autoComplete="off"
                value={key}
                onChange={event => setKey(event.target.value)}
                placeholder="Cole sua chave aqui"
                className="font-mono text-sm"
              />
              <Button
                disabled={key.length < 10 || saveKey.isPending}
                onClick={() => saveKey.mutate({ apiKey: key })}
              >
                {saveKey.isPending ? "Salvando..." : "Salvar chave"}
              </Button>
            </div>
            {profile?.hasGeminiKey && (
              <Button
                variant="ghost"
                className="mt-3 px-0 text-xs text-rose-600 hover:bg-transparent hover:text-rose-700"
                onClick={() => removeKey.mutate()}
              >
                Remover chave e voltar ao modo básico
              </Button>
            )}
            <p className="mt-4 text-xs text-slate-400">
              A chave pertence a você. Para obter uma, use o Google AI Studio.
              Nunca compartilhe sua chave em mensagens.
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-violet-600" />
              Lembretes e notificações
            </CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Escolha conversa, e-mail, push ou e-mail e push juntos.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {reminders?.enabled
                    ? "Lembretes ativados"
                    : "Lembretes pausados"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  O sistema verifica seus próximos compromissos automaticamente
                  e envia cada aviso uma única vez.
                </p>
              </div>
              {reminders?.enabled ? (
                <Button
                  variant="outline"
                  className="border-violet-200 text-violet-700"
                  onClick={() => disableReminders.mutate()}
                  disabled={disableReminders.isPending}
                >
                  {disableReminders.isPending
                    ? "Pausando..."
                    : "Pausar lembretes"}
                </Button>
              ) : (
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  onClick={() => enableReminders.mutate()}
                  disabled={enableReminders.isPending}
                >
                  {enableReminders.isPending
                    ? "Ativando..."
                    : "Ativar lembretes"}
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 border-t border-violet-100 pt-4 sm:grid-cols-3">
              <Label className="text-xs text-slate-600">
                Canal
                <select
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"
                  value={reminders?.channel ?? "chat"}
                  onChange={event =>
                    updateReminderPreferences.mutate({
                      channel: event.target.value as
                        | "chat"
                        | "email"
                        | "push"
                        | "both",
                      leadMinutes: reminders?.leadMinutes ?? 30,
                      quietStartMinute: reminders?.quietStartMinute ?? 1320,
                      quietEndMinute: reminders?.quietEndMinute ?? 420,
                    })
                  }
                >
                  <option value="chat">Conversa</option>
                  <option value="email">E-mail</option>
                  <option value="push">Notificação push</option>
                  <option value="both">E-mail + push</option>
                </select>
              </Label>
              <Label className="text-xs text-slate-600">
                Antecedência
                <select
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"
                  value={reminders?.leadMinutes ?? 30}
                  onChange={event =>
                    updateReminderPreferences.mutate({
                      channel: reminders?.channel ?? "chat",
                      leadMinutes: Number(event.target.value),
                      quietStartMinute: reminders?.quietStartMinute ?? 1320,
                      quietEndMinute: reminders?.quietEndMinute ?? 420,
                    })
                  }
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hora</option>
                </select>
              </Label>
              <Label className="text-xs text-slate-600">
                Silêncio
                <select
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"
                  value={`${reminders?.quietStartMinute ?? 1320}-${reminders?.quietEndMinute ?? 420}`}
                  onChange={event => {
                    const [start, end] = event.target.value
                      .split("-")
                      .map(Number);
                    updateReminderPreferences.mutate({
                      channel: reminders?.channel ?? "chat",
                      leadMinutes: reminders?.leadMinutes ?? 30,
                      quietStartMinute: start,
                      quietEndMinute: end,
                    });
                  }}
                >
                  <option value="1320-420">22h–7h</option>
                  <option value="1380-420">23h–7h</option>
                  <option value="0-0">Sem silêncio</option>
                </select>
              </Label>
            </div>
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Notificações neste dispositivo
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Autorize uma vez para receber avisos mesmo quando o Organiza AI
                estiver fechado. No iPhone, o app precisa estar adicionado à
                Tela de Início.
              </p>
              {!supportsPushNotifications() ? (
                <p className="mt-3 text-xs text-rose-700">
                  Este navegador não oferece notificações push.
                </p>
              ) : reminders?.pushSubscribed ? (
                <Button
                  variant="outline"
                  className="mt-3 border-sky-200 text-sky-700"
                  onClick={async () => {
                    const endpoint = await unsubscribeBrowserFromPush();
                    if (endpoint) unsubscribePush.mutate({ endpoint });
                  }}
                >
                  Desativar neste dispositivo
                </Button>
              ) : (
                <Button
                  className="mt-3 bg-sky-600 text-white hover:bg-sky-700"
                  disabled={!reminders?.pushConfigured || subscribePush.isPending}
                  onClick={async () => {
                    try {
                      if (!reminders?.vapidPublicKey) throw new Error("Push ainda não configurado no servidor.");
                      const subscription = await subscribeBrowserToPush(reminders.vapidPublicKey);
                      subscribePush.mutate(subscription);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Não foi possível ativar as notificações.");
                    }
                  }}
                >
                  Ativar notificações neste dispositivo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PauseCircle className="size-4 text-orange-600" />
              Rotinas fixas
            </CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Pause ou remova compromissos recorrentes e seus deslocamentos.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {routines?.length ? (
              routines.map(routine => (
                <div
                  key={routine.id}
                  className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {routine.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {routine.startMinute.toString().padStart(2, "0")}–
                      {routine.endMinute.toString().padStart(2, "0")} ·{" "}
                      {routine.active ? "ativa" : "pausada"} · deslocamento{" "}
                      {routine.commuteBeforeMinutes +
                        routine.commuteAfterMinutes}{" "}
                      min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar ${routine.title}`}
                      className="gap-1 text-slate-600"
                      onClick={() => {
                        const title = window.prompt(
                          "Nome da rotina",
                          routine.title
                        );
                        const before = window.prompt(
                          "Minutos de deslocamento antes",
                          String(routine.commuteBeforeMinutes)
                        );
                        const after = window.prompt(
                          "Minutos de deslocamento depois",
                          String(routine.commuteAfterMinutes)
                        );
                        if (title?.trim() && before !== null && after !== null)
                          updateRoutine.mutate({
                            id: routine.id,
                            title: title.trim(),
                            commuteBeforeMinutes: Number(before) || 0,
                            commuteAfterMinutes: Number(after) || 0,
                          });
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 border-orange-200 text-orange-700"
                      onClick={() =>
                        pauseRoutine.mutate({
                          id: routine.id,
                          paused: routine.active,
                        })
                      }
                    >
                      <PauseCircle className="size-3.5" />
                      {routine.active ? "Pausar" : "Retomar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-600"
                      onClick={() =>
                        skipRoutineOccurrence.mutate({
                          id: routine.id,
                          dateKey: new Intl.DateTimeFormat("sv-SE", {
                            timeZone: "America/Sao_Paulo",
                          }).format(new Date()),
                        })
                      }
                    >
                      Pular hoje
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Excluir esta rotina e seus blocos gerados?"
                          )
                        )
                          deleteRoutine.mutate({ id: routine.id });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Nenhuma rotina fixa cadastrada ainda. Você poderá criá-la pelo
                onboarding ou pela conversa.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-sky-600" />
              Google Calendar
            </CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Conecte sua agenda para transformar compromissos do Organiza AI em
              eventos reais.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {calendar?.connected
                    ? "Calendário conectado"
                    : "Ainda não conectado"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {calendar?.connected
                    ? "Seus próximos compromissos poderão ser sincronizados com o calendário principal."
                    : "A conexão é individual e exige sua autorização do Google."}
                </p>
              </div>
              {calendar?.connected ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-sky-200 text-sky-700"
                    onClick={() => disconnectCalendar.mutate()}
                    disabled={disconnectCalendar.isPending}
                  >
                    {disconnectCalendar.isPending
                      ? "Desconectando..."
                      : "Desconectar"}
                  </Button>
                  {calendar.subscriptionUrl && (
                    <Button
                      variant="outline"
                      className="gap-2 border-sky-200 text-sky-700"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          calendar.subscriptionUrl!
                        );
                        toast.success("Link ICS copiado");
                      }}
                    >
                      <Copy className="size-3.5" />
                      Copiar link para iPhone
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="bg-sky-600 text-white hover:bg-sky-700"
                  onClick={() => {
                    if (calendarAuth?.authorizationUrl)
                      window.location.href = calendarAuth.authorizationUrl;
                  }}
                >
                  Conectar Google Calendar
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              No iPhone, abra Calendário → Calendários → Adicionar Calendário →
              Adicionar Calendário Assinado e cole o link copiado.
            </p>
          </CardContent>
        </Card>
        <Separator />
        <Card className="border-sky-200 bg-sky-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-sky-900">
              <ShieldCheck className="size-4" />
              Exportar meus dados
            </CardTitle>
            <p className="text-sm font-normal text-sky-800">
              Baixe uma cópia local dos seus grupos, itens e mensagens antes de
              limpar ou excluir.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-sky-300 text-sky-700 hover:bg-sky-100"
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        exportedAt: new Date().toISOString(),
                        groups: snapshot?.groups ?? [],
                        items: snapshot?.items ?? [],
                        messages: snapshot?.messages ?? [],
                      },
                      null,
                      2
                    ),
                  ],
                  { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `organiza-ai-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
                toast.success("Dados exportados");
              }}
              disabled={!snapshot}
            >
              Baixar meus dados
            </Button>
            <Button
              variant="outline"
              className="ml-2 border-sky-300 text-sky-700 hover:bg-sky-100"
              onClick={() => {
                const rows = [
                  ["Título", "Tipo", "Status", "Data", "Grupo", "Submódulo"],
                  ...(snapshot?.items ?? []).map(item => [
                    item.title,
                    item.kind,
                    item.status,
                    new Date(item.plannedAt).toISOString(),
                    String(item.groupId),
                    item.submodule ?? "",
                  ]),
                ];
                const csv = rows
                  .map(row =>
                    row
                      .map(value => `"${String(value).replaceAll('"', '""')}"`)
                      .join(",")
                  )
                  .join("\n");
                const url = URL.createObjectURL(
                  new Blob([csv], { type: "text/csv;charset=utf-8" })
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `organiza-ai-${new Date().toISOString().slice(0, 10)}.csv`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              className="ml-2 border-sky-300 text-sky-700 hover:bg-sky-100"
              onClick={() => {
                const events = (snapshot?.items ?? [])
                  .filter(item => item.kind === "appointment")
                  .map(item => {
                    const start = new Date(item.plannedAt)
                      .toISOString()
                      .replace(/[-:]/g, "")
                      .replace(/\.\d{3}Z$/, "Z");
                    const end = new Date(
                      item.plannedAt + item.durationMinutes * 60000
                    )
                      .toISOString()
                      .replace(/[-:]/g, "")
                      .replace(/\.\d{3}Z$/, "Z");
                    return `BEGIN:VEVENT\nUID:organiza-${item.id}@organiza-ai\nDTSTAMP:${start}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${item.title.replace(/[\\,;]/g, " ")}\nEND:VEVENT`;
                  })
                  .join("\n");
                const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nX-WR-TIMEZONE:America/Sao_Paulo\nPRODID:-//Organiza AI//PT-BR\n${events}\nEND:VCALENDAR`;
                const url = URL.createObjectURL(
                  new Blob([ics], { type: "text/calendar;charset=utf-8" })
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `organiza-ai-${new Date().toISOString().slice(0, 10)}.ics`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              ICS
            </Button>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-rose-900">
              <Trash2 className="size-4" />
              Excluir minha conta
            </CardTitle>
            <p className="text-sm font-normal text-rose-800">
              Essa ação remove seus grupos, tarefas, mensagens, preferências,
              integrações e feedbacks. Não será possível desfazê-la.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="delete-account-confirm">
              Digite EXCLUIR para confirmar
            </Label>
            <Input
              id="delete-account-confirm"
              value={accountConfirmation}
              onChange={event => setAccountConfirmation(event.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
            />
            <Button
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-100"
              disabled={
                accountConfirmation !== "EXCLUIR" || deleteAccount.isPending
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Excluir definitivamente sua conta e todos os seus dados?"
                  )
                )
                  deleteAccount.mutate();
              }}
            >
              {deleteAccount.isPending
                ? "Excluindo..."
                : "Excluir minha conta definitivamente"}
            </Button>
          </CardContent>
        </Card>
        <Separator />
        <FeedbackPanel />
        <Separator />
        <Dialog>
          <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-amber-50 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <p className="font-display text-xl font-semibold tracking-tight text-slate-900">
                        Organiza AI
                      </p>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                        Seu espaço para uma rotina mais leve
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                    Um assistente conversacional que transforma suas mensagens
                    em tarefas, compromissos e planos possíveis, respeitando seu
                    tempo e seus grupos.
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    Versão 1.0.0 · Feito para organizar sem complicar.
                  </p>
                </div>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="shrink-0 gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                  >
                    <BookOpen className="size-4" />
                    Sobre o sistema
                  </Button>
                </DialogTrigger>
              </div>
            </CardContent>
          </Card>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Como funciona o Organiza AI</DialogTitle>
              <DialogDescription>
                Um resumo dos principais recursos do aplicativo.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1 text-sm leading-6 text-slate-600">
              <section>
                <h3 className="font-semibold text-slate-900">
                  Converse naturalmente
                </h3>
                <p>
                  Você pode escrever ou falar sobre o que precisa fazer. O
                  sistema entende tarefas, compromissos, horários, grupos e
                  atualizações do seu dia.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">
                  Organize por contexto
                </h3>
                <p>
                  Faculdade, Trabalho, Família, Casa, Vida adulta e Tarefas
                  gerais possuem espaços próprios para manter cada assunto no
                  lugar certo.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">
                  Planeje com realidade
                </h3>
                <p>
                  A Agenda reúne compromissos e tarefas, mostra horários livres
                  e respeita rotinas fixas, deslocamentos e tarefas internas de
                  cada compromisso.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">
                  Integre quando quiser
                </h3>
                <p>
                  Você pode conectar o Google Calendar, assinar sua agenda no
                  iPhone por ICS e adicionar uma chave Gemini opcional para
                  interpretações mais inteligentes.
                </p>
              </section>
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <h3 className="font-semibold text-emerald-900">
                  Privacidade por usuário
                </h3>
                <p className="mt-1 text-emerald-800">
                  Seus grupos, mensagens, tarefas, preferências, integrações e
                  feedbacks ficam separados da conta de outras pessoas.
                </p>
              </section>
            </div>
          </DialogContent>
        </Dialog>
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-xs leading-5 text-slate-500">
          <strong className="text-slate-700">Perfil</strong>
          <br />
          Nome de exibição: {profile?.preferredName || "não definido"}
          <br />
          Contato: {profile?.email || "não informado"}
        </div>
      </div>
    </DashboardLayout>
  );
}
