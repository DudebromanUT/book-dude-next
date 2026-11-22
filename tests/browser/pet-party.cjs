/* Fig's Litter-Robot on the Progress tab: every point fills the waste drawer toward the next 10, and a full drawer
 * stays full (and stinky) until she spends 10 points. Spending on money makes Fig dance with dollar bills; on screen
 * time, Maple chases a ball. Piano practice: a grown-up checks each 15 minutes, worth 15 minutes of screen time.
 * The clock is fixed at November 22, 2026.
 *
 *   Run:  node tests/browser/pet-party.cjs
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
  const SHOTS = process.env.SHOTS;
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date('2026-11-22T12:00:00-07:00'));
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE);
    await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    const save = (id, r) => p.evaluate(async ([id, r]) => (await import('/book-dude-next/app/state.js')).save(id, r), [id, r]);
    const progress = async () => { await p.$eval('.tab[data-tab="explore"]', e => e.click()); await p.$eval('.tab[data-tab="progress"]', e => e.click()); await p.waitForSelector('#pet-meters'); };
    const fig = async () => clean(await p.innerText('#pet-meters .fig'));
    const shot = async name => { if (!SHOTS) return; await p.$eval('#toast', e => { e.style.display = 'none'; }); await p.$eval('#pet-meters .fig', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); await p.$eval('#toast', e => { e.style.display = ''; }); };

    // Empty: fresh. Then 2 points: getting ripe. Then 6.5: smelly, with flies.
    await progress();
    assert.match(await fig(), /Fig’s Litter-Robot Ready Fresh\. Suspiciously fresh\. .* Waste: 0% · 0 of 10 points .* Scoops Saved 0/);
    await save('exam:topaz-mountain', { earnedPoints: 2, quizScore: 100, quizDate: '2026-11-14' });
    await progress();
    assert.match(await fig(), /Getting Ripe .* Waste: 20% · 2 of 10 points/);
    await save('hatchet--gary-paulsen', { status: 'finished', earnedPoints: 4.5, quizDate: '2026-11-15' });
    await progress();
    assert.match(await fig(), /Smelly Cat The flies have started a book club\. Waste: 65% · 6\.5 of 10 points/);
    assert.equal(await p.$$eval('#pet-meters .robot-fly', e => e.length), 2);
    await shot('robot-smelly');
    assert.equal(await p.$('#pet-meters [data-act="choose"]'), null, 'nothing to spend yet');

    // 16.5 points: the drawer is full and stays full until she spends.
    await save('frindle--andrew-clements', { status: 'finished', earnedPoints: 10, quizDate: '2026-11-18' });
    await progress();
    assert.match(await fig(), /DRAWER FULL Fig is filing a complaint .* 10 points to spend · 6\.5 already in the next drawer .* \$10 60 minutes Scoops Saved 0/);
    assert.equal(await p.$$eval('#pet-meters .robot.full', e => e.length), 1);
    await shot('robot-full');
    assert.equal(await p.$('.choice-card'), null, 'the old spend card is gone; the buttons are in Fig’s card');

    // Money: Fig dances with dollar bills, and the drawer is clean again.
    await p.$eval('#pet-meters [data-act="choose"][data-to="jar"]', e => e.click());
    await p.waitForSelector('.party.party-fig .critter-fig');
    assert.equal(await p.$$eval('.party .bill', e => e.length), 14);
    assert.match(clean(await p.innerText('.party-say')), /Drawer clean! Fig is doing her happy dance\./);
    if (SHOTS) { await p.waitForTimeout(1300); await p.screenshot({ path: path.join(SHOTS, 'party-fig.png') }); }
    await p.click('.party');
    assert.equal(await p.$('.party'), null, 'a tap ends the party');
    assert.match(await fig(), /Smelly Cat .* Waste: 65% · 6\.5 of 10 points .* Scoops Saved 1/);

    // Screen time: Maple chases a ball.
    await save('holes--louis-sachar', { status: 'finished', earnedPoints: 3.5, quizDate: '2026-11-19' });
    await progress();
    await p.$eval('#pet-meters [data-act="choose"][data-to="minutes"]', e => e.click());
    await p.waitForSelector('.party.party-maple .critter-maple');
    assert.equal(await p.$$eval('.party .ball', e => e.length), 1);
    if (SHOTS) { await p.waitForTimeout(1200); await p.screenshot({ path: path.join(SHOTS, 'party-maple.png') }); }
    await p.waitForFunction(() => !document.querySelector('.party'), null, { timeout: 6000 });
    assert.match(await fig(), /Ready .* Waste: 0% · 0 of 10 points .* Scoops Saved 2/);
    const screen = async () => clean(await p.innerText('.screen-card'));
    assert.match(await screen(), /^Screen time 60 minutes waiting/i);

    // Piano: a grown-up checks each 15 minutes; each is 15 minutes of screen time.
    await p.evaluate(async () => { const m = await import('/book-dude-next/app/money.js'); await m.saveReward({ code: window.ReadingCore.codeHash('1234') }); });
    await progress();
    assert.match(clean(await p.innerText('#piano')), /^Piano practice 15 min = 15 min of screen time .* Today \+ Yesterday \+ Fri, Nov 20 \+ .* Mon, Nov 16 \+ This week: 0 min of practice · All time: 0 min/);
    await p.$eval('#piano .piano-day.today [data-act="piano-add"]', e => e.click());
    await p.waitForSelector('#passcode');
    await p.fill('#passcode', '1234');
    await p.$eval('form[data-form="passcode"] button[type="submit"]', e => e.click());
    await p.waitForFunction(() => document.querySelectorAll('#piano .today .piano-check.done').length === 1);
    for (let i = 0; i < 2; i++) await p.$eval('#piano .piano-day.today [data-act="piano-add"]', e => e.click());
    await p.$$eval('#piano .piano-day:nth-child(2) [data-act="piano-add"]', e => e[0].click());
    await p.waitForFunction(() => document.querySelectorAll('#piano .piano-check.done').length === 4);
    let piano = clean(await p.innerText('#piano'));
    assert.match(piano, /Today ✓ ✓ ✓ \+ 45 min Yesterday ✓ \+ 15 min/);
    assert.match(piano, /This week: 60 min of practice · All time: 60 min of screen time from piano/);
    assert.match(await screen(), /^Screen time 120 minutes waiting .* 120 minutes earned \(60 from points, 0 from books, 60 from piano\)/i);
    assert.match(await screen(), /Move 60 minutes to the jar/, 'points minutes can still go to the jar');
    if (SHOTS) { await p.$eval('#toast', e => { e.style.display = 'none'; }); await p.$eval('#piano', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(SHOTS, 'piano.png') }); }
    // Take one back.
    await p.$$eval('#piano .today .piano-check.done', e => e[0].click());
    await p.waitForFunction(() => document.querySelectorAll('#piano .piano-check.done').length === 3);
    assert.match(await screen(), /^Screen time 105 minutes waiting/i);
    const saved = await p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.piano);
    assert.deepEqual(saved, { '2026-11-22': 2, '2026-11-21': 1 });

    assert.deepStrictEqual(errors, []);
    console.log('Fig’s Litter-Robot fills with every point and stays full until she spends 10; money makes Fig dance, screen time sends Maple after a ball; piano checks add 15 minutes each.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
