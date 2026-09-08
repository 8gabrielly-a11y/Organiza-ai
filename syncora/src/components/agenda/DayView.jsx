import React from 'react';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getIcon } from '@/lib/icons';
import { appliesOnDate, toAgendaItem, ymd, itemStyle } from '@/lib/agendaUtils';

const ROW = 52;
const pad = (n) => String(n).padStart(2, '0');
const toHours = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
};

export default function DayView({ date, commitments, tasks, groupMap, settings, onToggle }) {
  const dateStr = ymd(date);
  const all = [...commitments.filter((c) => !c.parent_id), ...tasks.map(toAgendaItem)];
  const dayItems = all.filter((c) => appliesOnDate(c, dateStr));

  const withTime = dayItems.filter((c) => c.scheduled_time);
  const unscheduled = dayItems.filter((c) => !c.scheduled_time);

  const blocks = withTime
    .filter((c) => !c._task && c.end_time && toHours(c.end_time) > toHours(c.scheduled_time))
    .map((c) => ({ ...c, _start: toHours(c.scheduled_time), _end: toHours(c.end_time) }))
    .sort((a, b) => a._start - b._start);
  const blockIds = new Set(blocks.map((b) => b.id));

  const points = withTime
    .filter((c) => !blockIds.has(c.id))
    .map((c) => ({ ...c, _start: toHours(c.scheduled_time) }));

  const contained = [];
  const free = [];
  points.forEach((p) => {
    const block = blocks.find((b) => p._start >= b._start && p._start < b._end);
    if (block) contained.push({ ...p, _blockId: block.id });
    else free.push(p);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = dateStr === ymd(new Date());
  const nowH = isToday ? new Date().getHours() + new Date().getMinutes() / 60 : null;

  const Chip = ({ c }) => {
    const done = c.status === 'done';
    const g = groupMap[c.group_id];
    const st = itemStyle(c, g, settings);
    return (
      <div
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs shadow-sm ${done ? 'opacity-60' : ''}`}
        style={{ backgroundColor: st.fill, borderColor: st.color, color: st.solid ? '#fff' : undefined }}
      >
        <button onClick={() => onToggle(c)} className="shrink-0">
          <Check
            className={`w-3.5 h-3.5 rounded-full border p-0.5 ${done ? 'bg-primary text-primary-foreground border-primary' : ''}`}
            style={!done ? { borderColor: st.solid ? '#fff' : st.color, color: st.solid ? '#fff' : undefined } : {}}
          />
        </button>
        {c.scheduled_time && <span className="text-[10px] shrink-0 tabular-nums opacity-80">{c.scheduled_time}</span>}
        <span className={`truncate ${done ? 'line-through' : ''}`}>{c.title}</span>
        {c._task && (
          <span
            className="text-[9px] px-1 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: st.solid ? 'rgba(255,255,255,0.25)' : st.color + '22', color: st.solid ? '#fff' : st.color }}
          >
            Tarefa
          </span>
        )}
      </div>
    );
  };

  const Block = ({ b }) => {
    const g = groupMap[b.group_id];
    const st = itemStyle(b, g, settings);
    const Icon = g ? getIcon(g.icon) : null;
    const top = b._start * ROW;
    const height = (b._end - b._start) * ROW;
    const inner = contained.filter((p) => p._blockId === b.id);
    return (
      <div
        className="absolute left-0 right-0 rounded-lg border-2 overflow-hidden"
        style={{ top, height, backgroundColor: st.fill, borderColor: st.color }}
      >
        <div className="absolute top-1.5 left-2 right-2 z-10 flex items-center gap-1.5 text-xs font-medium" style={{ color: st.color }}>
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
          <span className="truncate">{b.title}</span>
          <span className="ml-auto tabular-nums shrink-0">{b.scheduled_time}–{b.end_time}</span>
        </div>
        {inner.map((p) => {
          const relTop = Math.max(26, Math.min(height - 26, (p._start - b._start) * ROW));
          return (
            <div key={p.id} className="absolute left-1.5 right-1.5" style={{ top: relTop }}>
              <Chip c={p} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {unscheduled.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1.5 px-1">Sem horário</div>
          <div className="space-y-1.5">
            {unscheduled.map((c) => <Chip key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {dayItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-xl">
          Nada agendado para {format(date, "dd 'de' MMM", { locale: ptBR })}.
        </p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
            <div>
              {hours.map((h) => (
                <div key={h} className="text-[11px] text-muted-foreground text-right pr-2 border-r bg-muted/20 tabular-nums flex items-start justify-end" style={{ height: ROW }}>
                  {pad(h)}:00
                </div>
              ))}
            </div>
            <div className="relative" style={{ height: 24 * ROW }}>
              {hours.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-b border-border/50" style={{ top: h * ROW }} />
              ))}
              {nowH !== null && (
                <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: nowH * ROW }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              )}
              {blocks.map((b) => <Block key={b.id} b={b} />)}
              {free.map((p) => (
                <div key={p.id} className="absolute left-1 right-1" style={{ top: p._start * ROW + 2 }}>
                  <Chip c={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}