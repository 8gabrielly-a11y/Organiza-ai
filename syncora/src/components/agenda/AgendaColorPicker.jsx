import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { base44 } from '@/api/base44Client';

export default function AgendaColorPicker({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const mode = settings?.agenda_color_mode || 'grupo';
  const taskColor = settings?.task_color || '#f59e0b';
  const commColor = settings?.commitment_color || '#3b82f6';
  const taskOp = settings?.task_opacity ?? 100;
  const commOp = settings?.commitment_opacity ?? 18;

  const save = async (patch) => {
    if (!settings?.id) return;
    try {
      await base44.entities.UserSettings.update(settings.id, patch);
      onChange({ ...settings, ...patch });
    } catch (e) {}
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-9 h-9 rounded-full border bg-card flex items-center justify-center hover:bg-muted transition shrink-0"
          title="Personalizar cores"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Cores da agenda</div>
          <div className="flex gap-1 bg-muted rounded-full p-1">
            <button
              onClick={() => save({ agenda_color_mode: 'grupo' })}
              className={`flex-1 px-3 py-1.5 text-xs rounded-full transition ${mode === 'grupo' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Por grupo
            </button>
            <button
              onClick={() => save({ agenda_color_mode: 'tipo' })}
              className={`flex-1 px-3 py-1.5 text-xs rounded-full transition ${mode === 'tipo' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Por tipo
            </button>
          </div>
          {mode === 'tipo' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>Compromissos</span>
                  <input
                    type="color"
                    value={commColor}
                    onChange={(e) => save({ commitment_color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-14">Transparência</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={commOp}
                    onChange={(e) => save({ commitment_opacity: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{commOp}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>Tarefas</span>
                  <input
                    type="color"
                    value={taskColor}
                    onChange={(e) => save({ task_color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-14">Transparência</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={taskOp}
                    onChange={(e) => save({ task_opacity: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{taskOp}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tarefas ficam sólidas (escuras) e compromissos clarinhos. Ajuste a transparência de cada um.
              </p>
            </div>
          )}
          {mode === 'grupo' && (
            <p className="text-xs text-muted-foreground">As cores seguem o grupo de cada item.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}