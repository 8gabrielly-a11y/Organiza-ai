export const appliesOnDate = (c, dateStr) => {
  if (c.is_recurring && c.rrule_days?.length) {
    const d = new Date(dateStr + 'T00:00:00');
    return c.rrule_days.includes(d.getDay());
  }
  return c.scheduled_date === dateStr;
};

export const toAgendaItem = (t) => ({
  ...t,
  _task: true,
  title: t.name,
  status: t.done ? 'done' : 'pending',
  scheduled_date: t.planned_date || t.due_date,
  end_time: t.scheduled_end_time || ''
});

export const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const itemColor = (item, group, settings) => {
  if (settings?.agenda_color_mode === 'tipo') {
    return item._task
      ? (settings.task_color || '#f59e0b')
      : (settings.commitment_color || '#3b82f6');
  }
  return group?.color || '#94a3b8';
};

export const hexToRgba = (hex, alpha) => {
  const h = (hex || '#94a3b8').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const itemStyle = (item, group, settings) => {
  const base = itemColor(item, group, settings);
  if (settings?.agenda_color_mode === 'tipo') {
    if (item._task) {
      const op = (settings.task_opacity ?? 100) / 100;
      return { color: base, fill: hexToRgba(base, op), solid: op >= 0.5 };
    }
    const op = (settings.commitment_opacity ?? 18) / 100;
    return { color: base, fill: hexToRgba(base, op), solid: false };
  }
  return { color: base, fill: hexToRgba(base, 0.18), solid: false };
};