// Minimal Service Worker — required for PWA install prompt
// No caching strategy: the app requires live backend connection
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());