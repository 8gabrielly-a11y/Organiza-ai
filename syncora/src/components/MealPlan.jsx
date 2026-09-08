import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Utensils } from 'lucide-react';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MEALS = [
  { key: 'cafe', label: 'Café' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'jantar', label: 'Jantar' }
];

export default function MealPlan({ groupId }) {
  const [items, setItems] = useState([]);
  const [day, setDay] = useState(1);
  const [meal, setMeal] = useState('almoco');
  const [desc, setDesc] = useState('');

  const load = async () => {
    const all = await base44.entities.MealPlan.filter({ group_id: groupId });
    setItems(all);
  };
  useEffect(() => {
    load();
  }, [groupId]);

  const add = async () => {
    if (!desc.trim()) return;
    await base44.entities.MealPlan.create({
      group_id: groupId,
      day_of_week: Number(day),
      meal_type: meal,
      description: desc.trim()
    });
    setDesc('');
    load();
  };
  const remove = async (id) => {
    await base44.entities.MealPlan.delete(id);
    load();
  };

  const byDay = (d) => items.filter((i) => Number(i.day_of_week) === d);
  const mealLabel = (k) => MEALS.find((m) => m.key === k)?.label || k;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="font-medium mb-1 flex items-center gap-2">
        <Utensils className="w-4 h-4" /> Cardápio da semana
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Planeje o que comer a cada dia.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <select value={day} onChange={(e) => setDay(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {DAYS.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
        <select value={meal} onChange={(e) => setMeal(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {MEALS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="O que vai comer..."
          className="flex-1 min-w-[180px] border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {DAYS.map((d, i) => {
          const dayItems = byDay(i);
          return (
            <div key={i} className="rounded-xl border bg-card p-2 min-h-[100px]">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">{d}</div>
              <div className="space-y-1.5">
                {dayItems.map((it) => (
                  <div key={it.id} className="text-xs">
                    <div className="flex items-start gap-1">
                      <span className="flex-1">
                        <span className="text-[10px] text-muted-foreground uppercase block">{mealLabel(it.meal_type)}</span>
                        {it.description}
                      </span>
                      <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {dayItems.length === 0 && <div className="text-[11px] text-muted-foreground/50 px-1">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}