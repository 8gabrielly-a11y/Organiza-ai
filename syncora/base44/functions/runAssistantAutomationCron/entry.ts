import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import webpush from 'npm:web-push@3.6.7';

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


function ownerOf(row) { return row?.owner_user_id || row?.created_by_id || row?.created_by || ''; }

async function sendPushToUser(base44, subscriptions, userId, payload) {
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:syncora@example.com';
  if (!vapidPublic || !vapidPrivate) return { sent: 0, disabled: 0, error: 'VAPID não configurado' };
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  let sent = 0;
  let disabled = 0;
  for (const row of subscriptions.filter((x) => x.enabled !== false && ownerOf(x) === userId)) {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      sent += 1;
      await base44.asServiceRole.entities.PushSubscription.update(row.id, { last_seen_at: new Date().toISOString(), last_error: '' });
    } catch (error) {
      const status = Number(error?.statusCode || error?.status || 0);
      if (status === 404 || status === 410) {
        disabled += 1;
        await base44.asServiceRole.entities.PushSubscription.update(row.id, { enabled: false, last_error: `Subscription expirada (${status})` });
      } else {
        await base44.asServiceRole.entities.PushSubscription.update(row.id, { last_error: String(error?.message || error).slice(0, 500) });
      }
    }
  }
  return { sent, disabled };
}

