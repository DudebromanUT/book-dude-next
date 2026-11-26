/* Fig's Litter-Robot on the Progress tab: the waste drawer starts full, every point scoops some out, and at 10 it's
 * clean until she spends the points. Spending on money makes Fig dance with dollar bills; on screen time, Maple chases
 * a ball. Piano practice: a grown-up checks each 15 minutes; 90 minutes in the week unlock cashing in screen time,
 * Friday after school through Sunday. The clock is fixed at Sunday, November 22, 2026, noon.
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

    // No points: the drawer is full and gross. Every point scoops some out.
    await progress();
    assert.match(await fig(), /Fig’s Litter-Robot FULL! DRAWER FULL Fig is filing a complaint .* Clean: 0% · 0 of 10 points scooped .* Scoops Saved 0/);
    assert.equal(await p.$$eval('#pet-meters .robot-fly', e => e.length), 4);
    await shot('robot-full');
    await save('exam:topaz-mountain', { earnedPoints: 2, quizScore: 100, quizDate: '2026-11-14' });
    await progress();
    assert.match(await fig(), /Code Brown .* Clean: 20% · 2 of 10 points scooped/);
    await save('hatchet--gary-paulsen', { status: 'finished', earnedPoints: 4.5, quizDate: '2026-11-15' });
    await progress();
    assert.match(await fig(), /Smelly Cat Halfway there\. The flies are packing their bags\. Clean: 65% · 6\.5 of 10 points scooped/);
    assert.equal(await p.$$eval('#pet-meters .robot-fly', e => e.length), 1);
    assert.equal(await p.$('#pet-meters [data-act="choose"]'), null, 'nothing to spend yet');

    // 16.5 points: sparkling clean, and it stays clean until she spends.
    await save('frindle--andrew-clements', { status: 'finished', earnedPoints: 10, quizDate: '2026-11-18' });
    await progress();
    assert.match(await fig(), /CLEAN! Sparkling Clean! Fig approves\. .* 10 points to spend · 6\.5 already in the next drawer .* \$10 60 minutes Scoops Saved 0/);
    assert.equal(await p.$$eval('#pet-meters .robot-sparkle path', e => e.length), 5);
    assert.equal(await p.$$eval('#pet-meters .robot-fly', e => e.length), 0);
    await shot('robot-clean');

    // Money: Fig dances with dollar bills, and makes a fresh mess.
    await p.$eval('#pet-meters [data-act="choose"][data-to="jar"]', e => e.click());
    await p.waitForSelector('.party.party-fig .critter-fig');
    assert.equal(await p.$$eval('.party .bill', e => e.length), 14);
    assert.match(clean(await p.innerText('.party-say')), /Ka-ching! Fig is doing her happy dance\. Fig celebrated by making a fresh one\./);
    if (SHOTS) { await p.waitForTimeout(1300); await p.screenshot({ path: path.join(SHOTS, 'party-fig.png') }); }
    await p.click('.party');
    assert.equal(await p.$('.party'), null, 'a tap ends the party');
    assert.match(await fig(), /Smelly Cat .* Clean: 65% · 6\.5 of 10 points scooped .* Scoops Saved 1/);

    // Screen time: Maple chases Duck Duck.
    await save('holes--louis-sachar', { status: 'finished', earnedPoints: 3.5, quizDate: '2026-11-19' });
    await progress();
    await p.$eval('#pet-meters [data-act="choose"][data-to="minutes"]', e => e.click());
    await p.waitForSelector('.party.party-maple .critter-maple');
    assert.equal(await p.$$eval('.party .ball', e => e.length), 1);
    if (SHOTS) { await p.waitForTimeout(1200); await p.screenshot({ path: path.join(SHOTS, 'party-maple.png') }); }
    await p.waitForFunction(() => !document.querySelector('.party'), null, { timeout: 6000 });
    assert.match(await fig(), /DRAWER FULL .* Clean: 0% · 0 of 10 points scooped .* Scoops Saved 2/);
    const screen = async () => clean(await p.innerText('.screen-card'));

    // It's Sunday, so cash-in is open, but only with 90 minutes of piano this week (Monday the 16th to today).
    assert.match(await screen(), /^Screen time 60 minutes waiting .* Piano first: 0 of 90 minutes this week\. Maple is holding the remote hostage\. Grown-up: cash in anyway/i);
    await p.evaluate(async () => { const m = await import('/book-dude-next/app/money.js'); await m.saveReward({ code: window.ReadingCore.codeHash('1234') }); });
    await progress();
    assert.match(clean(await p.innerText('#piano')), /^Piano practice 90 min a week unlocks screen time 0 min of 90 min this week .* Today \+ Yesterday \+ Fri, Nov 20 \+ Thu, Nov 19 \+ Wed, Nov 18 \+ Tue, Nov 17 \+ Mon, Nov 16 \+ Grown-ups/);
    await p.$eval('#piano .piano-day.today [data-act="piano-add"]', e => e.click());
    await p.waitForSelector('#passcode');
    await p.fill('#passcode', '1234');
    await p.$eval('form[data-form="passcode"] button[type="submit"]', e => e.click());
    await p.waitForFunction(() => document.querySelectorAll('#piano .today .piano-check.done').length === 1);
    // One tap at a time, each waiting for the card to show it, like fingers on a phone.
    const tap = async (row, n) => {
      await p.$eval('#piano .piano-day:nth-child(' + row + ') [data-act="piano-add"]', e => e.click());
      await p.waitForFunction(k => document.querySelectorAll('#piano .piano-check.done').length === k, n);
    };
    await tap(1, 2); await tap(1, 3); await tap(2, 4);
    assert.match(clean(await p.innerText('#piano')), /60 min of 90 min this week .* Today ✓ ✓ ✓ \+ 45 min Yesterday ✓ \+ 15 min/);
    assert.match(await screen(), /^Screen time 60 minutes waiting .* Piano first: 60 of 90 minutes this week/i, 'piano earns no minutes');
    await tap(7, 5); await tap(7, 6);
    assert.match(clean(await p.innerText('#piano')), /90 min of 90 min this week · Weekend screen time unlocked! Maple has returned the remote/);
    assert.match(await screen(), /Cash-in is open! Any screen: iPad, Switch, laptop or TV\. Cash in \(a grown-up approves\)/);
    if (SHOTS) { await p.$eval('#toast', e => { e.style.display = 'none'; }); await p.$eval('#piano', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(SHOTS, 'piano.png') });
      await p.$eval('.screen-card', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(SHOTS, 'cash-in.png') }); await p.$eval('#toast', e => { e.style.display = ''; }); }
    // The family script (its link set right here) texts the grown-ups about the clock: what Book Dude tells it.
    const texts = [];
    await p.route('https://script.google.com/**', r => {
      if (r.request().method() === 'POST') texts.push(JSON.parse(r.request().postData()));
      r.fulfill({ contentType: 'application/json', body: r.request().method() === 'POST' ? '{"ok":true,"texted":2}' : '{"quizzes":[]}' });
    });
    await p.evaluate(async () => { (await import('/book-dude-next/app/state.js')).state.settings.schoolLink = 'https://script.google.com/macros/s/TESTLINK/exec?key=k123'; });
    assert.equal(await p.isVisible('#screen-timer'), false, 'no clock yet');
    // Cash in 15 of the 60 minutes.
    await p.$eval('.screen-card [data-act="minutes-given"]', e => e.click());
    await p.waitForSelector('#confirm[open] [data-act="minutes-give"]');
    assert.deepEqual(await p.$$eval('#confirm [data-act="minutes-give"]', e => e.map(b => b.textContent)), ['15 minutes', '30 minutes', 'All 60']);
    await p.$eval('#confirm [data-act="minutes-give"][data-min="15"]', e => e.click());
    await p.waitForFunction(() => /45/.test(document.querySelector('.screen-card .jar-count').textContent));
    // Cashing in starts the clock: a strip at the top of every tab, the same on every phone signed in.
    const strip = async () => clean(await p.innerText('#screen-timer'));
    // A grown-up's tap: the passcode is asked again when it has been more than 5 minutes.
    const grown = async sel => {
      await p.$eval(sel, e => e.click());
      if (await p.waitForSelector('#confirm[open] #passcode', { timeout: 700 }).catch(() => null)) {
        await p.fill('#passcode', '1234');
        await p.$eval('form[data-form="passcode"] button[type="submit"]', e => e.click());
      }
    };
    await p.waitForSelector('#screen-timer:not([hidden])');
    assert.match(await strip(), /^Screen time: 15:00 left ends 12:15 PM Pause Stop$/);
    assert.match(clean(await p.innerText('#toast')), /15 minutes of screen time cashed in\. The clock is running: it ends at 12:15 PM\./);
    const timerNow = () => p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.timer);
    assert.deepEqual(await timerNow().then(t => [t.minutes, t.start, t.used, t.stopped]), [15, Date.parse('2026-11-22T12:00:00-07:00'), 0, false]);
    await p.$eval('.tab[data-tab="games"]', e => e.click());
    assert.equal(await p.isVisible('#screen-timer'), true, 'on the Games tab too');
    await p.clock.setFixedTime(new Date('2026-11-22T12:05:00-07:00'));
    await p.waitForFunction(() => /10:00 left/.test(document.getElementById('screen-timer').textContent));
    if (SHOTS) { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(SHOTS, 'timer-running.png') }); }
    // A grown-up pauses it (the passcode is still open from cashing in): it holds still.
    await grown('#screen-timer [data-act="timer-pause"]');
    await p.waitForFunction(() => /^Screen time paused: 10:00 left/.test(document.getElementById('screen-timer').textContent));
    await p.clock.setFixedTime(new Date('2026-11-22T12:30:00-07:00'));
    await p.waitForTimeout(1200);
    assert.match(await strip(), /^Screen time paused: 10:00 left Resume Stop$/);
    await grown('#screen-timer [data-act="timer-resume"]');
    await p.waitForFunction(() => /10:00 left ends 12:40 PM/.test(document.getElementById('screen-timer').textContent));
    // Stopping early (with a yes) puts the whole minutes not used back in her bank.
    await p.clock.setFixedTime(new Date('2026-11-22T12:31:30-07:00'));
    await grown('#screen-timer [data-act="timer-stop"]');
    await p.waitForSelector('#confirm[open] [data-act="confirm-ok"]');
    assert.match(clean(await p.innerText('#confirm')), /Stop screen time\? The 8 minutes not used yet go back to her bank for later\./);
    await p.$eval('#confirm [data-act="confirm-ok"]', e => e.click());
    await p.waitForSelector('#screen-timer[hidden]', { state: 'attached' });
    await progress();
    assert.match(clean(await p.innerText('.screen-card .jar-count')), /53/);
    // A new cash-in starts a new clock; running out chimes and says so on any phone with Book Dude open.
    await p.evaluate(() => { window.__ups = []; window.__timerUp = id => window.__ups.push(id); });
    await grown('.screen-card [data-act="minutes-given"]');
    await p.waitForSelector('#confirm[open] [data-act="minutes-give"][data-min="15"]');
    await p.$eval('#confirm [data-act="minutes-give"][data-min="15"]', e => e.click());
    await p.waitForFunction(() => /15:00 left ends 12:46 PM/.test(document.getElementById('screen-timer').textContent));
    await p.clock.setFixedTime(new Date('2026-11-22T12:47:00-07:00'));
    await p.waitForSelector('#confirm[open] .timer-up-msg');
    assert.match(clean(await p.innerText('#confirm')), /Time’s up! .* screen time is over\. Maple has already hidden the remote\./);
    assert.equal(await p.evaluate(() => window.__ups.length), 1, 'the chime, once');
    assert.match(await strip(), /^Screen time is up! It ended at 12:46 PM\. OK$/);
    if (SHOTS) { await p.screenshot({ path: path.join(SHOTS, 'timer-up.png') }); }
    await p.$eval('#confirm [data-act="close-confirm"]', e => e.click());
    await p.$eval('#screen-timer [data-act="timer-ok"]', e => e.click());
    await p.waitForSelector('#screen-timer[hidden]', { state: 'attached' });
    // What the script was asked to text, in order.
    for (let i = 0; i < 50 && texts.length < 5; i++) await p.waitForTimeout(100);
    assert.deepEqual(texts.map(t => [t.action, t.event, t.minutes, t.left, t.endsText || '', t.back, t.added]), [
      ['timer', 'start', 15, 15, '12:15 PM', 0, 15],
      ['timer', 'pause', 15, 10, '', 0, 0],
      ['timer', 'resume', 15, 10, '12:40 PM', 0, 0],
      ['timer', 'stop', 15, 0, '', 8, 0],
      ['timer', 'start', 15, 15, '12:46 PM', 0, 15]
    ]);
    await p.unroute('https://script.google.com/**');
    await p.evaluate(async () => { (await import('/book-dude-next/app/state.js')).state.settings.schoolLink = ''; });
    await grown('.screen-card [data-act="minutes-given"]');
    await p.waitForSelector('#confirm[open] [data-act="minutes-give"][data-min="15"]');
    await p.$eval('#confirm [data-act="minutes-give"][data-min="15"]', e => e.click());
    await p.waitForFunction(() => /23/.test(document.querySelector('.screen-card .jar-count').textContent));
    await grown('#screen-timer [data-act="timer-stop"]');
    await p.waitForSelector('#confirm[open] [data-act="confirm-ok"]');
    await p.$eval('#confirm [data-act="confirm-ok"]', e => e.click());
    await p.waitForFunction(() => /38/.test(document.querySelector('.screen-card .jar-count').textContent));
    // Take a check back: the week drops below 90 and cash-in locks again.
    await p.$$eval('#piano .today .piano-check.done', e => e[0].click());
    await p.waitForFunction(() => document.querySelectorAll('#piano .piano-check.done').length === 5);
    assert.match(await screen(), /Piano first: 75 of 90 minutes this week/);
    const saved = await p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.piano);
    assert.deepEqual(saved, { '2026-11-22': 2, '2026-11-21': 1, '2026-11-16': 2 });

    assert.deepStrictEqual(errors, []);
    console.log('Fig’s Litter-Robot starts full, every point scoops it, and it stays clean until she spends 10; money makes Fig dance, screen time sends Maple after a ball; 90 minutes of piano a week unlock the weekend cash-in.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' '), (e.stack.match(/pet-party.cjs:\d+/) || [''])[0]); process.exit(1); });
