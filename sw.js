const CACHE = 'lavica-v1'
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/ui.js',
  './js/config.js',
  './js/data/api.js',
  './js/data/localApi.js',
  './js/data/supabaseApi.js',
  './js/data/rooms.js',
  './js/data/seed.js',
  './js/data/timetable.js',
  './js/data/view.js',
  './js/lib/dates.js',
  './js/lib/ics.js',
  './js/lib/image.js',
  './js/lib/storage.js',
  './js/screens/today.js',
  './js/screens/timetable.js',
  './js/screens/rooms.js',
  './js/screens/room.js',
  './js/screens/addinfo.js',
  './js/screens/report.js',
  './js/screens/scan.js',
  './js/screens/labels.js',
  './vendor/supabase.js',
  './vendor/jsqr.js',
  './vendor/qrcode.js'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // písma Google a fotky zo Supabase: stačí cache (menia sa zriedka)
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com') || url.pathname.includes('/storage/v1/object/public/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
            return res
          })
      )
    )
    return
  }

  // ostatné cudzie adresy (API Supabase) necháme ísť priamo na sieť
  if (url.origin !== self.location.origin) return

  // vlastné súbory appky: najprv sieť, pri výpadku cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  )
})
