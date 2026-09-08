import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Check, Repeat } from 'lucide-react';
import { getWeekMarker } from '@/lib/dateUtils';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function WeeklyTasks({ groupId }) {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');
  const [day, setDay] = useState(1);
  const week = getWeekMarker();

  const load = async () => {
    const all = await base44.entities.WeeklyTask.filter({ group_id: groupId });
    setTasks(all);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const add = async () => {
    if (!name.trim()) return;
    await base44.entities.WeeklyTask.create({
      group_id: groupId,
      name: name.trim(),
      day_of_week: Number(day)
    });
    setName('');
    load();
  };

  const toggle = async (t) => {
    const isDone = t.last_done_week === week;
    await base44.entities.WeeklyTask.update(t.id, {
      last_done_week: isDone ? '' : week
    });
    load();
  };

  const remove = async (id) => {
    await base44.entities.WeeklyTask.delete(id);
    load();
  };

  const byDay = (d) => tasks.filter((t) => Number(t.day_of_week) === d);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="font-medium mb-1 flex items-center gap-2">
        <Repeat className="w-4 h-4" /> Atividades semanais
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Rotina da casa que se repete toda semana. Marca conforme faz — reseta a cada semana.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Atividade (ex: limpar banheiro, passar roupa...)"
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
        />
        <select value={day} onChange={(e) => setDay(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {DAYS.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
        <button
          onClick={add}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {DAYS.map((d, i) => {
          const dayTasks = byDay(i);
          return (
            <div key={i} className="rounded-xl border bg-card p-2 min-h-[80px]">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">{d}</div>
              <div className="space-y-1.5">
                {dayTasks.map((t) => {
                  const isDone = t.last_done_week === week;
                  return (
                    <div key={t.id} className="flex items-center gap-1.5 text-xs">
                      <button onClick={() => toggle(t)} className="shrink-0">
                        <Check
                          className={`w-4 h-4 rounded-full border p-0.5 ${isDone ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'}`}
                        />
                      </button>
                      <span className={`flex-1 ${isDone ? 'line-through opacity-50' : ''}`}>{t.name}</span>
                      <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {dayTasks.length === 0 && (
                  <div className="text-[11px] text-muted-foreground/50 px-1">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}