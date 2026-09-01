self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Organiza AI", {
    body: data.body || "Você tem um lembrete.",
    tag: data.tag || "organiza-ai-reminder",
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => "focus" in client);
    return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || "/");
  }));
});
