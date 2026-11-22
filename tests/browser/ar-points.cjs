/* AR points on the Progress tab, kept apart from her other points: the quarter and the school year against her goals,
 * every quarter, and all time. A grown-up matches it to the school's AR report once (her real numbers: 51.7 this
 * quarter, 119.7 this school year, 1,074 all time), and quizzes after that keep adding on top. Library tests and home
 * points show as "other" points, never as AR. The clock is fixed at November 22, 2026, in quarter 2.
 *
 *   Run:  node tests/browser/ar-points.cjs
 *
 * Needs Playwright 1.56.1 and its Chromium, like clickthrough.cjs. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/book-dude-next\//, '');
    const file = path.join(DOCS, rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!url.pathname.startsWith('/book-dude-next/') || !file.startsWith(DOCS + path.sep)) { res.writeHead(404); res.end(); return; }
    if (rel === 'history.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"app":"reading-room","version":1,"records":[]}'); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream'), 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

(async () => {
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/book-dude-next/';
  const browser = await chromium.launch();
  const errors = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date('2026-11-22T12:00:00-07:00'));
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE);
    await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    // Quizzes Book Dude has from the school emails, a Library test and home points.
    await p.evaluate(async () => {
      const s = await import('/book-dude-next/app/state.js');
      await s.save('hatchet--gary-paulsen', { status: 'finished', earnedPoints: 7, quizDate: '2026-10-14' });
      await s.save('frindle--andrew-clements', { status: 'finished', earnedPoints: 4.5, quizDate: '2026-10-28' });
      await s.save('holes--louis-sachar', { status: 'finished', earnedPoints: 6, quizDate: '2026-11-12' });
      await s.save('exam:topaz-mountain', { earnedPoints: 4, quizScore: 100, quizDate: '2026-11-14' });
      await s.save('exam:topaz-mountain:think', { earnedPoints: 1, quizDate: '2026-11-14' });
      await s.save('mine:lottie', { status: 'finished', homePoints: 4, homeDate: '2026-11-16' });
    });
    const card = async () => { await p.$eval('.tab[data-tab="explore"]', e => e.click()); await p.$eval('.tab[data-tab="progress"]', e => e.click()); await p.waitForSelector('#ar-points'); return clean(await p.innerText('#ar-points')); };
    let text = await card();
    assert.match(text, /^AR points school year 2026-27 Quarter 2 Oct 19, 2026 to Jan 3, 2027 10\.5 of 62\.5 52 to go for the quarter goal\. School year 17\.5 of 250/);
    assert.doesNotMatch(text, /All time/, 'no all-time number until a grown-up gives it');
    assert.match(text, /Quarter 1 Aug 1, 2026 7 0 Quarter 2 Oct 19, 2026 10\.5 9 Quarter 3 Jan 4, 2027 0 0 Quarter 4 Mar 15, 2027 0 0 Year 17\.5 9/, 'tests and home points are "other", never AR');

    // Match the school's report: 51.7 this quarter, 119.7 this year (so 68 in quarter 1), 1,074 all time.
    await p.click('[data-act="ar-match"]');
    await p.waitForSelector('#ar-q2');
    assert.deepEqual([await p.inputValue('#ar-q1'), await p.inputValue('#ar-q2'), await p.$('#ar-q3')], ['7', '10.5', null], 'only the quarters so far');
    await p.fill('#ar-q2', '5');
    await p.$eval('form[data-form="ar-match"] button[type="submit"]', e => e.click());
    assert.match(clean(await p.textContent('#ar-error')), /Quarter 2: Book Dude already has 10\.5 AR points from quizzes/);
    await p.fill('#ar-q1', '68');
    await p.fill('#ar-q2', '51.7');
    await p.fill('#ar-all', '1,074');
    await p.$eval('form[data-form="ar-match"] button[type="submit"]', e => e.click());
    await p.waitForFunction(() => !document.getElementById('confirm').open);
    text = clean(await p.innerText('#ar-points'));
    assert.match(text, /Quarter 2 Oct 19, 2026 to Jan 3, 2027 51\.7 of 62\.5 10\.8 to go for the quarter goal\. School year 119\.7 of 250 All time: 1,074 AR points/);
    assert.match(text, /Quarter 1 Aug 1, 2026 68 7 from quizzes here \+ 61 from the school’s report 0 Quarter 2 Oct 19, 2026 51\.7 10\.5 from quizzes here \+ 41\.2 from the school’s report 9/);

    // A new quiz from school adds on top: quarter, year and all time.
    await p.evaluate(async () => { await (await import('/book-dude-next/app/state.js')).save('wonder--r-j-palacio', { status: 'finished', earnedPoints: 11, quizDate: '2026-11-20' }); });
    text = await card();
    assert.match(text, /Quarter 2 Oct 19, 2026 to Jan 3, 2027 62\.7 of 62\.5 Quarter goal reached! School year 130\.7 of 250 All time: 1,085 AR points/);
    if (process.env.SHOTS) { await p.$eval('#ar-points', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(process.env.SHOTS, 'ar-points.png') }); }
    const saved = await p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.arTrack);
    assert.deepEqual([saved.missed['2026-27'], saved.before], [{ 1: 61, 2: 41.2 }, { year: '2026-27', points: 954.3 }]);

    assert.deepStrictEqual(errors, []);
    console.log('AR points show by quarter and school year against her goals, apart from her other points, match the school\'s report, and keep counting new quizzes.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
