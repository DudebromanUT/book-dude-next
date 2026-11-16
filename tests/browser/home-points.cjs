/* Home points and finding a cover, the way a grown-up uses them for a series with no AR quizzes (here, the Lottie
 * Brooks books): add the book, find its cover on Open Library and pick it, mark it finished, and give it 4 home
 * points. The points count on top of a school total, are said on the Progress tab, can be changed and taken back, ask
 * for the grown-up passcode, and travel in a backup. Open Library is played by this test.
 *
 *   Run:  node tests/browser/home-points.cjs
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
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const COVER = fs.readFileSync(path.join(DOCS, 'img', 'dude.jpg'));

(async () => {
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/book-dude-next/';
  const browser = await chromium.launch();
  const errors = [], searches = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    // Open Library: its search, and its cover pictures.
    await ctx.route('https://openlibrary.org/**', route => {
      const u = new URL(route.request().url());
      searches.push(u.pathname + '?' + u.searchParams.toString());
      const docs = u.searchParams.get('title').includes('Embarrassing')
        ? [{ title: 'Extremely Embarrassing Life of Lottie Brooks', author_name: ['Katie Kirby'], cover_i: 12378851, first_publish_year: 2021 },
          { title: 'The Extremely Embarrassing Life of Lottie Brooks', author_name: ['Katie Kirby'], cover_i: 12378851 },
          { title: 'Lottie Brooks (no cover)', author_name: ['Katie Kirby'] },
          { title: 'Lottie Brooks (Spanish)', author_name: ['Katie Kirby'], cover_i: 13000000, first_publish_year: 2022 }]
        : [];
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ docs }) });
    });
    await ctx.route('https://covers.openlibrary.org/**', route => route.fulfill({ status: 200, contentType: 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: COVER }));
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const toast = async text => {
      try { await p.waitForFunction(t => { const el = document.querySelector('#toast'); return el.classList.contains('show') && el.textContent.replace(/\s+/g, ' ').trim() === t; }, text, { timeout: 8000 }); }
      catch (e) { assert.equal(clean(await p.textContent('#toast')), text); }
    };
    const points = () => p.evaluate(async () => (await import('/book-dude-next/app/money.js')).rewardPoints());
    const rec = id => p.evaluate(async id => (await import('/book-dude-next/app/state.js')).state.records[id] || null, id);

    await p.goto(BASE);
    await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    // Her points come from a school total, like Maddy's.
    await p.evaluate(async () => { const m = await import('/book-dude-next/app/money.js'); await m.saveReward({ school: 52.5, schoolStart: 40, schoolDate: '2026-11-10' }); });
    assert.equal(await points(), 12.5);

    // Add the first book, and find its cover.
    await p.$eval('.tab[data-tab="shelves"]', e => e.click());
    await p.waitForSelector('[data-act="add-book"]');
    await p.$eval('[data-act="add-book"]', e => e.click());
    await p.waitForSelector('#bk-title');
    await p.click('[data-act="form-cover"]');
    await toast('Type the book’s title first.');
    await p.fill('#bk-title', 'The Extremely Embarrassing Life of Lottie Brooks');
    await p.fill('#bk-author', 'Katie Kirby');
    await p.click('[data-act="form-cover"]');
    await p.waitForSelector('#confirm[open] .cover-pick');
    assert.equal(clean(await p.textContent('#cover-status')), 'Tap the right cover.');
    assert.deepEqual(await p.$$eval('.cover-pick', els => els.map(e => e.textContent.trim())), ['Extremely Embarrassing Life of Lottie Brooks (2021)', 'Lottie Brooks (Spanish) (2022)'], 'one choice per cover, none without one');
    assert.match(searches[0], /^\/search\.json\?title=The\+Extremely\+Embarrassing\+Life\+of\+Lottie\+Brooks&fields=.*&author=Katie\+Kirby$/);
    await p.click('.cover-pick');
    await toast('Cover found. Save the book to keep it.');
    assert.ok(await p.$('#bk-photo img.photo-preview'), 'the cover shows in the form');
    await p.click('[data-act="pick-status"][data-status="finished"]');
    await p.$eval('form[data-form="book"] button[type="submit"]', e => e.click());
    await toast('Added “The Extremely Embarrassing Life of Lottie Brooks” to your books!');
    const id = await p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.openId);
    const book = await p.evaluate(async id => (await import('/book-dude-next/app/state.js')).state.custom[id], id);
    assert.match(book.photo, /^data:image\/jpeg;base64,/, 'the cover is kept with the book, like a photo');
    assert.ok(book.photo.length < 400000);
    // A title Open Library doesn't know says so.
    await p.click('[data-act="quick-cover"]');
    await p.waitForSelector('#confirm[open] .cover-pick');
    await p.click('[data-act="close-confirm"]');

    // Give it 4 home points.
    await p.waitForSelector('.home-points');
    assert.match(clean(await p.textContent('.home-points')), /No AR quiz for this book\? Give points for it here/);
    await p.click('[data-act="home-change"]');
    await p.waitForSelector('#home-input');
    await p.fill('#home-input', '400');
    await p.$eval('form[data-form="home-points"] button[type="submit"]', e => e.click());
    assert.equal(clean(await p.textContent('#home-error')), 'Points must be a number from 0 to 99, like 4.');
    await p.fill('#home-input', '4');
    await p.$eval('form[data-form="home-points"] button[type="submit"]', e => e.click());
    await p.waitForSelector('.home-points .big');
    assert.match(clean(await p.textContent('.home-points')), /^Home points\s*4\s*home points\s*Given [A-Z][a-z]{2} \d{1,2}, \d{4}\. They count like AR points/);
    assert.equal(await points(), 16.5, 'on top of the school total');
    const r = await rec(id);
    assert.deepEqual([r.homePoints, r.earnedPoints], [4, null], 'home points, not an AR quiz result');

    // The Progress tab says where the extra points came from.
    await p.click('[data-act="close-sheet"]');
    await p.$eval('.tab[data-tab="progress"]', e => e.click());
    await p.waitForSelector('.jar-tally');
    assert.match(clean(await p.textContent('#main')), /Points from the school’s AR report, updated Nov 10, 2026\. Plus 4 home points from 1 book with no AR quiz\./);

    // A passcode: changing them asks a grown-up.
    await p.evaluate(async () => { const m = await import('/book-dude-next/app/money.js'); await m.saveReward({ code: window.ReadingCore.codeHash('1234') }); });
    await p.evaluate(async id => (await import('/book-dude-next/app/book.js')).openBook(id), id);
    await p.waitForSelector('.home-points .big');
    await p.click('[data-act="home-change"]');
    await p.waitForSelector('#passcode');
    await p.fill('#passcode', '1234');
    await p.$eval('form[data-form="passcode"] button[type="submit"]', e => e.click());
    await p.waitForSelector('#home-input');
    assert.equal(await p.inputValue('#home-input'), '4');
    await p.fill('#home-input', '5');
    await p.$eval('form[data-form="home-points"] button[type="submit"]', e => e.click());
    await toast('Home points updated.');
    assert.equal(await points(), 17.5);

    // They travel in a backup.
    const backup = await p.evaluate(async () => { const s = (await import('/book-dude-next/app/state.js')).state; return window.ReadingCore.exportBackup(s.records, s.settings, undefined, s.custom); });
    assert.equal(backup.records[id].homePoints, 5);

    // And can be taken back.
    await p.click('[data-act="home-clear"]');
    await p.click('#confirm [data-act="confirm-ok"]');
    await toast('Home points taken back.');
    assert.equal(await points(), 12.5);
    assert.match(clean(await p.textContent('.home-points')), /Give points for this book/);

    assert.deepStrictEqual(errors, []);
    console.log('A book with no AR quiz gets its cover from Open Library and home points that count on top of the school total, ask for the passcode, travel in a backup, and can be taken back.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
