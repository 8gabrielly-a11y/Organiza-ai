import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Plus, CalendarClock, Trash2, CornerDownRight } from 'lucide-react';
import { todayStr, formatDatePt } from '@/lib/dateUtils';

export default function GroupCommitments({ groupId }) {
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(todayStr());
  const [subInputs, setSubInputs] = useState({});

  const load = async () => {
    const all = await base44.entities.Commitment.filter({ group_id: groupId });
    setItems(all);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const topLevel = items
    .filter((c) => !c.parent_id)
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || '') || (a.scheduled_time || '99').localeCompare(b.scheduled_time || '99'));

  const subtasksOf = (id) => items.filter((c) => c.parent_id === id);

  const addCommitment = async () => {
    if (!newTitle.trim()) return;
    await base44.entities.Commitment.create({
      title: newTitle.trim(),
      group_id: groupId,
      scheduled_date: newDate,
      source: 'manual'
    });
    setNewTitle('');
    load();
  };

  const addSubtask = async (parentId) => {
    const title = (subInputs[parentId] || '').trim();
    if (!title) return;
    const parent = items.find((c) => c.id === parentId);
    await base44.entities.Commitment.create({
      title,
      group_id: groupId,
      parent_id: parentId,
      scheduled_date: parent?.scheduled_date || todayStr(),
      source: 'manual'
    });
    setSubInputs((s) => ({ ...s, [parentId]: '' }));
    load();
  };

  const toggle = async (c) => {
    await base44.entities.Commitment.update(c.id, { status: c.status === 'done' ? 'pending' : 'done' });
    load();
  };

  const remove = async (id) => {
    await base44.entities.Commitment.delete(id);
    load();
  };

  const reschedule = async (id, date) => {
    await base44.entities.Commitment.update(id, { scheduled_date: date });
    load();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="font-medium mb-3">Compromissos e tarefas</h2>

      <div className="flex gap-2 mb-5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCommitment()}
          placeholder="Novo compromisso..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="border rounded-lg px-2 py-2 text-sm"
        />
        <button
          onClick={addCommitment}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">
          Nenhum compromisso neste grupo ainda. Adicione acima ou pelo chat.
        </p>
      ) : (
        <div className="space-y-2">
          {topLevel.map((c) => {
            const done = c.status === 'done';
            const subs = subtasksOf(c.id);
            return (
              <div key={c.id} className="rounded-xl border bg-card">
                <div className="flex items-start gap-3 p-3">
                  <button onClick={() => toggle(c)} className="mt-0.5 shrink-0">
                    <Check
                      className={`w-5 h-5 rounded-full border-2 p-0.5 ${done ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'}`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${done ? 'line-through opacity-50' : ''}`}>{c.title}</div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="capitalize">{formatDatePt(c.scheduled_date)}</span>
                      {c.scheduled_time && <span>{c.scheduled_time}</span>}
                      {c.location && <span>{c.location}</span>}
                      <input
                        type="date"
                        value={c.scheduled_date}
                        onChange={(e) => reschedule(c.id, e.target.value)}
                        className="border rounded px-1 py-0.5 text-xs"
                        title="Remarcar"
                      />
                    </div>
                  </div>
                  <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {subs.length > 0 && (
                  <div className="px-3 pb-2 space-y-1 ml-6 border-l-2 border-muted ml-8 pl-3">
                    {subs.map((s) => {
                      const sDone = s.status === 'done';
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <button onClick={() => toggle(s)} className="shrink-0">
                            <Check
                              className={`w-4 h-4 rounded-full border p-0.5 ${sDone ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'}`}
                            />
                          </button>
                          <span className={`flex-1 ${sDone ? 'line-through opacity-50' : ''}`}>{s.title}</span>
                          <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 pb-3 ml-8">
                  <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={subInputs[c.id] || ''}
                    onChange={(e) => setSubInputs((s) => ({ ...s, [c.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addSubtask(c.id)}
                    placeholder="Adicionar sub-tarefa..."
                    className="flex-1 text-sm border rounded-lg px-2 py-1.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}