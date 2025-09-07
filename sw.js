const CACHE_NAME = 'attendance-system-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Cache jsPDF and AutoTable for offline PDF support
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing Enhanced Attendance System v2.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating Enhanced Attendance System...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Activation complete');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('SW: Activation failed', error);
      })
  );
});

// Fetch event - serve cached content and handle PDF libraries
self.addEventListener('fetch', (event) => {
  const requestURL = event.request.url;
  
  // Handle PDF library requests with priority caching
  if (
    requestURL.includes('jspdf.umd.min.js') ||
    requestURL.includes('jspdf.plugin.autotable.min.js')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('SW: Serving PDF library from cache');
            return cachedResponse;
          }
          
          // Try to fetch and cache if not present
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                console.log('SW: Caching PDF library from network');
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.warn('SW: PDF library not available offline', error);
              // Return a fallback response for PDF libraries
              return new Response(
                '// PDF library not available offline. Please connect to internet for PDF export functionality.',
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 
                    'Content-Type': 'application/javascript',
                    'Cache-Control': 'no-cache'
                  }
                }
              );
            });
        })
    );
    return;
  }
  
  // Handle app shell and other requests
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache
          return cachedResponse;
        }
        
        // Try network first, then cache the response
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response for caching
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Network failed, try to serve app shell for navigation requests
            if (event.request.mode === 'navigate') {
              console.log('SW: Serving app shell for navigation request');
              return caches.match('./index.html');
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle background sync for future enhancements
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered');
  if (event.tag === 'attendance-sync') {
    event.waitUntil(
      // Future: sync attendance data to server
      Promise.resolve()
    );
  }
});

// Handle push notifications for future enhancements
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  const options = {
    body: 'Don\'t forget to check in/out!',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" rx="20" fill="%23667eea"/%3E%3Ctext x="48" y="60" font-size="40" text-anchor="middle" fill="white"%3E⏰%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" rx="20" fill="%23667eea"/%3E%3Ctext x="48" y="60" font-size="40" text-anchor="middle" fill="white"%3E⏰%3C/text%3E%3C/svg%3E',
    tag: 'attendance-reminder',
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification('Attendance Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});

// Handle app shortcuts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync for cache updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-update') {
    event.waitUntil(
      // Update cache with latest resources
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(urlsToCache);
        })
    );
  }
});

console.log('SW: Enhanced Attendance System Service Worker loaded');