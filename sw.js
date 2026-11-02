/* Service worker: λειτουργία χωρίς σύνδεση.
   Το όνομα της cache περιέχει την έκδοση (js/version.js), οπότε κάθε release
   δημιουργεί νέα cache και τα κινητά παίρνουν τη νέα έκδοση. */
importScripts('js/version.js');
// Αν λείπει η έκδοση (χαλασμένο release), η εγκατάσταση αποτυγχάνει
// και τα κινητά κρατούν την προηγούμενη έκδοση που λειτουργεί.
if (!/^\d+\.\d+\.\d+/.test(String(self.APP_VERSION || ''))) {
  throw new Error('js/version.js: λείπει ή είναι άκυρη η APP_VERSION');
}
const CACHE = 'asep-prep-v' + self.APP_VERSION;

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/version.js',
  'js/util.js',
  'js/storage.js',
  'js/data.js',
  'js/sections/registry.js',
  'js/sections/knowledge/model.js',
  'js/sections/knowledge/question-view.js',
  'js/sections/knowledge/hub.js',
  'js/sections/knowledge/practice.js',
  'js/sections/knowledge/exam.js',
  'js/sections/knowledge/progress.js',
  'js/prefs.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'data/bank.json',
  'data/exam-config.json',
  'data/sections.json',
  'data/explanations/index.json'
];

self.addEventListener('install', (event) => {
  // cache: 'reload' παρακάμπτει την HTTP cache του browser (GitHub Pages: έως 10΄),
  // ώστε η νέα έκδοση να μη χτιστεί από παλιά αντίγραφα αρχείων.
  event.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('asep-prep-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function isData(url) {
  return url.pathname.includes('/data/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Σελίδα: πρώτα η cache (λειτουργεί offline), αλλιώς δίκτυο.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((hit) => hit || fetch(req))
    );
    return;
  }

  // Δεδομένα: άμεση απάντηση από cache και ενημέρωση στο παρασκήνιο,
  // ώστε μια διορθωμένη τράπεζα στο GitHub να φτάνει χωρίς νέο release.
  if (isData(url)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req, { ignoreSearch: true }).then((hit) => {
          const net = fetch(req, { cache: 'no-cache' }).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Κώδικας και εικονίδια: cache, αλλιώς δίκτυο.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});
