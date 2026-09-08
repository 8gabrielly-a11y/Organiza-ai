import React from 'react';
import { Check, Clock, MapPin } from 'lucide-react';
import { todayStr, formatDatePt } from '@/lib/dateUtils';

const pad = (n) => String(n).padStart(2, '0');

export default function TimeGrid({ commitments, tasks, group, onAction, onTaskAction }) {
  const today = todayStr();
  const taskItems = (tasks || []).map((t) => ({
    id: t.id,
    _task: true,
    title: t.name,
    status: t.done ? 'done' : 'pending',
    scheduled_date: t.due_date,
    scheduled_time: t.scheduled_time,
    location: ''
  }));
  const allItems = [...commitments.filter((c) => !c.parent_id), ...taskItems];
  const appliesOnDate = (c, dateStr) => {
    if (c.is_recurring && c.rrule_days?.length) {
      const d = new Date(dateStr + 'T00:00:00');
      return c.rrule_days.includes(d.getDay());
    }
    return c.scheduled_date === dateStr;
  };
  const todayItems = allItems.filter((c) => appliesOnDate(c, today));
  const byHour = (h) => todayItems.filter((c) => c.scheduled_time && c.scheduled_time.startsWith(pad(h)));
  const unscheduled = todayItems.filter((c) => !c.scheduled_time);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const Chip = ({ c }) => {
    const done = c.status === 'done';
    const toggle = () =>
      c._task ? onTaskAction(c.id, !done) : onAction(c.id, done ? 'pending' : 'done');
    return (
      <div className={`flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm ${done ? 'opacity-50' : ''}`}>
        <button onClick={toggle} className="shrink-0">
          <Check
            className={`w-4 h-4 rounded-full border p-0.5 ${done ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'}`}
          />
        </button>
        <span className={`flex-1 truncate ${done ? 'line-through' : ''}`}>{c.title}</span>
        {c._task && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0">Tarefa</span>
        )}
        {c.scheduled_time && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
            <Clock className="w-3 h-3" />
            {c.scheduled_time}
          </span>
        )}
        {c.location && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0 hidden sm:flex">
            <MapPin className="w-3 h-3" />
            {c.location}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-medium">Hoje por horário</h2>
        <span className="text-sm text-muted-foreground capitalize">{formatDatePt(today)}</span>
      </div>

      {unscheduled.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1.5 px-1">Sem horário</div>
          <div className="space-y-1.5">
            {unscheduled.map((c) => (
              <Chip key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        {hours.map((h) => {
          const items = byHour(h);
          return (
            <div key={h} className="flex border-b last:border-b-0 min-h-[2.5rem]">
              <div className="w-16 shrink-0 text-xs text-muted-foreground py-2 px-2 border-r bg-muted/30 tabular-nums">
                {pad(h)}:00
              </div>
              <div className="flex-1 p-1.5 space-y-1.5">
                {items.map((c) => (
                  <Chip key={c.id} c={c} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}