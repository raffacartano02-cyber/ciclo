// Anatomia si è spostata su https://raffacartano02-cyber.github.io/anatomia/
// Questo service worker sostituisce quello vecchio: cancella la sua cache e si disattiva,
// così la vecchia copia offline non resta più dentro l'indirizzo di Ciclo.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('anatomia-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
