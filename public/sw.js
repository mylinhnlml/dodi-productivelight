/* Vision Board push service worker */
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || 'Your vision is waiting ☀️';
  const body  = data.body  || "Open Dodi to see what you're working toward";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    data: { url: data.url || '/?vision=1' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/?vision=1';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
