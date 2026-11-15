// 앱 아이콘과 링크 썸네일(og.png)을 그려서 저장소에 넣는다. 여행을 추가하거나 제목을 바꾼 뒤 한 번 실행:
//   node planner/tools/render-assets.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BRAND = path.join(ROOT, 'planner/brand');
const mark = fs.readFileSync(path.join(BRAND, 'mark.svg'), 'utf8');
const themes = JSON.parse(fs.readFileSync(path.join(ROOT, 'planner/themes.json'), 'utf8'));
const css = fs.readFileSync(path.join(ROOT, 'planner/style.css'), 'utf8');
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Jua&family=Gowun+Dodum&family=Gowun+Batang:wght@700&family=Black+Han+Sans&family=Gaegu:wght@700&family=IBM+Plex+Mono:wght@500&family=Noto+Sans+KR:wght@400;700&display=block">';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ymd = s => s.replace(/-/g, '.');

function og({ theme, eyebrow, title, when, days }) {
  const t = esc(title).replace(/\*(.+?)\*/g, '<em>$1</em>');
  return `<!doctype html><meta charset="utf-8">${FONTS}<style>${css}
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:var(--paper)}
  .og{position:relative;width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;display:flex;flex-direction:column;
    background:radial-gradient(900px 500px at 105% -10%,var(--acc-soft),transparent 60%),radial-gradient(700px 500px at -10% 120%,var(--pri-soft),transparent 60%),var(--paper)}
  .og:after{content:"";position:absolute;left:0;right:0;bottom:0;height:22px;background:var(--band)}
  .brand{display:flex;align-items:center;gap:16px;font-family:"Do Hyeon";font-size:34px;color:var(--pri)}
  .brand svg{width:60px;height:60px}
  .eb{margin-top:auto;font-family:"IBM Plex Mono";font-size:26px;letter-spacing:.14em;color:var(--muted)}
  h1{font-family:var(--f-display);font-weight:400;font-size:104px;line-height:1.05;margin:14px 0 22px;color:var(--pri);letter-spacing:-.01em}
  h1 em{font-style:normal;color:var(--acc);background:linear-gradient(transparent 64%,var(--acc-soft) 64%)}
  .days{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:26px}
  .days span{font:700 24px "Noto Sans KR";padding:10px 18px;border-radius:999px;background:var(--surface);border:2px solid var(--line);color:var(--ink)}
  .days span b{color:var(--acc);margin-right:8px}
  .hand{position:absolute;right:84px;top:76px;font:700 34px "Gaegu";color:var(--acc);transform:rotate(-4deg)}
  </style><body class="theme-${theme}"><div class="og">
  <div class="brand">${mark}여행 플래너</div><div class="hand">${esc(when.hand || '')}</div>
  <div class="eb">${esc(eyebrow)}</div><h1>${t}</h1>
  <div class="days">${days.map((d, i) => `<span><b>${i + 1}</b>${esc(d)}</span>`).join('')}</div>
  <div class="eb" style="margin-top:0;font-size:24px">${esc(when.text)}</div></div>`;
}

const iconHTML = (size, pad) => `<!doctype html><style>html,body{margin:0;background:#24346b}svg{display:block;width:${size}px;height:${size}px}</style>${pad ? mark.replace('rx="16"', 'rx="0"') : mark}`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [file, size, full] of [['apple-touch-icon.png', 180, true], ['icon-192.png', 192, true], ['icon-512.png', 512, true]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(iconHTML(size, full));
    await p.screenshot({ path: path.join(BRAND, file) });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  const tdir = path.join(ROOT, 'trips');
  const all = [];
  for (const slug of fs.readdirSync(tdir).sort()) {
    const f = path.join(tdir, slug, 'trip.json');
    if (!fs.existsSync(f)) continue;
    const t = JSON.parse(fs.readFileSync(f, 'utf8'));
    const n = Math.round((new Date(t.end) - new Date(t.start)) / 864e5);
    all.push(t);
    await p.setContent(og({ theme: t.theme || 'hakata', eyebrow: t.eyebrow || '', title: t.title,
      when: { text: `${ymd(t.start)} — ${t.end.slice(5).replace('-', '.')} · ${n}박 ${n + 1}일`, hand: (t.travelers || []).map(x => x.name).join(' & ') + ' 여행' },
      days: t.days.map(d => d.theme).slice(0, 5) }), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(tdir, slug, 'og.png') });
    console.log('og', slug);
  }
  await p.setContent(og({ theme: 'hakata', eyebrow: 'TRAVEL PLANNER', title: '우리 여행을 *한곳에*',
    when: { text: '동선 · 지도 · 예약 · 비용 · 캘린더', hand: '' }, days: all.map(t => t.short || t.title) }), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(BRAND, 'og-home.png') });
  await b.close();
})();
