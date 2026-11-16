/* The Games tab and the first game in the arcade, Maple's Big Day (Maple Madness), on a device that isn't signed in:
 * the tab lists the game, the game's page opens with its own look and fonts and nothing loaded from another site, a
 * level starts and runs, scores from the game's old standalone site on this device come along once, a score saved by
 * the game shows on the Games tab, the way back works, and all of it works offline. (A signed-in reader's scores
 * travelling between her devices is in account.cjs.)
 *
 *   Run:  node tests/browser/games.cjs
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
    // The built-in reading history isn't part of this: an empty one, so the shelves stay empty and offline still gets ready.
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

(async () => {
  const server = await serve();
  const ORIGIN = 'http://127.0.0.1:' + server.address().port;
  const BASE = ORIGIN + '/book-dude-next/';
  const browser = await chromium.launch();
  const errors = [], outside = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPad (gen 7)'], timezoneId: 'America/Denver' });
    // Scores from the game's old standalone site, which lived at this same web address.
    await ctx.addInitScript(() => {
      if (localStorage.getItem('maple-records')) return;
      localStorage.setItem('maple-records', JSON.stringify({ Maddy: { poop: { stars: 2, score: 120 } }, Dad: { poop: { stars: 3, score: 200 }, tug: { stars: 1, score: 8 } } }));
      localStorage.setItem('maple-profile', JSON.stringify({ player: 'Maddy', lang: 'es' }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('request', r => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) outside.push(r.url()); });

    const step = s => { if (process.env.STEPS) console.log('step: ' + s); };
    await p.goto(BASE);
    await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    await p.$eval('.tab[data-tab="games"]', e => e.click());
    await p.waitForSelector('.game-card');
    assert.equal(await p.evaluate(() => location.hash), '#games');
    assert.match(clean(await p.textContent('#main')), /Games\s*Maple’s Big Day\s*Poop Patrol, Catch Fig, Garden Duty and Tug of War.*No stars yet\. 4 levels to play\.\s*Play\s*Scores are kept on this device\./);

    step('tab ok');
    // The game's own page.
    await Promise.all([p.waitForNavigation(), p.click('.game-card a.btn')]);
    await p.waitForSelector('#levels .lvl');
    assert.ok(p.url().endsWith('/book-dude-next/games/maple-madness/'));
    assert.equal((await p.$$('#levels .lvl')).length, 4);
    assert.deepEqual(await p.evaluate(() => document.fonts.ready.then(() => [document.fonts.check('800 20px "Baloo 2"'), document.fonts.check('700 16px Nunito')])), [true, true], 'its fonts ship with the app');
    // The old scores and language came along: both players' names, Maddy picked, in Spanish.
    assert.deepEqual(await p.$$eval('#chips .chip', els => els.map(e => e.textContent + (e.getAttribute('aria-pressed') === 'true' ? '*' : ''))), ['Maddy*', 'Dad']);
    assert.equal(await p.getAttribute('html', 'lang'), 'es');
    assert.equal(await p.isHidden('#playerFixed'), true);
    assert.equal(await p.isVisible('#inPlayer'), true, 'on a device that isn\'t signed in, anyone can type a name');
    step('game page ok');
    // A level starts and runs.
    await p.click('#langEn');
    await p.click('#levels .lvl');
    await p.waitForSelector('#intro:not([hidden])');
    await p.click('#goBtn');
    await p.waitForSelector('#hud:not([hidden])');
    await sleep(1500);
    assert.equal(clean(await p.textContent('#hudTitle')), 'Poop Patrol');
    await p.click('#exitBtn');
    await p.waitForSelector('#menu:not([hidden])');
    step('level ok');
    // A better score, saved the way the game saves one, and the way back to Book Dude.
    await p.evaluate(() => { const a = window.BookDudeArcade.open('maple-madness'); const r = a.get('records'); r.Maddy.chase = { stars: 3, score: 41 }; a.set('records', r); });
    await Promise.all([p.waitForNavigation(), p.click('#homeLink')]);
    await p.waitForSelector('.game-card');
    assert.match(clean(await p.textContent('.game-card')), /7 stars of 12 so far\./, 'the best on each level: 3 + 3 + 1');
    // The old standalone scores are taken once: clearing a score here doesn't bring the old one back.
    await p.evaluate(() => localStorage.setItem('book-dude:arcade:/book-dude-next/device:maple-madness:records', JSON.stringify({ Maddy: {} })));
    await p.reload(); await p.waitForSelector('.game-card');
    assert.match(clean(await p.textContent('.game-card')), /No stars yet/);

    step('scores ok');
    // Offline: the tab and the game both open.
    await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1500);
    await ctx.setOffline(true);
    await p.reload(); await p.waitForSelector('.game-card');
    await Promise.all([p.waitForNavigation(), p.click('.game-card a.btn')]);
    await p.waitForSelector('#levels .lvl');
    assert.equal((await p.$$('#levels .lvl')).length, 4, 'the game opens with no internet');
    assert.deepEqual(await p.evaluate(() => document.fonts.ready.then(() => document.fonts.check('800 20px "Baloo 2"'))), true);

    step('offline ok');
    assert.deepStrictEqual(outside, [], 'nothing is loaded from another site');
    assert.deepStrictEqual(errors, []);
    console.log('The Games tab lists Maple\'s Big Day; the game opens, plays, keeps scores, brings its old ones along once, and works offline, loading nothing from anywhere else.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
