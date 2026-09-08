import React from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appliesOnDate, toAgendaItem, ymd, itemStyle } from '@/lib/agendaUtils';
import { todayStr } from '@/lib/dateUtils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MonthView({ cursor, commitments, tasks, groupMap, settings, onSelectDate }) {
  const gridStart = startOfWeek(startOfMonth(cursor));
  const gridEnd = endOfWeek(endOfMonth(cursor));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const all = [...commitments.filter((c) => !c.parent_id), ...tasks.map(toAgendaItem)];
  const today = todayStr();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs text-center text-muted-foreground font-medium py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const ds = ymd(d);
          const inMonth = isSameMonth(d, cursor);
          const isToday = ds === today;
          const items = all.filter((c) => appliesOnDate(c, ds));
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(d)}
              className={`rounded-lg border p-1.5 min-h-[78px] text-left align-top transition hover:border-primary/50 ${inMonth ? 'bg-card' : 'bg-muted/30 opacity-50'} ${isToday ? 'border-primary' : 'border-border'}`}
            >
              <div className={`text-xs mb-1 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {format(d, 'dd')}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((c) => {
                  const g = groupMap[c.group_id];
                  const st = itemStyle(c, g, settings);
                  return (
                    <div key={c.id} className="text-[10px] truncate flex items-center gap-1 rounded px-1" style={{ backgroundColor: st.fill, color: st.solid ? '#fff' : undefined }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      {c.scheduled_time && <span className="shrink-0 opacity-80">{c.scheduled_time}</span>}
                      <span className={`truncate ${c.status === 'done' ? 'line-through opacity-60' : ''}`}>{c.title}</span>
                    </div>
                  );
                })}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} mais</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}