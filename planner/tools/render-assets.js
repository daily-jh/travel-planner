// 앱 아이콘과 링크 썸네일(og.png)을 그려서 저장소에 넣는다. 여행을 추가하거나 제목을 바꾼 뒤 한 번 실행:
//   node planner/tools/render-assets.js
// 한 여행의 og.png만 다시 그리려면 폴더 이름을 붙인다 (아이콘·첫 화면 썸네일은 그대로):
//   node planner/tools/render-assets.js 2027-10-osaka
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BRAND = path.join(ROOT, 'planner/brand');
const mark = fs.readFileSync(path.join(BRAND, 'mark.svg'), 'utf8');
const icon = fs.readFileSync(path.join(BRAND, 'icon.svg'), 'utf8');
const themes = JSON.parse(fs.readFileSync(path.join(ROOT, 'planner/themes.json'), 'utf8'));
const css = fs.readFileSync(path.join(ROOT, 'planner/style.css'), 'utf8');
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=block">';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ymd = s => s.replace(/-/g, '.');

function og({ theme, eyebrow, title, when, days }) {
  const t = esc(title).replace(/\*(.+?)\*/g, '<em>$1</em>');
  return `<!doctype html><meta charset="utf-8">${FONTS}<style>${css}
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  :root{--f-sys:"Noto Sans KR",sans-serif}
  .og{position:relative;width:1200px;height:630px;box-sizing:border-box;padding:64px 76px;display:flex;flex-direction:column;overflow:hidden;color:#fff;
    background:radial-gradient(700px 520px at 92% 8%,color-mix(in srgb,var(--acc) 38%,transparent),transparent 65%),linear-gradient(160deg,color-mix(in srgb,var(--pri) 88%,#fff),var(--pri) 45%,color-mix(in srgb,var(--pri) 70%,#000))}
  
  .brand{display:flex;align-items:center;gap:16px;font:700 32px "Noto Sans KR";letter-spacing:-.02em;color:#fff;position:relative}
  .brand svg{width:58px;height:58px;border-radius:15px;box-shadow:0 6px 18px rgba(0,0,0,.3),0 0 0 2px rgba(255,255,255,.18)}
  .eb{margin-top:auto;font:600 26px "Noto Sans KR";letter-spacing:.02em;color:rgba(255,255,255,.72);position:relative}
  h1{font:900 124px/1.04 "Noto Sans KR";margin:8px 0 28px;letter-spacing:-.05em;position:relative;max-width:900px;text-wrap:balance}
  h1 em{font-style:normal;color:color-mix(in srgb,var(--acc) 45%,#fff)}
  .meta{display:flex;align-items:center;gap:18px;position:relative;font:700 27px "Noto Sans KR"}
  .meta .pill{padding:10px 20px;border-radius:999px;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.28);font:600 24px "Noto Sans KR";-webkit-backdrop-filter:blur(10px)}
  .meta .hand{font:600 26px "Noto Sans KR";color:rgba(255,255,255,.75)}
  svg.deco{position:absolute;right:20px;top:10px;width:560px;height:560px}
  .p{position:absolute;border-radius:60% 0 60% 0;background:color-mix(in srgb,var(--acc) 50%,#fff);opacity:.55}
  </style><body class="theme-${theme}"><div class="og">
  <svg class="deco" viewBox="0 0 560 560" aria-hidden="true">
    <path d="M210 440 C 300 450 250 330 330 330 S 430 360 440 230" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="10" stroke-linecap="round" stroke-dasharray="0.1 30"/>
    <circle cx="210" cy="440" r="16" fill="rgba(255,255,255,.7)"/>
    <g transform="translate(440 120)"><path d="M0 -10a72 72 0 0 1 72 72c0 55-72 118-72 118s-72-63-72-118a72 72 0 0 1 72-72z" transform="translate(0 -10)" fill="color-mix(in srgb,var(--acc) 75%,#fff)" opacity=".95"/><circle cx="0" cy="52" r="26" fill="var(--pri)"/></g>
  </svg>
  <i class="p" style="width:26px;height:26px;left:610px;top:90px;transform:rotate(20deg)"></i>
  <i class="p" style="width:18px;height:18px;left:700px;top:430px;transform:rotate(-30deg)"></i>
  <i class="p" style="width:22px;height:22px;left:1090px;top:470px;transform:rotate(60deg)"></i>
  <i class="p" style="width:14px;height:14px;left:540px;top:260px"></i>
  <div class="brand">${icon}여행 플래너</div>
  <div class="eb">${esc(eyebrow)}</div><h1>${t}</h1>
  <div class="meta"><span class="pill">${esc(when.text)}</span>${when.hand ? `<span class="hand">${esc(when.hand)}</span>` : ''}</div></div>`;
}

const iconHTML = (size, pad) => `<!doctype html><style>html,body{margin:0;background:#24346b}svg{display:block;width:${size}px;height:${size}px}</style>${pad ? icon.replace('rx="16"', 'rx="0"') : icon}`;

const only = process.argv[2];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  if (!only) for (const [file, size, full] of [['apple-touch-icon.png', 180, true], ['icon-192.png', 192, true], ['icon-512.png', 512, true]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(iconHTML(size, full));
    await p.screenshot({ path: path.join(BRAND, file) });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  const tdir = path.join(ROOT, 'trips');
  const all = [];
  for (const slug of fs.readdirSync(tdir).sort()) {
    const f = path.join(tdir, slug, 'trip.json');
    if (!fs.existsSync(f) || (only && slug !== only)) continue;
    const t = JSON.parse(fs.readFileSync(f, 'utf8'));
    const n = Math.round((new Date(t.end) - new Date(t.start)) / 864e5);
    all.push(t);
    await p.setContent(og({ theme: t.theme || 'hakata', eyebrow: t.eyebrow || '', title: t.title,
      when: { text: `${ymd(t.start)} — ${t.end.slice(5).replace('-', '.')} · ${n}박 ${n + 1}일`, hand: (t.travelers || []).map(x => x.name).join(' · ') + '의 여행' },
      days: t.days.map(d => d.theme).slice(0, 5) }), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(tdir, slug, 'og.png') });
    console.log('og', slug);
  }
  if (only) { if (!all.length) console.error('trips/' + only + '/trip.json 이 없어요'); await b.close(); return; }
  await p.setContent(og({ theme: 'hakata', eyebrow: 'TRAVEL PLANNER', title: '우리 여행을 *한곳에*',
    when: { text: '동선 · 지도 · 예약 · 비용 · 캘린더', hand: '' }, days: all.map(t => t.short || t.title) }), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(BRAND, 'og-home.png') });
  await b.close();
})();
