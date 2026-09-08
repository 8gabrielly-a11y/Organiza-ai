import { base44 } from '@/api/base44Client';

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getCurrentPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications() {
  if (!pushSupported()) throw new Error('Este navegador não oferece Web Push.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificações não concedida.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const keyResult = await base44.functions.invoke('getPushPublicKey', {});
  const publicKey = keyResult?.data?.publicKey || keyResult?.publicKey;
  if (!publicKey) throw new Error('Chave pública de push não configurada.');

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey)
    });
  }

  const json = subscription.toJSON();
  await base44.functions.invoke('registerPushSubscription', {
    subscription: json,
    userAgent: navigator.userAgent,
    deviceLabel: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  });
  return subscription;
}

export async function disablePushNotifications() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await base44.functions.invoke('unregisterPushSubscription', { endpoint: subscription.endpoint }).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  }
}
