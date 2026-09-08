import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2 } from 'lucide-react';
import { getIcon, ICON_OPTIONS } from '@/lib/icons';

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('Circle');
  const [timeWindow, setTimeWindow] = useState('');

  const load = async () => {
    const g = (await base44.entities.Group.list()).filter((x) => !x.parent_id);
    setGroups(g.sort((a, b) => (a.order || 0) - (b.order || 0)));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await base44.entities.Group.create({
      name: name.trim(),
      color,
      icon,
      order: groups.length,
      modules: [],
      time_window: timeWindow
    });
    setName('');
    setColor(COLORS[0]);
    setIcon('Circle');
    setTimeWindow('');
    load();
  };

  const remove = async (id) => {
    await base44.entities.Group.delete(id);
    load();
  };

  const updateWindow = async (id, value) => {
    await base44.entities.Group.update(id, { time_window: value });
    load();
  };

  return (
    <div className="flex-1 overflow-y-auto pb-16 md:pb-6">
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">Grupos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Organize por áreas da vida. Dentro de cada grupo você cria áreas com seus próprios módulos.
          A janela de horário define quando as tarefas do grupo são encaixadas.
        </p>

        <div className="space-y-2 mb-8">
          {groups.map((g) => {
            const Icon = getIcon(g.icon);
            return (
              <div key={g.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: g.color + '22', color: g.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 font-medium">{g.name}</span>
                  <button
                    onClick={() => remove(g.id)}
                    className="text-muted-foreground hover:text-destructive transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 pl-12">
                  <span className="text-xs text-muted-foreground shrink-0">Horário:</span>
                  <input
                    value={g.time_window || ''}
                    onChange={(e) => updateWindow(g.id, e.target.value)}
                    placeholder="09:00-18:00"
                    className="border rounded px-2 py-0.5 text-xs"
                  />
                </div>
              </div>
            );
          })}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-xl">
              Nenhum grupo ainda
            </p>
          )}
        </div>

        <div className="rounded-xl border p-4 space-y-4">
          <h2 className="font-medium">Novo grupo</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do grupo"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Cor</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-foreground' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Ícone</p>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((opt) => {
                const I = getIcon(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => setIcon(opt)}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ${
                      icon === opt ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <I className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Horário desse grupo (opcional)</p>
            <input
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              placeholder="ex: 09:00-18:00"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              As tarefas serão encaixadas dentro dessa janela. Em branco = 9h às 20h.
            </p>
          </div>
          <button
            onClick={add}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Adicionar grupo
          </button>
        </div>
      </div>
    </div>
  );
}