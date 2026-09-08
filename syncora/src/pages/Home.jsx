import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Leaf, AlertTriangle, Clock, ListTodo, CheckCircle2, Search, Target, MessageSquare, Check
} from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { todayStr } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FILTERS = [
  { key: 'all', label: 'Tudo' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'late', label: 'Atrasados' },
  { key: 'done', label: 'Concluídos' }
];

const STAT_CARDS = [
  { key: 'important', icon: AlertTriangle, label: 'pendências importantes', accent: '#F59E0B' },
  { key: 'late', icon: Clock, label: 'atrasados', accent: '#EF4444' },
  { key: 'pending', icon: ListTodo, label: 'pendentes no total', accent: '#3B82F6' },
  { key: 'done', icon: CheckCircle2, label: 'concluídos', accent: '#10B981' }
];

function StatCard({ icon: Icon, value, label, accent }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: accent + '22', color: accent }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [groups, setGroups] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      const s = await base44.entities.UserSettings.filter({ created_by_id: user.id });
      setSettings(s[0]);
      const grps = await base44.entities.Group.list();
      setGroups(grps);
      const comms = await base44.entities.Commitment.list('-created_date', 200);
      setCommitments(comms.filter((c) => !c.parent_id && !c.is_recurring));
      const tks = await base44.entities.TaskItem.list('-created_date', 200);
      setTasks(tks);
    } catch (e) {}
  };

  useEffect(() => {
    load();
  }, [user]);

  // Sincronização em tempo real (web ↔ mobile)
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const reload = () => loadRef.current();
    const u1 = base44.entities.Commitment.subscribe(reload);
    const u2 = base44.entities.TaskItem.subscribe(reload);
    const u3 = base44.entities.Group.subscribe(reload);
    return () => { u1(); u2(); u3(); };
  }, [user]);

  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);
  const today = todayStr();

  const isPending = (c) => c.status === 'pending' || c.status === 'rescheduled';
  const isLate = (c) => isPending(c) && c.scheduled_date < today;
  const isDone = (c) => c.status === 'done';
  const isImportant = (c) => isPending(c) && c.priority === 'high';

  const taskPending = (t) => !t.done;
  const taskLate = (t) => !t.done && t.due_date && t.due_date < today;

  const stats = {
    important: commitments.filter(isImportant).length,
    late: commitments.filter(isLate).length + tasks.filter(taskLate).length,
    pending: commitments.filter(isPending).length + tasks.filter(taskPending).length,
    done: commitments.filter(isDone).length + tasks.filter((t) => t.done).length
  };

  let commList = commitments.filter((c) => !c.parent_id);
  let taskList = tasks.filter((t) => !t.done);
  if (filter === 'pending') {
    commList = commList.filter((c) => isPending(c) && !isLate(c));
    taskList = taskList.filter((t) => !t.done && t.due_date && t.due_date >= today);
  } else if (filter === 'late') {
    commList = commList.filter(isLate);
    taskList = taskList.filter(taskLate);
  } else if (filter === 'done') {
    commList = commList.filter(isDone);
    taskList = tasks.filter((t) => t.done);
  } else {
    commList = commList.filter(isPending);
  }

  let unified = [
    ...commList.map((c) => ({ ...c, _type: 'commitment', title: c.title })),
    ...taskList.map((t) => ({
      ...t,
      _type: 'task',
      title: t.name,
      scheduled_date: t.planned_date || t.due_date,
      scheduled_time: t.scheduled_time,
      status: t.done ? 'done' : 'pending'
    }))
  ];
  if (query.trim()) unified = unified.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
  unified = unified
    .sort((a, b) => {
      const la = (a._type === 'task' ? taskLate(a) : isLate(a)) ? 0 : 1;
      const lb = (b._type === 'task' ? taskLate(b) : isLate(b)) ? 0 : 1;
      if (la !== lb) return la - lb;
      return (
        (a.scheduled_date || '').localeCompare(b.scheduled_date || '') ||
        (a.scheduled_time || '99').localeCompare(b.scheduled_time || '99')
      );
    })
    .slice(0, 12);

  const toggle = async (item) => {
    if (item._type === 'task') {
      await base44.entities.TaskItem.update(item.id, { done: !item.done, planning_status: item.done ? 'scheduled' : 'completed' });
    } else {
      await base44.entities.Commitment.update(item.id, { status: item.status === 'done' ? 'pending' : 'done' });
    }
    load();
  };

  const dateLabel = format(new Date(), "EEE. dd 'de' MMM.", { locale: ptBR });
  const firstName = settings?.user_name || 'amigo';

  return (
    <div className="flex-1 overflow-y-auto pb-16 md:pb-6">
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        {/* Greeting */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-primary mb-2">
              <Leaf className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide uppercase">Organiza AI</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-medium text-primary leading-tight">
              {firstName}, vamos deixar o dia mais leve.
            </h1>
            <p className="text-muted-foreground text-sm mt-2">Converse comigo, e eu cuido da organização por você.</p>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 mt-4 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm hover:opacity-90 transition"
            >
              <MessageSquare className="w-4 h-4" /> Conversar com a IA
            </Link>
          </div>
          <span className="shrink-0 text-sm bg-accent text-accent-foreground rounded-full px-3 py-1.5 capitalize">
            {dateLabel}
          </span>
        </div>

        {/* Dashboard */}
        <div className="mt-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary/70">Visão geral</div>
          <h2 className="text-xl font-semibold mt-1">Seu painel de organização</h2>
          <p className="text-sm text-muted-foreground mt-1">Uma leitura rápida do que pede atenção e do que já avançou.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {STAT_CARDS.map((s) => (
              <StatCard key={s.key} icon={s.icon} value={stats[s.key]} label={s.label} accent={s.accent} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-8 mb-4">
            <div className="flex gap-1 bg-muted rounded-full p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-sm rounded-full transition ${
                    filter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">O que merece atenção</h3>
                <p className="text-xs text-muted-foreground">{unified.length} items em destaque</p>
              </div>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              {unified.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-xl">
                  Nada por aqui. Tudo em dia!
                </p>
              ) : (
                unified.map((c) => {
                  const g = groupMap[c.group_id];
                  const Icon = getIcon(g?.icon);
                  const done = c._type === 'task' ? c.done : isDone(c);
                  const late = c._type === 'task' ? taskLate(c) : isLate(c);
                  return (
                    <div key={c._type + c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                      <button onClick={() => toggle(c)} className="shrink-0">
                        <Check
                          className={`w-5 h-5 rounded-full border-2 p-0.5 ${
                            done ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${done ? 'line-through opacity-50' : ''}`}>{c.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {c.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {c.scheduled_time}
                            </span>
                          )}
                          {c._type === 'task' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Tarefa</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Compromisso</span>
                          )}
                          {g && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: g.color + '22', color: g.color }}
                            >
                              <Icon className="w-3 h-3" /> {g.name}
                            </span>
                          )}
                          {late && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600">atrasado</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}