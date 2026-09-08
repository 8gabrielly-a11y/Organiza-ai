import React from 'react';
import { Check, Clock } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { appliesOnDate, toAgendaItem, ymd, itemStyle } from '@/lib/agendaUtils';

const Row = ({ c, groupMap, settings, onToggle }) => {
  const g = groupMap[c.group_id];
  const st = itemStyle(c, g, settings);
  const done = c.status === 'done';
  const isSub = g && g.parent_id;
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm" style={{ backgroundColor: st.fill, color: st.solid ? '#fff' : undefined }}>
      <button onClick={() => onToggle(c)} className="shrink-0">
        <Check
          className={`w-4 h-4 rounded-full border p-0.5 ${done ? 'bg-primary text-primary-foreground border-primary' : ''}`}
          style={!done ? { borderColor: st.solid ? '#fff' : st.color, color: st.solid ? '#fff' : undefined } : {}}
        />
      </button>
      <span className={`flex-1 truncate ${done ? 'line-through opacity-50' : ''}`}>{c.title}</span>
      {c.scheduled_time && (
        <span className="text-xs flex items-center gap-0.5 shrink-0 tabular-nums opacity-80">
          <Clock className="w-3 h-3" />
          {c.scheduled_time}
        </span>
      )}
      {c._task && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: st.solid ? 'rgba(255,255,255,0.25)' : st.color + '22', color: st.solid ? '#fff' : st.color }}>
          Tarefa
        </span>
      )}
      {isSub && <span className="text-[10px] shrink-0 opacity-70">{g.name}</span>}
    </div>
  );
};

export default function GroupChecklist({ date, commitments, tasks, groupMap, settings, onToggle }) {
  const dateStr = ymd(date);
  const all = [...commitments.filter((c) => !c.parent_id), ...tasks.map(toAgendaItem)];
  const dayItems = all.filter((c) => appliesOnDate(c, dateStr));

  const resolveTop = (gid) => {
    const g = groupMap[gid];
    if (!g) return null;
    return g.parent_id ? groupMap[g.parent_id] || g : g;
  };

  const byGroup = {};
  dayItems.forEach((item) => {
    const top = resolveTop(item.group_id);
    const key = top?.id || 'none';
    (byGroup[key] ||= []).push(item);
  });

  const keys = Object.keys(byGroup).sort((a, b) => {
    if (a === 'none') return 1;
    if (b === 'none') return -1;
    return (groupMap[a]?.order || 0) - (groupMap[b]?.order || 0);
  });

  if (dayItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-xl">
        Nada para este dia.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {keys.map((key) => {
        const top = key === 'none' ? null : groupMap[key];
        const Icon = top ? getIcon(top.icon) : null;
        const items = byGroup[key].sort((a, b) =>
          (a.scheduled_time || '99:99').localeCompare(b.scheduled_time || '99:99')
        );
        const pending = items.filter((i) => i.status !== 'done');
        const done = items.filter((i) => i.status === 'done');
        return (
          <div key={key} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ backgroundColor: (top?.color || '#94a3b8') + '15' }}>
              {Icon && <Icon className="w-4 h-4" style={{ color: top?.color }} />}
              <span className="font-medium text-sm" style={{ color: top?.color }}>
                {top?.name || 'Sem grupo'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{pending.length} pendentes</span>
            </div>
            <div className="p-2 space-y-0.5">
              {pending.map((c) => (
                <Row key={c.id} c={c} groupMap={groupMap} settings={settings} onToggle={onToggle} />
              ))}
              {done.map((c) => (
                <Row key={c.id} c={c} groupMap={groupMap} settings={settings} onToggle={onToggle} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}