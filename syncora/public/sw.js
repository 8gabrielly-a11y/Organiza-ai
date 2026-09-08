self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data?.text?.() || '' }; }
  const title = data.title || 'Syncora';
  const options = {
    body: data.message || data.body || 'Você tem algo que precisa da sua atenção.',
    tag: data.key || data.tag || 'syncora-reminder',
    renotify: false,
    data: {
      url: data.url || '/',
      item_type: data.item_type || '',
      item_id: data.item_id || ''
    },
    actions: [
      { action: 'open', title: 'Abrir Syncora' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
