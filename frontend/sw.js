const CACHE_NAME = 'ai-study-planner-v1';

// Add all your static local frontend files here so they cache safely
const ASSETS_TO_CACHE = [
  '/',
  '/planner.html',
  '/dashboard.html',
  '/index1.html'
];

// 1. Install Event: Caches all static asset routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA Cache opened successfully.');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: Cleans up old cache structures if you update your app files
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old PWA cache stores...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event: Intercepts requests to serve cached assets when available
self.addEventListener('fetch', (event) => {
  // Skip cross-origin or backend server API routes (like your localhost:5000 server)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});