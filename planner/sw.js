// 여행 플래너 오프라인 캐시
// 설치할 때 여행 페이지·쇼핑 리스트·책자·사진을 미리 저장한다.
// 평소엔 네트워크 우선이지만, 지하상가처럼 신호가 약해 3.5초 안에 답이 없으면 저장본을 먼저 보여 주고 뒤에서 새로 받아 둔다.
// 글꼴(다른 주소)도 한 번 받으면 저장해 둔다.
const scope = new URL(self.registration.scope);
const PREFIX = 'travel-planner:' + scope.pathname + ':';
const C = PREFIX + '__VER__';
const PRE = __PRE__;
const WAIT = 3500;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(PRE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const FONT = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET') return;
  if (u.origin !== location.origin) {
    if (!FONT.test(req.url)) return; // 지도·날씨·환율은 저장하지 않는다
    e.respondWith(caches.open(C).then(c => c.match(req)).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(C).then(c => c.put(req, cp)); }
      return r;
    })));
    return;
  }
  if (!u.pathname.startsWith(scope.pathname) || u.searchParams.has('lock') ||
      /\/d-[^/]+\/|\.(?:ics|csv|xlsx|pdf)$/i.test(u.pathname)) return;
  const cache = caches.open(C);
  const net = fetch(req);
  e.waitUntil(net.then(async r => {
    if (r.ok) { const copy = r.clone(); await (await cache).put(req, copy); }
  }).catch(() => {}));
  const cached = () => cache.then(c => c.match(req, { ignoreSearch: true })).catch(() => undefined);
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => cached().then(give), WAIT);
    net.then(r => { clearTimeout(t); give(r); }).catch(() => { clearTimeout(t); cached().then(hit => { if (hit) give(hit); else if (!done) { done = true; resolve(Response.error()); } }); });
  }));
  e.waitUntil(net.catch(() => {}));
});
