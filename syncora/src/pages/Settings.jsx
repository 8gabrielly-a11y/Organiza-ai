import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';
import { enablePushNotifications, disablePushNotifications, pushSupported } from '@/components/PushNotifications';
import { Save, ExternalLink, Calendar, Bell, Mic, Sun } from 'lucide-react';

const TONES = [
  { value: 'amigo', label: 'Amigo', desc: 'Caloroso e encorajador. Pergunta se você quer fazer agora ou deixar pra depois.' },
  { value: 'coach', label: 'Coach', desc: 'Firme e motivador. Cobra com assertividade, direto ao ponto.' },
  { value: 'neutro', label: 'Neutro', desc: 'Objetivo, sem emoção. Apenas organiza e informa.' },
  { value: 'direto', label: 'Direto', desc: 'Frases curtas, foco em ação imediata.' }
];

export default function Settings() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const load = async () => {
    const list = await base44.entities.UserSettings.filter({ created_by_id: user.id });
    setSettings(
      list[0] || {
        user_name: '',
        tone: 'amigo',
        gemini_api_key: '',
        notifications_enabled: true,
        voice_enabled: true
      }
    );
  };

  useEffect(() => {
    load();
  }, []);

  const handleNotifications = async (enabled) => {
    if (!enabled) {
      set('notifications_enabled', false);
      await disablePushNotifications().catch(() => {});
      return;
    }

    if (!pushSupported()) {
      set('notifications_enabled', false);
      setNotificationPermission('unsupported');
      return;
    }

    try {
      await enablePushNotifications();
      setNotificationPermission(Notification.permission);
      set('notifications_enabled', Notification.permission === 'granted');
    } catch (error) {
      setNotificationPermission('Notification' in window ? Notification.permission : 'unsupported');
      set('notifications_enabled', false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.UserSettings.update(settings.id, settings);
      } else {
        const created = await base44.entities.UserSettings.create(settings);
        setSettings(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <div className="flex-1 overflow-y-auto pb-16 md:pb-6">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Configurações</h1>

        <section className="space-y-3">
          <h2 className="font-medium">Perfil</h2>
          <label className="text-sm text-muted-foreground block">Como o sistema deve te chamar?</label>
          <input
            value={settings.user_name}
            onChange={(e) => set('user_name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Seu nome"
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Tom de voz</h2>
          <div className="space-y-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => set('tone', t.value)}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  settings.tone === t.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Chave da API Gemini</h2>
          <p className="text-xs text-muted-foreground">
            Sua chave fica salva só pra você. Pegue grátis em{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 underline"
            >
              aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <input
            type="password"
            value={settings.gemini_api_key}
            onChange={(e) => set('gemini_api_key', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="AIza..."
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Preferências</h2>
          <label className="flex items-center justify-between rounded-xl border p-3 cursor-pointer">
            <span className="flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4" /> Notificações
            </span>
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) => handleNotifications(e.target.checked)}
              className="w-4 h-4"
            />
          </label>
          <p className="text-xs text-muted-foreground px-1">
            {notificationPermission === 'granted' && 'Web Push ativado: o Syncora pode te avisar mesmo com o app fechado.'}
            {notificationPermission === 'default' && 'Ao ativar, o navegador registrará este dispositivo para receber avisos mesmo com o app fechado.'}
            {notificationPermission === 'denied' && 'O navegador bloqueou as notificações. Libere a permissão nas configurações do site.'}
            {notificationPermission === 'unsupported' && 'Este navegador não oferece Web Push. O acompanhamento interno continua funcionando somente quando o app estiver aberto.'}
          </p>
          <label className="flex items-center justify-between rounded-xl border p-3 cursor-pointer">
            <span className="flex items-center gap-2 text-sm">
              <Mic className="w-4 h-4" /> Entrada por voz
            </span>
            <input
              type="checkbox"
              checked={settings.voice_enabled}
              onChange={(e) => set('voice_enabled', e.target.checked)}
              className="w-4 h-4"
            />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <Sun className="w-4 h-4" /> Aparência
          </h2>
          <div className="rounded-xl border p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Tema</div>
              <div className="text-xs text-muted-foreground">Alterne entre modo claro e escuro</div>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Integrações
          </h2>
          <GoogleCalendarSync />
        </section>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {saved && <span className="text-sm text-green-600">Salvo!</span>}
          <button
            onClick={() => logout()}
            className="text-sm text-muted-foreground hover:text-foreground ml-auto"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}