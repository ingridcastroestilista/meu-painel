// Guarda o app para abrir sem internet.
// Ao publicar uma versão nova, mude VERSAO para o aparelho baixar os arquivos novos.
const VERSAO = 'mp-v10';
const ARQUIVOS = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/regras.js', 'js/store.js', 'js/estudio.js', 'js/moldes.js', 'js/juntar.js', 'js/nuvem.js', 'js/nuvem-config.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS.map((a) => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('mp-') && k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Arquivos do app: internet quando tem (pega atualizações), cópia guardada quando não tem.
// Fontes do Google: cópia guardada primeiro.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin.includes('fonts.g')) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copia = res.clone();
      caches.open(VERSAO).then((c) => c.put(req, copia));
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  const atual = req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' });
  e.respondWith(
    fetch(atual).then((res) => {
      const copia = res.clone();
      caches.open(VERSAO).then((c) => c.put(req, copia));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
