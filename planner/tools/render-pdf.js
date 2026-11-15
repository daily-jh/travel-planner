// 여행 책자(booklet.html)를 A5 PDF(booklet.pdf)로 저장한다. build.py 다음에 실행:
//   node planner/tools/render-pdf.js
// Playwright·Chromium이 없으면 건너뛴다 (책자 화면의 '인쇄 · PDF로 저장'은 그대로 쓸 수 있다).
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright 없음: PDF를 건너뛰어요'); process.exit(0); }
const SITE = path.resolve(__dirname, '../../_site/trips');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const slug of fs.readdirSync(SITE)) {
    const src = path.join(SITE, slug, 'booklet.html');
    if (!fs.existsSync(src)) continue;
    await page.goto('file://' + src, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const out = path.join(SITE, slug, 'booklet.pdf');
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    console.log(`${slug}: 책자 PDF ${Math.round(fs.statSync(out).size / 1024)}KB`);
  }
  await browser.close();
})();
