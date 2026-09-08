import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const TONE_DESCRIPTIONS = {
  amigo: 'amigável, caloroso e encorajador. Você sugere com gentileza, pergunta se a pessoa quer fazer agora ou deixar pra depois, e comemora conquistas. Usa o nome da pessoa com carinho.',
  coach: 'firme e motivador, direto ao ponto. Você diz o que precisa ser feito agora, cobra com assertividade e energia, mas sem ser rude.',
  neutro: 'neutro e objetivo, sem emoção. Apenas organiza e informa o que foi feito.',
  direto: 'direto e prático. Frases curtas, foco em ação imediata, sem enrolação.'
};

const DEFAULT_DURATION = 60;
const SLOT_STEP = 15;

function pad(n) {
  return String(n).padStart(2, '0');
}

function timeToMinutes(time) {
  if (!time || typeof time !== 'string') return null;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function minutesToTime(total) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

function ymdInTimeZone(timeZone, offsetDays = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const anchor = new Date(`${values.year}-${values.month}-${values.day}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + offsetDays);
  return `${anchor.getUTCFullYear()}-${pad(anchor.getUTCMonth() + 1)}-${pad(anchor.getUTCDate())}`;
}

function addDaysYmd(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function compareYmd(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

function weekdayForYmd(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

function parseTimeWindow(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  return end > start ? [start, end] : null;
}

function windowForGroup(group) {
  const custom = parseTimeWindow(group?.time_window);
  if (custom) return custom;
  const name = (group?.name || '').toLowerCase();
  if (name.includes('trabalh')) return [9 * 60, 18 * 60];
  if (name.includes('casa')) return [18 * 60, 21 * 60];
  if (name.includes('faculd') || name.includes('estud')) return [8 * 60, 22 * 60];
  return [9 * 60, 20 * 60];
}

function preferredWindow(baseWindow, period) {
  const ranges = {
    morning: [5 * 60, 12 * 60],
    afternoon: [12 * 60, 18 * 60],
    evening: [18 * 60, 23 * 60 + 59]
  };
  if (!period || period === 'any' || !ranges[period]) return baseWindow;
  const [a, b] = baseWindow;
  const [c, d] = ranges[period];
  const result = [Math.max(a, c), Math.min(b, d)];
  return result[1] > result[0] ? result : baseWindow;
}

function normalizeInterval(start, end) {
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function commitmentInterval(c) {
  const start = timeToMinutes(c.scheduled_time);
  if (start == null) return null;
  const explicitEnd = timeToMinutes(c.end_time);
  const duration = Number(c.duration_minutes) > 0 ? Number(c.duration_minutes) : DEFAULT_DURATION;
  return normalizeInterval(start, explicitEnd != null && explicitEnd > start ? explicitEnd : start + duration);
}

function taskInterval(t) {
  const start = timeToMinutes(t.scheduled_time);
  if (start == null) return null;
  const explicitEnd = timeToMinutes(t.scheduled_end_time);
  const duration = Number(t.duration_minutes) > 0 ? Number(t.duration_minutes) : DEFAULT_DURATION;
  return normalizeInterval(start, explicitEnd != null && explicitEnd > start ? explicitEnd : start + duration);
}

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function mergeIntervals(intervals) {
  const sorted = intervals.filter(Boolean).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (!last || current.start > last.end) merged.push({ ...current });
    else last.end = Math.max(last.end, current.end);
  }
  return merged;
}

function recurringApplies(c, dateStr) {
  return Boolean(c.is_recurring && Array.isArray(c.rrule_days) && c.rrule_days.includes(weekdayForYmd(dateStr)));
}

function busyForDate(dateStr, commitments, recurring, tasks, ignoreTaskId = '') {
  const intervals = [];
  for (const c of commitments) {
    if (c.parent_id || c.status === 'skipped' || c.status === 'done') continue;
    if (c.scheduled_date !== dateStr) continue;
    const interval = commitmentInterval(c);
    if (interval) intervals.push(interval);
  }
  for (const c of recurring) {
    if (c.status === 'skipped' || c.status === 'done' || !recurringApplies(c, dateStr)) continue;
    const interval = commitmentInterval(c);
    if (interval) intervals.push(interval);
  }
  for (const t of tasks) {
    if (t.id === ignoreTaskId || t.done || t.planning_status === 'completed') continue;
    const plannedDate = t.planned_date || t.due_date;
    if (plannedDate !== dateStr) continue;
    const interval = taskInterval(t);
    if (interval) intervals.push(interval);
  }
  return mergeIntervals(intervals);
}

function findFreeSlot({ dateStr, group, durationMinutes, deadlineTime, earliestTime, preferredPeriod, busy }) {
  const duration = Math.max(SLOT_STEP, Number(durationMinutes) || DEFAULT_DURATION);
  let [windowStart, windowEnd] = preferredWindow(windowForGroup(group), preferredPeriod || 'any');
  const earliest = timeToMinutes(earliestTime);
  if (earliest != null) windowStart = Math.max(windowStart, earliest);
  const deadline = timeToMinutes(deadlineTime);
  if (deadline != null) windowEnd = Math.min(windowEnd, deadline);

  for (let start = windowStart; start + duration <= windowEnd; start += SLOT_STEP) {
    const candidate = { start, end: start + duration };
    if (!busy.some((b) => overlaps(candidate, b))) {
      return {
        planned_date: dateStr,
        scheduled_time: minutesToTime(start),
        scheduled_end_time: minutesToTime(start + duration)
      };
    }
  }
  return null;
}

function findTaskSlot({ today, dueDate, earliestDate, earliestTime, group, durationMinutes, deadlineTime, preferredPeriod, commitments, recurring, tasks, ignoreTaskId = '' }) {
  let startDate = earliestDate && compareYmd(earliestDate, today) > 0 ? earliestDate : today;
  const endDate = dueDate && compareYmd(dueDate, startDate) >= 0 ? dueDate : startDate;

  for (let date = startDate; compareYmd(date, endDate) <= 0; date = addDaysYmd(date, 1)) {
    const busy = busyForDate(date, commitments, recurring, tasks, ignoreTaskId);
    const slot = findFreeSlot({
      dateStr: date,
      group,
      durationMinutes,
      deadlineTime: date === dueDate ? deadlineTime : '',
      earliestTime: date === startDate ? earliestTime : '',
      preferredPeriod,
      busy
    });
    if (slot) return slot;
  }
  return null;
}

function resolveGroup(groups, requestedName, fallbackId) {
  if (requestedName) {
    const requested = String(requestedName).trim().toLowerCase();
    const exact = groups.find((g) => String(g.name || '').trim().toLowerCase() === requested);
    if (exact) return exact;
  }
  return fallbackId ? groups.find((g) => g.id === fallbackId) || null : null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = body?.message;
    const groupId = body?.group_id || '';
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Mensagem inválida' }, { status: 400 });
    }

    const settingsList = await base44.entities.UserSettings.filter({ created_by_id: user.id });
    const settings = settingsList[0] || {};
    const apiKey = settings.gemini_api_key;
    if (!apiKey) {
      return Response.json({ error: 'Configure sua chave da API Gemini nas configurações antes de conversar.' }, { status: 400 });
    }

    const userName = settings.user_name || 'amigo';
    const tone = settings.tone || 'amigo';
    const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.amigo;
    const timeZone = settings.timezone || 'America/Sao_Paulo';

    const groups = await base44.entities.Group.list();
    const activeGroup = groupId ? groups.find((g) => g.id === groupId) : null;
    const groupNames = groups.map((g) => g.name);

    const today = ymdInTimeZone(timeZone, 0);
    const tomorrow = ymdInTimeZone(timeZone, 1);

    const [allCommitments, allTasks] = await Promise.all([
      base44.entities.Commitment.list('-created_date', 500),
      base44.entities.TaskItem.list('-created_date', 500)
    ]);
    const recurring = allCommitments.filter((c) => c.is_recurring);
    const datedCommitments = allCommitments.filter((c) => !c.is_recurring);

    const contextCommitments = datedCommitments.filter((c) => {
      if (groupId && c.group_id !== groupId) return false;
      return [today, tomorrow].includes(c.scheduled_date) && ['pending', 'rescheduled'].includes(c.status) && !c.parent_id;
    });
    const contextTasks = allTasks.filter((t) => {
      if (groupId && t.group_id !== groupId) return false;
      if (t.done || t.planning_status === 'completed') return false;
      return [today, tomorrow].includes(t.planned_date || t.due_date) || [today, tomorrow].includes(t.due_date);
    });

    const commitmentsContext = contextCommitments.map((c) => {
      const g = groups.find((gr) => gr.id === c.group_id);
      return `- COMPROMISSO id:${c.id} | ${c.title} | grupo:${g ? g.name : '-'} | data:${c.scheduled_date} ${c.scheduled_time || ''}-${c.end_time || ''} | prioridade:${c.priority || 'medium'}`;
    }).join('\n');
    const tasksContext = contextTasks.map((t) => {
      const g = groups.find((gr) => gr.id === t.group_id);
      return `- TAREFA id:${t.id} | ${t.name} | grupo:${g ? g.name : '-'} | planejada:${t.planned_date || '-'} ${t.scheduled_time || ''}-${t.scheduled_end_time || ''} | prazo:${t.due_date || '-'} ${t.deadline_time || ''} | duração:${t.duration_minutes || DEFAULT_DURATION}min | estado:${t.planning_status || (t.done ? 'completed' : 'scheduled')}`;
    }).join('\n');

    const allMsgs = await base44.entities.ChatMessage.list('-created_date', 50);
    const history = allMsgs.filter((m) => (groupId ? m.group_id === groupId : !m.group_id)).slice(0, 10);
    const historyReversed = [...history].reverse();

    const groupContextLine = activeGroup
      ? `Você está DENTRO do grupo "${activeGroup.name}". Por padrão, novos itens devem ser criados neste grupo, salvo indicação explícita de outro grupo.`
      : 'Você está no chat geral. Use o grupo mencionado pelo usuário; se não houver grupo identificável, deixe vazio.';

    const systemInstruction = `Você é o Syncora, um assistente pessoal ativo de organização e planejamento diário, conversando em português brasileiro com ${userName}.
Seu tom: ${toneDesc}.
Fuso horário: ${timeZone}. Hoje=${today}. Amanhã=${tomorrow}.

${groupContextLine}
Grupos disponíveis: ${groupNames.join(', ') || 'nenhum'}.

Itens relevantes:
${commitmentsContext || 'nenhum compromisso relevante'}
${tasksContext || 'nenhuma tarefa relevante'}

REGRAS DE INTERPRETAÇÃO:
- COMPROMISSO = evento com horário fixo. Use create_commitment. Informe scheduled_date, scheduled_time e, se souber, end_time ou duration_minutes.
- TAREFA = algo que precisa ser executado. due_date é PRAZO, não o momento de execução. Use create_task e informe duration_minutes quando houver indicação explícita ou uma estimativa razoável; se não souber, use 60.
- Para tarefa, você pode informar deadline_time, earliest_date, earliest_time, preferred_period (any/morning/afternoon/evening), priority, energy_level, splittable e minimum_block_minutes. O motor do Syncora escolhe o bloco livre real.
- Nunca escolha scheduled_time para create_task: o motor calcula horários por intervalos de 15 minutos, respeitando duração, compromissos, recorrências, tarefas já planejadas e janela do grupo.
- Rotina recorrente: use create_recurring_commitment com days (0=Dom..6=Sáb), start_time e end_time. Quando a rotina define o horário normal de um grupo, use também set_group_window com HH:MM-HH:MM.
- Quando a pessoa disser que começou uma tarefa, use start_task. Quando terminou, use complete_task (ou complete_commitment se for compromisso). Quando pedir para adiar uma tarefa, use reschedule_task com new_date. Quando pedir alguns minutos, use snooze_task.
- Se o usuário disser que o dia mudou, que saiu mais tarde, que não consegue cumprir o plano, ou pedir reorganização, use replan_day. O motor preserva compromissos fixos e reorganiza tarefas flexíveis.
- Se faltar uma informação realmente essencial, pergunte. Caso contrário, aja com o que já existe.
- O array actions é obrigatório. Nunca diga que criou, concluiu, adiou ou reorganizou algo sem a ação correspondente.
- Responda SEMPRE em JSON válido com reply e actions.

EXEMPLOS:
{"reply":"Vou encaixar o trabalho antes do prazo.","actions":[{"type":"create_task","title":"Trabalho de Resistência","group":"Faculdade","due_date":"${tomorrow}","duration_minutes":120,"priority":"high","splittable":false}]}
{"reply":"Marquei que você começou.","actions":[{"type":"start_task","task_id":"<id>"}]}
{"reply":"Vou reorganizar o restante de hoje.","actions":[{"type":"replan_day","date":"${today}"}]}`;

    const responseSchema = {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['create_commitment', 'create_task', 'create_recurring_commitment', 'set_group_window', 'complete_commitment', 'reschedule_commitment', 'skip_commitment', 'start_task', 'complete_task', 'snooze_task', 'reschedule_task', 'replan_day'] },
              title: { type: 'string' },
              group: { type: 'string' },
              parent_id: { type: 'string' },
              scheduled_date: { type: 'string' },
              scheduled_time: { type: 'string' },
              end_time: { type: 'string' },
              due_date: { type: 'string' },
              deadline_time: { type: 'string' },
              earliest_date: { type: 'string' },
              earliest_time: { type: 'string' },
              location: { type: 'string' },
              notes: { type: 'string' },
              priority: { type: 'string' },
              energy_level: { type: 'string' },
              preferred_period: { type: 'string' },
              splittable: { type: 'boolean' },
              duration_minutes: { type: 'number' },
              minimum_block_minutes: { type: 'number' },
              commitment_id: { type: 'string' },
              task_id: { type: 'string' },
              new_date: { type: 'string' },
              snooze_minutes: { type: 'number' },
              date: { type: 'string' },
              time_window: { type: 'string' },
              days: { type: 'array', items: { type: 'integer' } },
              start_time: { type: 'string' }
            }
          }
        }
      },
      required: ['reply', 'actions']
    };

    const contents = historyReversed.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { responseMimeType: 'application/json', responseSchema }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return Response.json({ error: 'Erro na API Gemini: ' + errText }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { reply: text, actions: [] }; }

    const applied = [];
    const tasksCache = [...allTasks];
    const commitmentsCache = [...datedCommitments];
    const recurringCache = [...recurring];

    for (const action of parsed.actions || []) {
      try {
        if (action.type === 'create_task' && action.title) {
          const group = resolveGroup(groups, action.group, groupId);
          const due = action.due_date || today;
          const duration = Math.max(SLOT_STEP, Number(action.duration_minutes) || DEFAULT_DURATION);
          const slot = findTaskSlot({
            today,
            dueDate: due,
            earliestDate: action.earliest_date || today,
            earliestTime: action.earliest_time || '',
            group,
            durationMinutes: duration,
            deadlineTime: action.deadline_time || '',
            preferredPeriod: action.preferred_period || 'any',
            commitments: commitmentsCache,
            recurring: recurringCache,
            tasks: tasksCache
          });

          const created = await base44.entities.TaskItem.create({
            group_id: group?.id || '',
            name: action.title,
            done: false,
            order: 0,
            due_date: due,
            deadline_time: action.deadline_time || '',
            planned_date: slot?.planned_date || '',
            scheduled_time: slot?.scheduled_time || '',
            scheduled_end_time: slot?.scheduled_end_time || '',
            duration_minutes: duration,
            earliest_date: action.earliest_date || today,
            earliest_time: action.earliest_time || '',
            priority: action.priority || 'medium',
            energy_level: action.energy_level || 'medium',
            splittable: Boolean(action.splittable),
            minimum_block_minutes: Math.max(SLOT_STEP, Number(action.minimum_block_minutes) || 30),
            preferred_period: action.preferred_period || 'any',
            planning_status: slot ? 'scheduled' : 'unscheduled',
            reschedule_count: 0
          });
          tasksCache.push(created);
          applied.push({ type: 'create_task', title: action.title, id: created.id, due_date: due, ...slot, planning_status: slot ? 'scheduled' : 'unscheduled' });
        } else if (action.type === 'create_commitment' && action.title) {
          const group = resolveGroup(groups, action.group, groupId);
          const duration = Math.max(SLOT_STEP, Number(action.duration_minutes) || DEFAULT_DURATION);
          const created = await base44.entities.Commitment.create({
            title: action.title,
            group_id: group?.id || '',
            parent_id: action.parent_id || '',
            status: 'pending',
            scheduled_date: action.scheduled_date || today,
            scheduled_time: action.scheduled_time || '',
            end_time: action.end_time || '',
            duration_minutes: duration,
            location: action.location || '',
            notes: action.notes || '',
            priority: action.priority || 'medium',
            source: 'chat'
          });
          commitmentsCache.push(created);
          applied.push({ type: 'create_commitment', title: action.title, id: created.id });
        } else if (action.type === 'complete_commitment' && action.commitment_id) {
          await base44.entities.Commitment.update(action.commitment_id, { status: 'done' });
          applied.push({ type: 'complete_commitment', id: action.commitment_id });
        } else if (action.type === 'reschedule_commitment' && action.commitment_id) {
          await base44.entities.Commitment.update(action.commitment_id, { status: 'rescheduled', scheduled_date: action.new_date || today });
          applied.push({ type: 'reschedule_commitment', id: action.commitment_id, new_date: action.new_date || today });
        } else if (action.type === 'skip_commitment' && action.commitment_id) {
          await base44.entities.Commitment.update(action.commitment_id, { status: 'skipped' });
          applied.push({ type: 'skip_commitment', id: action.commitment_id });
        } else if (action.type === 'set_group_window') {
          const group = resolveGroup(groups, action.group, groupId);
          if (group?.id && parseTimeWindow(action.time_window)) {
            await base44.entities.Group.update(group.id, { time_window: action.time_window });
            group.time_window = action.time_window;
            applied.push({ type: 'set_group_window', group: group.id, time_window: action.time_window });
          }
        } else if (action.type === 'create_recurring_commitment' && action.title) {
          const group = resolveGroup(groups, action.group, groupId);
          const start = timeToMinutes(action.start_time);
          const end = timeToMinutes(action.end_time);
          const duration = start != null && end != null && end > start ? end - start : DEFAULT_DURATION;
          const created = await base44.entities.Commitment.create({
            title: action.title,
            group_id: group?.id || '',
            status: 'pending',
            scheduled_date: '',
            scheduled_time: action.start_time || '',
            end_time: action.end_time || '',
            duration_minutes: duration,
            is_recurring: true,
            rrule_days: action.days || [],
            location: action.location || '',
            priority: action.priority || 'medium',
            source: 'chat'
          });
          recurringCache.push(created);
          applied.push({ type: 'create_recurring_commitment', title: action.title, id: created.id, days: action.days || [] });
        } else if (action.type === 'start_task' && action.task_id) {
          await base44.entities.TaskItem.update(action.task_id, { planning_status: 'started' });
          applied.push({ type: 'start_task', id: action.task_id });
        } else if (action.type === 'complete_task' && action.task_id) {
          await base44.entities.TaskItem.update(action.task_id, { done: true, planning_status: 'completed' });
          applied.push({ type: 'complete_task', id: action.task_id });
        } else if (action.type === 'snooze_task' && action.task_id) {
          const minutes = Math.max(5, Number(action.snooze_minutes) || 10);
          const until = new Date(Date.now() + minutes * 60000).toISOString();
          await base44.entities.TaskItem.update(action.task_id, { planning_status: 'snoozed', snoozed_until: until });
          applied.push({ type: 'snooze_task', id: action.task_id, snooze_minutes: minutes, snoozed_until: until });
        } else if (action.type === 'reschedule_task' && action.task_id) {
          const existing = tasksCache.find((t) => t.id === action.task_id);
          if (existing) {
            const group = groups.find((g) => g.id === existing.group_id) || null;
            const newDate = action.new_date || today;
            const slot = findTaskSlot({
              today: newDate,
              dueDate: existing.due_date && compareYmd(existing.due_date, newDate) >= 0 ? existing.due_date : newDate,
              earliestDate: newDate,
              earliestTime: '',
              group,
              durationMinutes: existing.duration_minutes || DEFAULT_DURATION,
              deadlineTime: existing.deadline_time || '',
              preferredPeriod: existing.preferred_period || 'any',
              commitments: commitmentsCache,
              recurring: recurringCache,
              tasks: tasksCache,
              ignoreTaskId: existing.id
            });
            await base44.entities.TaskItem.update(existing.id, {
              planned_date: slot?.planned_date || newDate,
              scheduled_time: slot?.scheduled_time || '',
              scheduled_end_time: slot?.scheduled_end_time || '',
              planning_status: slot ? 'rescheduled' : 'unscheduled',
              last_rescheduled_at: new Date().toISOString(),
              reschedule_count: Number(existing.reschedule_count || 0) + 1
            });
            applied.push({ type: 'reschedule_task', id: existing.id, ...slot, planning_status: slot ? 'rescheduled' : 'unscheduled' });
          }
        } else if (action.type === 'replan_day') {
          const date = action.date || today;
          const candidates = tasksCache
            .filter((t) => !t.done && t.planning_status !== 'completed' && (t.planned_date || t.due_date) === date)
            .sort((a, b) => {
              const p = { high: 0, medium: 1, low: 2 };
              const pa = p[a.priority] ?? 1;
              const pb = p[b.priority] ?? 1;
              if (pa !== pb) return pa - pb;
              return compareYmd(a.due_date || '9999-12-31', b.due_date || '9999-12-31');
            });

          const replanned = [];
          for (const task of candidates) {
            const group = groups.find((g) => g.id === task.group_id) || null;
            const slot = findTaskSlot({
              today: date,
              dueDate: task.due_date && compareYmd(task.due_date, date) >= 0 ? task.due_date : date,
              earliestDate: date,
              earliestTime: '',
              group,
              durationMinutes: task.duration_minutes || DEFAULT_DURATION,
              deadlineTime: task.deadline_time || '',
              preferredPeriod: task.preferred_period || 'any',
              commitments: commitmentsCache,
              recurring: recurringCache,
              tasks: tasksCache,
              ignoreTaskId: task.id
            });
            await base44.entities.TaskItem.update(task.id, {
              planned_date: slot?.planned_date || '',
              scheduled_time: slot?.scheduled_time || '',
              scheduled_end_time: slot?.scheduled_end_time || '',
              planning_status: slot ? 'rescheduled' : 'unscheduled',
              last_rescheduled_at: new Date().toISOString(),
              reschedule_count: Number(task.reschedule_count || 0) + 1
            });
            Object.assign(task, slot || { planned_date: '', scheduled_time: '', scheduled_end_time: '' });
            task.planning_status = slot ? 'rescheduled' : 'unscheduled';
            replanned.push({ id: task.id, name: task.name, ...slot });
          }
          applied.push({ type: 'replan_day', date, tasks: replanned });
        }
      } catch (e) {
        applied.push({ type: 'action_error', action: action.type, error: e?.message || String(e) });
      }
    }

    await base44.entities.ChatMessage.create({
      role: 'assistant',
      content: parsed.reply || '',
      actions: applied,
      group_id: groupId
    });

    return Response.json({ reply: parsed.reply || '', actions: applied });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
