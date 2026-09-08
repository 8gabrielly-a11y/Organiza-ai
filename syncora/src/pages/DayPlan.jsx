import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  addDays, addWeeks, addMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval, format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DayView from '@/components/agenda/DayView';
import WeekView from '@/components/agenda/WeekView';
import MonthView from '@/components/agenda/MonthView';
import GroupChecklist from '@/components/agenda/GroupChecklist';
import AgendaColorPicker from '@/components/agenda/AgendaColorPicker';
import { ymd } from '@/lib/agendaUtils';

const VIEWS = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'listas', label: 'Listas' }
];

export default function DayPlan() {
  const { user } = useAuth();
  const [view, setView] = useState('day');
  const [cursor, setCursor] = useState(new Date());
  const [commitments, setCommitments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const isDayLike = view === 'day' || view === 'listas';

  const range = useMemo(() => {
    if (isDayLike) return { start: cursor, end: cursor };
    if (view === 'week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) };
  }, [view, cursor, isDayLike]);

  const load = async () => {
    setLoading(true);
    try {
      const dates = eachDayOfInterval({ start: range.start, end: range.end }).map(ymd);
      const [comms, recurring, tks, grps, s] = await Promise.all([
        base44.entities.Commitment.filter({ scheduled_date: { $in: dates } }),
        base44.entities.Commitment.filter({ is_recurring: true }),
        base44.entities.TaskItem.list('-created_date', 500),
        base44.entities.Group.list(),
        base44.entities.UserSettings.filter({ created_by_id: user.id })
      ]);
      setCommitments([...comms, ...recurring]);
      setTasks(tks.filter((t) => dates.includes(t.planned_date || t.due_date)));
      setGroups(grps);
      setSettings(s[0]);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [view, cursor]);

  // Sincronização em tempo real (web ↔ mobile)
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const reload = () => loadRef.current();
    const u1 = base44.entities.Commitment.subscribe(reload);
    const u2 = base44.entities.TaskItem.subscribe(reload);
    const u3 = base44.entities.Group.subscribe(reload);
    return () => { u1(); u2(); u3(); };
  }, [view, cursor]);

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

  const toggle = async (item) => {
    if (item._task) await base44.entities.TaskItem.update(item.id, { done: !item.done });
    else await base44.entities.Commitment.update(item.id, { status: item.status === 'done' ? 'pending' : 'done' });
    load();
  };

  const step = (dir) => {
    setCursor((c) => {
      if (isDayLike) return addDays(c, dir);
      if (view === 'week') return addWeeks(c, dir);
      return addMonths(c, dir);
    });
  };

  const title = useMemo(() => {
    if (isDayLike) return format(cursor, "EEE, dd 'de' MMM 'de' yyyy", { locale: ptBR });
    if (view === 'week') return `${format(range.start, 'dd/MM', { locale: ptBR })} – ${format(range.end, 'dd/MM/yyyy', { locale: ptBR })}`;
    return format(cursor, "MMMM 'de' yyyy", { locale: ptBR });
  }, [view, cursor, range, isDayLike]);

  return (
    <div className="flex-1 overflow-y-auto pb-16 md:pb-6">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted rounded-full p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`px-3 py-1.5 text-sm rounded-full transition ${view === v.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <AgendaColorPicker settings={settings} onChange={setSettings} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Visualize por dia, semana, mês ou listas por grupo.</p>

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => step(-1)} className="w-9 h-9 rounded-full border bg-card flex items-center justify-center hover:bg-muted transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <div className="font-medium capitalize">{title}</div>
            <button onClick={() => setCursor(new Date())} className="text-xs text-primary hover:underline">
              Ir para hoje
            </button>
          </div>
          <button onClick={() => step(1)} className="w-9 h-9 rounded-full border bg-card flex items-center justify-center hover:bg-muted transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : view === 'day' ? (
          <DayView date={cursor} commitments={commitments} tasks={tasks} groupMap={groupMap} settings={settings} onToggle={toggle} />
        ) : view === 'week' ? (
          <WeekView start={range.start} end={range.end} commitments={commitments} tasks={tasks} groupMap={groupMap} settings={settings} onToggle={toggle} />
        ) : view === 'month' ? (
          <MonthView
            cursor={cursor}
            commitments={commitments}
            tasks={tasks}
            groupMap={groupMap}
            settings={settings}
            onSelectDate={(d) => { setCursor(d); setView('day'); }}
          />
        ) : (
          <GroupChecklist date={cursor} commitments={commitments} tasks={tasks} groupMap={groupMap} settings={settings} onToggle={toggle} />
        )}
      </div>
    </div>
  );
}