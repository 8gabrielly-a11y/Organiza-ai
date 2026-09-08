import React, { useState } from 'react';
import { Check, Clock, MapPin, CalendarClock } from 'lucide-react';
import { getIcon } from '@/lib/icons';

const statusStyles = {
  pending: '',
  done: 'opacity-50',
  skipped: 'opacity-40',
  rescheduled: 'opacity-70'
};

export default function CommitmentItem({ commitment, group, onAction }) {
  const [showResched, setShowResched] = useState(false);
  const Icon = getIcon(group?.icon);
  const done = commitment.status === 'done';

  return (
    <div className={`rounded-xl border bg-card p-3 flex items-start gap-3 transition ${statusStyles[commitment.status]}`}>
      <button
        onClick={() => onAction(commitment.id, done ? 'pending' : 'done')}
        className="mt-0.5 shrink-0"
        title={done ? 'Desfazer' : 'Concluir'}
      >
        <Check
          className={`w-5 h-5 rounded-full border-2 p-0.5 transition ${
            done ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${done ? 'line-through' : ''}`}>{commitment.title}</span>
          {group && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: group.color + '22', color: group.color }}
            >
              <Icon className="w-3 h-3" />
              {group.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {commitment.scheduled_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {commitment.scheduled_time}
            </span>
          )}
          {commitment.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {commitment.location}
            </span>
          )}
        </div>
        {showResched && (
          <input
            type="date"
            value={commitment.scheduled_date}
            onChange={(e) => {
              onAction(commitment.id, 'rescheduled', e.target.value);
              setShowResched(false);
            }}
            className="mt-2 text-xs border rounded px-2 py-1"
          />
        )}
      </div>
      <button
        onClick={() => setShowResched((s) => !s)}
        title="Remarcar"
        className="shrink-0"
      >
        <CalendarClock className="w-4 h-4 text-muted-foreground hover:text-primary" />
      </button>
    </div>
  );
}