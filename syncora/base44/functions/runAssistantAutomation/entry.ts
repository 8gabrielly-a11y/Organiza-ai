import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SLOT_STEP = 15;
const DEFAULT_DURATION = 60;

function pad(n) { return String(n).padStart(2, '0'); }
function timeToMinutes(time) {
  const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}
function minutesToTime(total) {
  const safe = Math.max(0, Math.min(1439, Math.round(total)));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}
function nowInZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    iso: new Date().toISOString()
  };
}
function addDaysYmd(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function compareYmd(a, b) { return String(a || '').localeCompare(String(b || '')); }
function weekdayForYmd(dateStr) { return new Date(`${dateStr}T12:00:00Z`).getUTCDay(); }
function parseWindow(value) {
  const m = String(value || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2]);
  const b = Number(m[3]) * 60 + Number(m[4]);
  return b > a ? [a, b] : null;
}
function windowForGroup(group) {
  const custom = parseWindow(group?.time_window);
  if (custom) return custom;
  const name = String(group?.name || '').toLowerCase();
  if (name.includes('trabalh')) return [9 * 60, 18 * 60];
  if (name.includes('casa')) return [18 * 60, 21 * 60];
  if (name.includes('faculd') || name.includes('estud')) return [8 * 60, 22 * 60];
  return [9 * 60, 20 * 60];
}
function preferredWindow(base, period) {
  const ranges = { morning: [300, 720], afternoon: [720, 1080], evening: [1080, 1439] };
  if (!ranges[period]) return base;
  const out = [Math.max(base[0], ranges[period][0]), Math.min(base[1], ranges[period][1])];
  return out[1] > out[0] ? out : base;
}
function interval(start, end) { return start != null && end != null && end > start ? { start, end } : null; }
function commitmentInterval(c) {
  const start = timeToMinutes(c.scheduled_time);
  if (start == null) return null;
  const explicitEnd = timeToMinutes(c.end_time);
  const duration = Number(c.duration_minutes) > 0 ? Number(c.duration_minutes) : DEFAULT_DURATION;
  return interval(start, explicitEnd != null && explicitEnd > start ? explicitEnd : start + duration);
}
function taskInterval(t) {
  const start = timeToMinutes(t.scheduled_time);
  if (start == null) return null;
  const explicitEnd = timeToMinutes(t.scheduled_end_time);
  const duration = Number(t.duration_minutes) > 0 ? Number(t.duration_minutes) : DEFAULT_DURATION;
  return interval(start, explicitEnd != null && explicitEnd > start ? explicitEnd : start + duration);
}
function overlaps(a, b) { return a.start < b.end && b.start < a.end; }
function mergeIntervals(items) {
  const sorted = items.filter(Boolean).sort((a, b) => a.start - b.start);
  const out = [];
  for (const current of sorted) {
    const last = out[out.length - 1];
    if (!last || current.start > last.end) out.push({ ...current });
    else last.end = Math.max(last.end, current.end);
  }
  return out;
}
function recurringApplies(c, date) {
  return Boolean(c.is_recurring && Array.isArray(c.rrule_days) && c.rrule_days.includes(weekdayForYmd(date)));
}
function busyForDate(date, commitments, recurring, tasks, ignoreTaskId) {
  const all = [];
  for (const c of commitments) {
    if (c.parent_id || c.status === 'done' || c.status === 'skipped' || c.scheduled_date !== date) continue;
    const i = commitmentInterval(c); if (i) all.push(i);
  }
  for (const c of recurring) {
    if (c.status === 'done' || c.status === 'skipped' || !recurringApplies(c, date)) continue;
    const i = commitmentInterval(c); if (i) all.push(i);
  }
  for (const t of tasks) {
    if (t.id === ignoreTaskId || t.done || t.planning_status === 'completed') continue;
    if ((t.planned_date || t.due_date) !== date) continue;
    const i = taskInterval(t); if (i) all.push(i);
  }
  return mergeIntervals(all);
}
function findTaskSlot({ now, task, group, commitments, recurring, tasks }) {
  const due = task.due_date || now.date;
  let startDate = compareYmd(task.earliest_date || now.date, now.date) > 0 ? task.earliest_date : now.date;
  if (compareYmd(due, startDate) < 0) return null;
  const duration = Math.max(SLOT_STEP, Number(task.duration_minutes) || DEFAULT_DURATION);

  for (let date = startDate; compareYmd(date, due) <= 0; date = addDaysYmd(date, 1)) {
    let [a, b] = preferredWindow(windowForGroup(group), task.preferred_period || 'any');
    if (date === now.date) a = Math.max(a, Math.ceil((now.minutes + 1) / SLOT_STEP) * SLOT_STEP);
    if (date === startDate && task.earliest_time) {
      const e = timeToMinutes(task.earliest_time); if (e != null) a = Math.max(a, e);
    }
    if (date === due && task.deadline_time) {
      const d = timeToMinutes(task.deadline_time); if (d != null) b = Math.min(b, d);
    }
    const busy = busyForDate(date, commitments, recurring, tasks, task.id);
    for (let start = a; start + duration <= b; start += SLOT_STEP) {
      const candidate = { start, end: start + duration };
      if (!busy.some((x) => overlaps(candidate, x))) {
        return { planned_date: date, scheduled_time: minutesToTime(start), scheduled_end_time: minutesToTime(start + duration) };
      }
    }
  }
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const settingsList = await base44.entities.UserSettings.filter({ created_by_id: user.id });
    const settings = settingsList[0] || {};
    if (settings.notifications_enabled === false) return Response.json({ notifications: [], changes: [] });

    const timeZone = settings.timezone || 'America/Sao_Paulo';
    const now = nowInZone(timeZone);
    const [groups, allCommitments, tasks, reminderRows] = await Promise.all([
      base44.entities.Group.list(),
      base44.entities.Commitment.list('-created_date', 500),
      base44.entities.TaskItem.list('-created_date', 500),
      base44.entities.AssistantReminder.list('-created_date', 500)
    ]);
    const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));
    const recurring = allCommitments.filter((c) => c.is_recurring);
    const commitments = allCommitments.filter((c) => !c.is_recurring);
    const sent = new Set(reminderRows.map((r) => r.reminder_key));
    const notifications = [];
    const changes = [];

    async function emit({ key, kind, itemType, itemId, title, message }) {
      if (sent.has(key)) return;
      sent.add(key);
      await base44.entities.AssistantReminder.create({
        item_type: itemType,
        item_id: itemId || '',
        reminder_key: key,
        kind,
        title: title || 'Syncora',
        message,
        triggered_at: now.iso,
        read: false
      });
      notifications.push({ key, kind, item_type: itemType, item_id: itemId || '', title: title || 'Syncora', message });
    }

    // Compromissos: lembrete 15 min antes e no horário.
    for (const c of commitments) {
      if (c.parent_id || c.status === 'done' || c.status === 'skipped' || c.scheduled_date !== now.date) continue;
      const start = timeToMinutes(c.scheduled_time);
      if (start == null) continue;
      if (now.minutes >= start - 15 && now.minutes < start) {
        await emit({ key: `commitment:${c.id}:${c.scheduled_date}:${c.scheduled_time}:upcoming`, kind: 'upcoming', itemType: 'commitment', itemId: c.id, title: c.title, message: `Daqui a ${Math.max(1, start - now.minutes)} min: ${c.title}.` });
      }
      if (now.minutes >= start && now.minutes <= start + 14) {
        await emit({ key: `commitment:${c.id}:${c.scheduled_date}:${c.scheduled_time}:start`, kind: 'start', itemType: 'commitment', itemId: c.id, title: c.title, message: `Agora: ${c.title}.` });
      }
    }

    // Tarefas: iniciar, detectar perda e reorganizar automaticamente.
    for (const task of tasks) {
      if (task.done || task.planning_status === 'completed') continue;
      const plannedDate = task.planned_date || '';
      const start = timeToMinutes(task.scheduled_time);
      const end = timeToMinutes(task.scheduled_end_time) ?? (start != null ? start + (Number(task.duration_minutes) || DEFAULT_DURATION) : null);

      if (task.planning_status === 'snoozed' && task.snoozed_until) {
        const snoozeTime = Date.parse(task.snoozed_until);
        if (Number.isFinite(snoozeTime) && Date.now() >= snoozeTime) {
          await base44.entities.TaskItem.update(task.id, { planning_status: 'scheduled', snoozed_until: '' });
          task.planning_status = 'scheduled'; task.snoozed_until = '';
          await emit({ key: `task:${task.id}:snooze:${task.snoozed_until || snoozeTime}`, kind: 'follow_up', itemType: 'task', itemId: task.id, title: task.name, message: `Você pediu para eu lembrar: ${task.name}. Vai começar agora?` });
        } else {
          continue;
        }
      }

      if (plannedDate === now.date && start != null && now.minutes >= start && now.minutes <= start + 14 && ['scheduled', 'rescheduled'].includes(task.planning_status || 'scheduled')) {
        await emit({ key: `task:${task.id}:${plannedDate}:${task.scheduled_time}:start`, kind: 'start', itemType: 'task', itemId: task.id, title: task.name, message: `Hora de ${task.name}. Você vai começar agora?` });
      }

      const missedToday = plannedDate === now.date && end != null && now.minutes > end + 10;
      const missedPastDay = plannedDate && compareYmd(plannedDate, now.date) < 0;
      if ((missedToday || missedPastDay) && !['started', 'missed'].includes(task.planning_status)) {
        await base44.entities.TaskItem.update(task.id, { planning_status: 'missed' });
        task.planning_status = 'missed';

        const slot = findTaskSlot({ now, task, group: groupMap[task.group_id], commitments, recurring, tasks });
        if (slot) {
          const count = Number(task.reschedule_count || 0) + 1;
          await base44.entities.TaskItem.update(task.id, {
            ...slot,
            planning_status: 'rescheduled',
            last_rescheduled_at: now.iso,
            reschedule_count: count
          });
          Object.assign(task, slot, { planning_status: 'rescheduled', reschedule_count: count });
          changes.push({ type: 'rescheduled', task_id: task.id, ...slot });
          await emit({
            key: `task:${task.id}:${slot.planned_date}:${slot.scheduled_time}:rescheduled:${count}`,
            kind: 'rescheduled', itemType: 'task', itemId: task.id, title: task.name,
            message: `Você não conseguiu fazer ${task.name}. Reorganizei para ${slot.planned_date} às ${slot.scheduled_time}.`
          });
        } else {
          changes.push({ type: 'deadline_risk', task_id: task.id });
          await emit({
            key: `task:${task.id}:${now.date}:deadline-risk`, kind: 'deadline_risk', itemType: 'task', itemId: task.id, title: task.name,
            message: `Atenção: não encontrei outro horário livre para ${task.name} antes do prazo${task.due_date ? ` (${task.due_date})` : ''}.`
          });
        }
      }

      if (task.due_date === now.date && task.deadline_time) {
        const deadline = timeToMinutes(task.deadline_time);
        if (deadline != null && deadline - now.minutes <= 120 && deadline - now.minutes >= 0) {
          await emit({
            key: `task:${task.id}:${task.due_date}:${task.deadline_time}:deadline`, kind: 'deadline_risk', itemType: 'task', itemId: task.id, title: task.name,
            message: `Prazo próximo: ${task.name} vence hoje às ${task.deadline_time}.`
          });
        }
      }
    }

    return Response.json({ now, notifications, changes });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
