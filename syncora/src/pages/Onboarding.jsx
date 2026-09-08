import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, ExternalLink, Sparkles, MessageSquare, CalendarDays, Layers
} from 'lucide-react';

const DEFAULT_GROUPS = [
  { name: 'Faculdade', color: '#6366f1', icon: 'GraduationCap', time_window: '08:00-22:00', areas: [{ name: 'Tarefas', icon: 'CheckSquare', modules: ['tarefas'] }] },
  { name: 'Trabalho', color: '#3b82f6', icon: 'Briefcase', time_window: '09:00-18:00', areas: [{ name: 'Tarefas', icon: 'CheckSquare', modules: ['tarefas'] }] },
  { name: 'Família', color: '#ec4899', icon: 'Heart', areas: [{ name: 'Tarefas', icon: 'CheckSquare', modules: ['tarefas'] }] },
  { name: 'Vida Adulta', color: '#f59e0b', icon: 'Wallet', areas: [{ name: 'Tarefas', icon: 'CheckSquare', modules: ['tarefas'] }, { name: 'Notas', icon: 'StickyNote', modules: ['notas'] }] },
  { name: 'Casa', color: '#10b981', icon: 'Home', time_window: '18:00-21:00', areas: [{ name: 'Lista de compras', icon: 'ShoppingCart', modules: ['compras'] }, { name: 'Rotina semanal', icon: 'Repeat', modules: ['semanal'] }, { name: 'Cardápio da semana', icon: 'Utensils', modules: ['cardapio'] }] }
];

const TONES = [
  { value: 'amigo', label: 'Amigo', desc: 'Caloroso e encorajador. Pergunta se você quer fazer agora ou deixar pra depois.' },
  { value: 'coach', label: 'Coach', desc: 'Firme e motivador. Cobra com assertividade, direto ao ponto.' },
  { value: 'neutro', label: 'Neutro', desc: 'Objetivo, sem emoção. Apenas organiza e informa.' },
  { value: 'direto', label: 'Direto', desc: 'Frases curtas, foco em ação imediata.' }
];

const FEATURES = [
  { icon: MessageSquare, title: 'Converse', desc: 'Fale ou escreva seus compromissos. O sistema entende e organiza.' },
  { icon: Layers, title: 'Agrupe', desc: 'Faculdade, trabalho, casa... tudo separado por áreas da vida.' },
  { icon: CalendarDays, title: 'Planeje', desc: 'Veja hoje e amanhã num só lugar. Fez? Marca. Não deu? Remarca.' }
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    user_name: '',
    tone: 'amigo',
    gemini_api_key: '',
    notifications_enabled: true,
    voice_enabled: true
  });
  const [finishing, setFinishing] = useState(false);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const finish = async () => {
    setFinishing(true);
    try {
      await base44.entities.UserSettings.create({ ...data, onboarded: true });
      for (let i = 0; i < DEFAULT_GROUPS.length; i++) {
        const g = DEFAULT_GROUPS[i];
        const created = await base44.entities.Group.create({ name: g.name, color: g.color, icon: g.icon, order: i, modules: [], time_window: g.time_window || '' });
        for (let j = 0; j < (g.areas || []).length; j++) {
          const a = g.areas[j];
          await base44.entities.Group.create({ name: a.name, color: g.color, icon: a.icon, parent_id: created.id, modules: a.modules, order: j, time_window: g.time_window || '' });
        }
      }
      navigate('/');
    } catch (e) {
      setFinishing(false);
      alert('Erro ao finalizar: ' + (e.message || 'tente novamente'));
    }
  };

  const total = 5;
  const next = () => setStep((s) => Math.min(s + 1, total));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-5">
      <div className="w-full max-w-lg">
        <div className="flex justify-center gap-1.5 mb-8">
          {Array.from({ length: total + 1 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary w-8' : 'bg-muted w-4'}`}
            />
          ))}
        </div>

        <div className="bg-card border rounded-2xl shadow-sm p-8 min-h-[360px] flex flex-col">
          {step === 0 && (
            <div className="flex flex-col items-center text-center justify-center flex-1">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/30">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-medium text-primary mb-2">Bem-vindo ao Organiza AI</h1>
              <p className="text-muted-foreground text-sm max-w-sm">
                Seu planejador pessoal por conversa. A gente organiza seus compromissos em grupos e monta o plano do dia — hoje e amanhã.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col justify-center flex-1">
              <h1 className="text-xl font-semibold mb-1">Como funciona</h1>
              <p className="text-muted-foreground text-sm mb-6">Três passos simples, sempre.</p>
              <div className="space-y-4">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{f.title}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col justify-center flex-1">
              <h1 className="text-xl font-semibold mb-1">Como devo te chamar?</h1>
              <p className="text-muted-foreground text-sm mb-6">O assistente usa seu nome pra conversar com você.</p>
              <input
                value={data.user_name}
                onChange={(e) => set('user_name', e.target.value)}
                placeholder="Seu nome ou apelido"
                className="w-full border rounded-lg px-3 py-2.5 text-sm"
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col justify-center flex-1">
              <h1 className="text-xl font-semibold mb-1">Escolha o tom de voz</h1>
              <p className="text-muted-foreground text-sm mb-6">Como o assistente deve falar com você?</p>
              <div className="space-y-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set('tone', t.value)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      data.tone === t.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col justify-center flex-1">
              <h1 className="text-xl font-semibold mb-1">Sua chave do Gemini</h1>
              <p className="text-muted-foreground text-sm mb-4">
                O assistente usa a API do Google Gemini. Cada usuário coloca a sua própria chave — gratuita e com bom limite.
              </p>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm inline-flex items-center gap-1 underline mb-3"
              >
                Pegar chave grátis em aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
              </a>
              <input
                type="password"
                value={data.gemini_api_key}
                onChange={(e) => set('gemini_api_key', e.target.value)}
                placeholder="AIza..."
                className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                Dá pra pular e adicionar depois nas configurações, mas sem ela o chat não funciona.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col items-center text-center justify-center flex-1">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-5">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-display font-medium text-primary mb-2">Tudo pronto, {data.user_name || 'amigo'}!</h1>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Já criamos alguns grupos pra você começar. Pode mudar quando quiser. Bora conversar?
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            {step > 0 ? (
              <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground">
                Voltar
              </button>
            ) : (
              <span />
            )}
            {step < total ? (
              <button
                onClick={next}
                disabled={step === 2 && !data.user_name.trim()}
                className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm flex items-center gap-2 hover:opacity-90 transition disabled:opacity-40"
              >
                {step === 0 ? 'Começar' : 'Continuar'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={finishing}
                className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {finishing ? 'Preparando...' : 'Entrar no app'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}