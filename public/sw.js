const CACHE_NAME = 'bengkel-pos-v2'
const STATIC_ASSETS = [
  '/',
  '/landing',
  '/login',
  '/register',
  '/wo',
  '/kasir',
  '/sparepart',
  '/kendaraan',
  '/jasa',
  '/mekanik',
  '/dashboard',
  '/laporan',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return
  if (url.origin !== location.origin) return

  // For API GET requests: cache-first with network fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, response.clone())
              }
              return response
            })
            .catch(() => cached)
          return cached || networkFetch
        })
      )
    )
    return
  }

  // For all other GET requests: stale-while-revalidate style
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => cached || cache.match('/'))
        return cached || fetched
      })
    )
  )
})
