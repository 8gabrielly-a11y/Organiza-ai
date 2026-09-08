import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ChatBubble from '@/components/ChatBubble';
import VoiceInput from '@/components/VoiceInput';
import { useAuth } from '@/lib/AuthContext';

export default function GroupChat({ groupId, groupName }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef(null);

  const load = async () => {
    const all = await base44.entities.ChatMessage.list('-created_date', 50);
    const filtered = all.filter((m) => (groupId ? m.group_id === groupId : !m.group_id)).slice(0, 50);
    setMessages(filtered.reverse());
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const l = await base44.entities.UserSettings.filter({ created_by_id: user.id });
        if (l[0]) setVoiceEnabled(l[0].voice_enabled !== false);
      } catch (e) {}
    })();
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content, created_date: new Date().toISOString() }]);
    setLoading(true);
    try {
      await base44.entities.ChatMessage.create({ role: 'user', content, group_id: groupId || '' });
      const res = await base44.functions.invoke('chatWithGemini', { message: content, group_id: groupId || '' });
      const reply = res.data?.reply || 'Sem resposta';
      const actions = res.data?.actions || [];
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, created_date: new Date().toISOString(), actions }
      ]);
    } catch (e) {
      const err = e.response?.data?.error || e.message || 'Erro ao falar com o assistente';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ ' + err, created_date: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const placeholder = groupName ? `Fale sobre ${groupName}...` : 'Escreva ou fale seu compromisso...';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 pb-2">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center text-muted-foreground mt-20">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {groupName ? `Conversa de ${groupName}` : 'Diga olá ao seu planejador'}
              </p>
              <p className="text-sm mt-1.5 max-w-sm mx-auto">
                {groupName
                  ? `Aqui a IA usa ${groupName} como contexto. Conte o que precisa, marque o que concluiu, peça pra remarcar.`
                  : 'Conte o que precisa fazer, marque o que concluiu, peça pra remarcar... por texto ou por voz.'}
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
          {loading && <ChatBubble message={{ role: 'assistant', content: '' }} loading />}
        </div>
      </div>
      <div className="border-t bg-background px-4 pt-3 pb-16 md:pb-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {voiceEnabled && (
            <VoiceInput onResult={(t) => setInput(t)} listening={listening} setListening={setListening} />
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none rounded-2xl border bg-muted/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-full bg-primary text-primary-foreground p-3 disabled:opacity-40 hover:opacity-90 transition shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}