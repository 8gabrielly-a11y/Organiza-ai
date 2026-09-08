import React from 'react';
import { Plus, Check, CalendarClock, SkipForward } from 'lucide-react';

const actionIcon = {
  create: Plus,
  complete: Check,
  reschedule: CalendarClock,
  skip: SkipForward
};

const actionLabel = {
  create: (a) => `Agendou: ${a.title}`,
  complete: () => 'Concluído',
  reschedule: (a) => `Remarcado p/ ${a.new_date}`,
  skip: () => 'Pulado'
};

export default function ChatBubble({ message, loading }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border rounded-bl-md'
        }`}
      >
        {loading ? (
          <span className="flex gap-1 py-1">
            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {message.actions.map((a, i) => {
              const Icon = actionIcon[a.type] || Plus;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-primary-foreground/10 px-2 py-1 rounded-md w-fit"
                >
                  <Icon className="w-3 h-3" />
                  {actionLabel[a.type] ? actionLabel[a.type](a) : a.type}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}