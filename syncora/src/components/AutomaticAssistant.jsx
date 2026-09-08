import React, { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { enablePushNotifications } from '@/components/PushNotifications';

const CHECK_EVERY_MS = 60 * 1000;

function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

function showNotification(item) {
  if (!canNotify()) return;
  try {
    const n = new Notification(item.title || 'Syncora', {
      body: item.message,
      tag: item.key,
      renotify: false
    });
    n.onclick = () => {
      window.focus();
      window.location.href = item.item_type === 'task' ? '/plano' : '/';
      n.close();
    };
  } catch (e) {
    // Em alguns navegadores móveis Notification() direto não é permitido.
  }
}

export default function AutomaticAssistant() {
  const { user } = useAuth();
  const running = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const check = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const settings = await base44.entities.UserSettings.filter({ created_by_id: user.id });
        if (settings[0]?.notifications_enabled === false) return;
        const result = await base44.functions.invoke('runAssistantAutomation', {});
        const data = result?.data || result || {};
        for (const item of data.notifications || []) showNotification(item);
        if ((data.changes || []).length) {
          window.dispatchEvent(new CustomEvent('syncora:assistant-updated', { detail: data }));
        }
      } catch (e) {
        // Automação não deve derrubar o app se o backend estiver temporariamente indisponível.
      } finally {
        running.current = false;
      }
    };

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      enablePushNotifications().catch(() => {});
    }

    check();
    timer.current = window.setInterval(check, CHECK_EVERY_MS);

    const onFocus = () => check();
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);

  return null;
}
