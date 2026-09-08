import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, StickyNote } from 'lucide-react';

export default function Notes({ groupId }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');

  const load = async () => {
    const all = await base44.entities.Note.filter({ group_id: groupId });
    all.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    setNotes(all);
  };
  useEffect(() => {
    load();
  }, [groupId]);

  const add = async () => {
    if (!text.trim()) return;
    await base44.entities.Note.create({ group_id: groupId, text: text.trim() });
    setText('');
    load();
  };
  const remove = async (id) => {
    await base44.entities.Note.delete(id);
    load();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="font-medium mb-1 flex items-center gap-2">
        <StickyNote className="w-4 h-4" /> Notas
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Ideias, lembretes e anotações rápidas do grupo.</p>

      <div className="flex gap-2 mb-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Escreva uma nota..."
          rows={2}
          className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none"
        />
        <button
          onClick={add}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:opacity-90 transition self-stretch"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">Nenhuma nota ainda.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border bg-card p-3 relative">
              <p className="text-sm whitespace-pre-wrap pr-6">{n.text}</p>
              <button
                onClick={() => remove(n.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}