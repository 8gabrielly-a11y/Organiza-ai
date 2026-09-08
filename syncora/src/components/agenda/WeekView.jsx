import React from 'react';
import { eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { appliesOnDate, toAgendaItem, ymd, itemStyle } from '@/lib/agendaUtils';
import { todayStr } from '@/lib/dateUtils';

export default function WeekView({ start, end, commitments, tasks, groupMap, settings, onToggle }) {
  const days = eachDayOfInterval({ start, end });
  const all = [...commitments.filter((c) => !c.parent_id), ...tasks.map(toAgendaItem)];
  const today = todayStr();

  const MiniChip = ({ c }) => {
    const done = c.status === 'done';
    const g = groupMap[c.group_id];
    const st = itemStyle(c, g, settings);
    return (
      <div className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs ${done ? 'opacity-50' : ''}`} style={{ backgroundColor: st.fill, borderColor: st.color, color: st.solid ? '#fff' : undefined }}>
        <button onClick={() => onToggle(c)} className="shrink-0">
          <Check className={`w-3 h-3 rounded-full border p-0.5 ${done ? 'bg-primary text-primary-foreground border-primary' : ''}`} style={!done ? { borderColor: st.solid ? '#fff' : st.color, color: st.solid ? '#fff' : undefined } : {}} />
        </button>
        {c.scheduled_time && (
          <span className="text-[10px] shrink-0 tabular-nums opacity-80">{c.scheduled_time}</span>
        )}
        <span className={`truncate ${done ? 'line-through' : ''}`}>{c.title}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((d) => {
        const ds = ymd(d);
        const items = all
          .filter((c) => appliesOnDate(c, ds))
          .sort((a, b) => (a.scheduled_time || '99:99').localeCompare(b.scheduled_time || '99:99'));
        const isToday = ds === today;
        return (
          <div key={ds} className={`rounded-xl border p-2 min-h-[110px] ${isToday ? 'border-primary bg-primary/5' : 'bg-card'}`}>
            <div className="text-xs font-medium capitalize mb-2 flex items-baseline justify-between">
              <span>{format(d, 'EEE', { locale: ptBR })}</span>
              <span className={isToday ? 'text-primary font-bold' : 'text-muted-foreground'}>{format(d, 'dd')}</span>
            </div>
            <div className="space-y-1">
              {items.map((c) => <MiniChip key={c.id} c={c} />)}
              {items.length === 0 && <p className="text-[10px] text-muted-foreground/60 py-2 text-center">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}