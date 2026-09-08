import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronRight, FolderTree } from 'lucide-react';
import { getIcon, ICON_OPTIONS } from '@/lib/icons';
import { MODULES } from '@/lib/modules';

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

export default function Subgroups({ group }) {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('Circle');
  const [modules, setModules] = useState(['tarefas']);
  const [timeWindow, setTimeWindow] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const all = await base44.entities.Group.filter({ parent_id: group.id });
    all.sort((a, b) => (a.order || 0) - (b.order || 0));
    setSubs(all);
  };
  useEffect(() => {
    load();
  }, [group.id]);

  const create = async () => {
    if (!name.trim()) return;
    await base44.entities.Group.create({
      name: name.trim(),
      color,
      icon,
      order: subs.length,
      parent_id: group.id,
      modules,
      time_window: timeWindow
    });
    setName('');
    setColor(COLORS[0]);
    setIcon('Circle');
    setModules(['tarefas']);
    setTimeWindow('');
    setShowForm(false);
    load();
  };

  const updateWindow = async (id, value) => {
    await base44.entities.Group.update(id, { time_window: value });
    load();
  };

  const toggleModule = (k) =>
    setModules((ms) => (ms.includes(k) ? ms.filter((m) => m !== k) : [...ms, k]));

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="font-medium mb-1 flex items-center gap-2">
        <FolderTree className="w-4 h-4" /> Áreas
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Divida este grupo em áreas menores. Cada área tem seu próprio espaço, chat e módulos.
      </p>

      {subs.length > 0 && (
        <div className="space-y-2 mb-5">
          {subs.map((s) => {
            const Icon = getIcon(s.icon);
            return (
              <div key={s.id} className="rounded-xl border bg-card p-3">
                <button
                  onClick={() => navigate(`/grupo/${s.id}`)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: s.color + '22', color: s.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{(s.modules || []).length} módulos</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2 mt-2 pl-12">
                  <span className="text-xs text-muted-foreground shrink-0">Horário:</span>
                  <input
                    value={s.time_window || ''}
                    onChange={(e) => updateWindow(s.id, e.target.value)}
                    placeholder="09:00-18:00"
                    className="border rounded px-2 py-0.5 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subs.length === 0 && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl hover:bg-muted/50 mb-5"
        >
          + Criar área
        </button>
      )}

      {showForm && (
        <div className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Nova área em {group.name}</h3>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da área"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Cor</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-foreground' : ''}`}
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
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center ${icon === opt ? 'border-primary bg-primary/10' : ''}`}
                  >
                    <I className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Módulos</p>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => {
                const on = modules.includes(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleModule(m.key)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${on ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
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
              As tarefas dessa área serão encaixadas dentro dessa janela. Em branco = 9h às 20h.
            </p>
          </div>
          <button
            onClick={create}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Criar área
          </button>
        </div>
      )}

      {subs.length > 0 && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Nova área
        </button>
      )}
    </div>
  );
}