export default async function(req) {
  try {
    const expected = Deno.env.get('CRON_SHARED_SECRET') || '';
    const provided = req.headers.get('x-syncora-cron-secret') || '';
    if (!expected || provided !== expected) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const base44 = createClientFromRequest(req);
    const [settingsRows, groups, allCommitments, tasks, reminderRows, subscriptions] = await Promise.all([
      base44.asServiceRole.entities.UserSettings.list('-created_date', 1000),
      base44.asServiceRole.entities.Group.list('-created_date', 5000),
      base44.asServiceRole.entities.Commitment.list('-created_date', 10000),
      base44.asServiceRole.entities.TaskItem.list('-created_date', 10000),
      base44.asServiceRole.entities.AssistantReminder.list('-created_date', 10000),
      base44.asServiceRole.entities.PushSubscription.list('-created_date', 5000)
    ]);

    const summary = { users_checked: 0, pushes_sent: 0, reminders_created: 0, tasks_rescheduled: 0, deadline_risks: 0 };

    for (const settings of settingsRows) {
      const userId = ownerOf(settings);
      if (!userId || settings.notifications_enabled === false) continue;
      summary.users_checked += 1;
      const timeZone = settings.timezone || 'America/Sao_Paulo';
      const now = nowInZone(timeZone);
      const userGroups = groups.filter((x) => ownerOf(x) === userId);
      const userCommitmentsAll = allCommitments.filter((x) => ownerOf(x) === userId);
      const userTasks = tasks.filter((x) => ownerOf(x) === userId);
      const userReminders = reminderRows.filter((x) => (x.owner_user_id || ownerOf(x)) === userId);
      const groupMap = Object.fromEntries(userGroups.map((g) => [g.id, g]));
      const recurring = userCommitmentsAll.filter((c) => c.is_recurring);
      const commitments = userCommitmentsAll.filter((c) => !c.is_recurring);
      const sentKeys = new Set(userReminders.map((r) => r.reminder_key));

      async function emit({ key, kind, itemType, itemId, title, message, url }) {
        if (sentKeys.has(key)) return;
        sentKeys.add(key);
        await base44.asServiceRole.entities.AssistantReminder.create({
          owner_user_id: userId,
          item_type: itemType,
          item_id: itemId || '',
          reminder_key: key,
          kind,
          title: title || 'Syncora',
          message,
          triggered_at: now.iso,
          read: false
        });
        summary.reminders_created += 1;
        const result = await sendPushToUser(base44, subscriptions, userId, {
          key, kind, item_type: itemType, item_id: itemId || '', title: title || 'Syncora', message,
          url: url || (itemType === 'task' ? '/plano' : '/')
        });
        summary.pushes_sent += result.sent || 0;
      }

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

      for (const task of userTasks) {
        if (task.done || task.planning_status === 'completed') continue;
        const plannedDate = task.planned_date || '';
        const start = timeToMinutes(task.scheduled_time);
        const end = timeToMinutes(task.scheduled_end_time) ?? (start != null ? start + (Number(task.duration_minutes) || DEFAULT_DURATION) : null);

        if (task.planning_status === 'snoozed' && task.snoozed_until) {
          const snoozeTime = Date.parse(task.snoozed_until);
          if (Number.isFinite(snoozeTime) && Date.now() >= snoozeTime) {
            await base44.asServiceRole.entities.TaskItem.update(task.id, { planning_status: 'scheduled', snoozed_until: '' });
            task.planning_status = 'scheduled';
            const snoozeKey = String(snoozeTime);
            task.snoozed_until = '';
            await emit({ key: `task:${task.id}:snooze:${snoozeKey}`, kind: 'follow_up', itemType: 'task', itemId: task.id, title: task.name, message: `Você pediu para eu lembrar: ${task.name}. Vai começar agora?` });
          } else continue;
        }

        if (plannedDate === now.date && start != null && now.minutes >= start && now.minutes <= start + 14 && ['scheduled', 'rescheduled'].includes(task.planning_status || 'scheduled')) {
          await emit({ key: `task:${task.id}:${plannedDate}:${task.scheduled_time}:start`, kind: 'start', itemType: 'task', itemId: task.id, title: task.name, message: `Hora de ${task.name}. Você vai começar agora?` });
        }

        const missedToday = plannedDate === now.date && end != null && now.minutes > end + 10;
        const missedPastDay = plannedDate && compareYmd(plannedDate, now.date) < 0;
        if ((missedToday || missedPastDay) && !['started', 'missed'].includes(task.planning_status)) {
          await base44.asServiceRole.entities.TaskItem.update(task.id, { planning_status: 'missed' });
          task.planning_status = 'missed';
          const slot = findTaskSlot({ now, task, group: groupMap[task.group_id], commitments, recurring, tasks: userTasks });
          if (slot) {
            const count = Number(task.reschedule_count || 0) + 1;
            await base44.asServiceRole.entities.TaskItem.update(task.id, { ...slot, planning_status: 'rescheduled', last_rescheduled_at: now.iso, reschedule_count: count });
            Object.assign(task, slot, { planning_status: 'rescheduled', reschedule_count: count });
            summary.tasks_rescheduled += 1;
            await emit({ key: `task:${task.id}:${slot.planned_date}:${slot.scheduled_time}:rescheduled:${count}`, kind: 'rescheduled', itemType: 'task', itemId: task.id, title: task.name, message: `Você não conseguiu fazer ${task.name}. Reorganizei para ${slot.planned_date} às ${slot.scheduled_time}.` });
          } else {
            summary.deadline_risks += 1;
            await emit({ key: `task:${task.id}:${now.date}:deadline-risk`, kind: 'deadline_risk', itemType: 'task', itemId: task.id, title: task.name, message: `Atenção: não encontrei outro horário livre para ${task.name} antes do prazo${task.due_date ? ` (${task.due_date})` : ''}.` });
          }
        }

        if (task.due_date === now.date && task.deadline_time) {
          const deadline = timeToMinutes(task.deadline_time);
          if (deadline != null && deadline - now.minutes <= 120 && deadline - now.minutes >= 0) {
            await emit({ key: `task:${task.id}:${task.due_date}:${task.deadline_time}:deadline`, kind: 'deadline_risk', itemType: 'task', itemId: task.id, title: task.name, message: `Prazo próximo: ${task.name} vence hoje às ${task.deadline_time}.` });
          }
        }
      }
    }

    return Response.json({ ok: true, ...summary, executed_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
