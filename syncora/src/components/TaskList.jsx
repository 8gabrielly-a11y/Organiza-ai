import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Check, ListTodo, Clock, Timer } from 'lucide-react';

const STEP = 15;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDay = (s) => {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return ymd(d);
};
const toMin = (t) => {
  if (!t) return null;
  const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
const toTime = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

const windowForGroup = (group) => {
  const m = String(group?.time_window || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (m) {
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    if (end > start) return [start, end];
  }
  const name = (group?.name || '').toLowerCase();
  if (name.includes('trabalh')) return [9 * 60, 18 * 60];
  if (name.includes('casa')) return [18 * 60, 21 * 60];
  if (name.includes('faculd') || name.includes('estud')) return [8 * 60, 22 * 60];
  return [9 * 60, 20 * 60];
};

const appliesRecurring = (c, date) => {
  if (!c.is_recurring || !Array.isArray(c.rrule_days)) return false;
  return c.rrule_days.includes(new Date(`${date}T12:00:00`).getDay());
};

const intervalForCommitment = (c) => {
  const start = toMin(c.scheduled_time);
  if (start == null) return null;
  const explicitEnd = toMin(c.end_time);
  const duration = Number(c.duration_minutes) > 0 ? Number(c.duration_minutes) : 60;
  return { start, end: explicitEnd != null && explicitEnd > start ? explicitEnd : start + duration };
};

const intervalForTask = (t) => {
  const start = toMin(t.scheduled_time);
  if (start == null) return null;
  const explicitEnd = toMin(t.scheduled_end_time);
  const duration = Number(t.duration_minutes) > 0 ? Number(t.duration_minutes) : 60;
  return { start, end: explicitEnd != null && explicitEnd > start ? explicitEnd : start + duration };
};

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

const findSlot = async (due, groupId, durationMinutes = 60, ignoreTaskId = '') => {
  const [commitments, tasks, groups] = await Promise.all([
    base44.entities.Commitment.list('-created_date', 500),
    base44.entities.TaskItem.list('-created_date', 500),
    base44.entities.Group.list()
  ]);
  const group = groups.find((g) => g.id === groupId);
  const [windowStart, windowEnd] = windowForGroup(group);
  const duration = Math.max(STEP, Number(durationMinutes) || 60);
  const today = ymd(new Date());
  const firstDate = due && due < today ? due : today;
  const lastDate = due || firstDate;

  for (let date = firstDate; date <= lastDate; date = addDay(date)) {
    const busy = [];
    commitments.forEach((c) => {
      if (c.status === 'done' || c.status === 'skipped' || c.parent_id) return;
      if (c.scheduled_date !== date && !appliesRecurring(c, date)) return;
      const iv = intervalForCommitment(c);
      if (iv) busy.push(iv);
    });
    tasks.forEach((t) => {
      if (t.id === ignoreTaskId || t.done || (t.planned_date || t.due_date) !== date) return;
      const iv = intervalForTask(t);
      if (iv) busy.push(iv);
    });

    for (let start = windowStart; start + duration <= windowEnd; start += STEP) {
      const candidate = { start, end: start + duration };
      if (!busy.some((b) => overlaps(candidate, b))) {
        return {
          planned_date: date,
          scheduled_time: toTime(start),
          scheduled_end_time: toTime(start + duration)
        };
      }
    }
  }
  return { planned_date: '', scheduled_time: '', scheduled_end_time: '' };
};

export default function TaskList({ groupId }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [duration, setDuration] = useState(60);

  const load = async () => {
    const all = await base44.entities.TaskItem.filter({ group_id: groupId });
    all.sort((a, b) => (a.order || 0) - (b.order || 0));
    setItems(all);
  };

  useEffect(() => { load(); }, [groupId]);

  const add = async () => {
    if (!name.trim()) return;
    const slot = dueDate ? await findSlot(dueDate, groupId, duration) : { planned_date: '', scheduled_time: '', scheduled_end_time: '' };
    await base44.entities.TaskItem.create({
      group_id: groupId,
      name: name.trim(),
      done: false,
      order: items.length,
      due_date: dueDate,
      duration_minutes: Number(duration) || 60,
      priority: 'medium',
      preferred_period: 'any',
      planning_status: slot.scheduled_time ? 'scheduled' : 'unscheduled',
      ...slot
    });
    setName('');
    setDueDate('');
    setDuration(60);
    load();
  };

  const toggle = async (it) => {
    const done = !it.done;
    await base44.entities.TaskItem.update(it.id, { done, planning_status: done ? 'completed' : 'scheduled' });
    load();
  };

  const remove = async (id) => {
    await base44.entities.TaskItem.delete(id);
    load();
  };

  const setDue = async (it, due) => {
    const slot = due ? await findSlot(due, groupId, it.duration_minutes || 60, it.id) : { planned_date: '', scheduled_time: '', scheduled_end_time: '' };
    await base44.entities.TaskItem.update(it.id, {
      due_date: due,
      ...slot,
      planning_status: slot.scheduled_time ? 'rescheduled' : 'unscheduled',
      last_rescheduled_at: new Date().toISOString(),
      reschedule_count: Number(it.reschedule_count || 0) + 1
    });
    load();
  };

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const Row = ({ it }) => (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <button onClick={() => toggle(it)} className="shrink-0">
        <Check className={`w-5 h-5 rounded-full border-2 p-0.5 ${it.done ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'}`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${it.done ? 'line-through opacity-50' : ''}`}>{it.name}</div>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {it.planned_date && (
            <span className="text-xs text-muted-foreground">Planejada: {it.planned_date}</span>
          )}
          {it.scheduled_time && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {it.scheduled_time}{it.scheduled_end_time ? `–${it.scheduled_end_time}` : ''}
            </span>
          )}
          {it.duration_minutes && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Timer className="w-3 h-3" /> {it.duration_minutes} min
            </span>
          )}
          <span className="text-xs text-muted-foreground">Prazo:</span>
          <input
            type="date"
            value={it.due_date || ''}
            onChange={(e) => setDue(it, e.target.value)}
            className="border rounded px-1 py-0.5 text-xs text-muted-foreground"
          />
        </div>
      </div>
      <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="font-medium mb-1 flex items-center gap-2">
        <ListTodo className="w-4 h-4" /> Lista de tarefas
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        A data é o prazo. O Syncora procura um bloco livre antes dele, respeitando duração e compromissos existentes.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Nova tarefa..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="Prazo"
          className="border rounded-lg px-3 py-2 text-sm text-muted-foreground"
        />
        <input
          type="number"
          min="15"
          step="15"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          title="Duração em minutos"
          className="w-24 border rounded-lg px-3 py-2 text-sm text-muted-foreground"
        />
        <button onClick={add} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 hover:opacity-90 transition">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">Nenhuma tarefa.</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && <div className="space-y-1.5">{pending.map((it) => <Row key={it.id} it={it} />)}</div>}
          {done.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground px-1">Concluídas</div>
              {done.map((it) => <Row key={it.id} it={it} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
