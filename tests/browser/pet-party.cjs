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
    // Screen-time alerts go to ntfy, straight from Book Dude. Set up in Settings, behind the passcode (still open).
    const G = 'bookdude-0123abcd456789ef0123', K = 'bookdude-kid-0123abcd456789ef0123';
    const ntfy = [];
    await p.route('https://ntfy.sh/**', r => {
      const q = r.request();
      ntfy.push({ method: q.method(), url: q.url(), body: q.postData() ? JSON.parse(q.postData()) : null });
      r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    });
    await p.$eval('.tab[data-tab="more"]', e => e.click());
    await p.waitForSelector('#alerts-panel');
    assert.match(clean(await p.innerText('#alerts-panel')), /^Screen-time alerts for grown-ups Get an alert in the free ntfy app .* Set up alerts$/i);
    await p.$eval('#alerts-panel [data-act="alerts-open"]', e => e.click());
    await p.waitForSelector('#confirm[open] #alerts-grown');
    await p.$eval('#confirm [data-act="alerts-new"]', e => e.click());
    const made = await p.$$eval('#alerts-grown, #alerts-kid', e => e.map(i => i.value));
    assert.match(made[0], /^bookdude-[0-9a-f]{20}$/);
    assert.match(made[1], /^bookdude-kid-[0-9a-f]{20}$/);
    await p.fill('#alerts-grown', 'ntfy.sh/' + G);
    await p.$eval('form[data-form="alerts"] button[type="submit"]', e => e.click());
    await p.waitForFunction(() => !document.getElementById('alerts-error').hidden);
    assert.match(clean(await p.innerText('#alerts-error')), /Check the grown-ups’ name: .* \(just the name, not ntfy\.sh\/\)\./);
    await p.fill('#alerts-grown', G);
    await p.fill('#alerts-kid', K);
    await p.$eval('form[data-form="alerts"] button[type="submit"]', e => e.click());
    await p.waitForSelector('#confirm[open] [data-act="alerts-test"]');
    const alertsSaved = await p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.alerts);
    assert.deepEqual([alertsSaved.grown, alertsSaved.kid], [G, K]);
    assert.match(alertsSaved.key, /^pk[0-9a-f]{40}$/, 'and a pause code for the grown-ups\' Pause and Resume buttons');
    const PK = alertsSaved.key;
    assert.match(clean(await p.innerText('#alerts-panel')), /^Screen-time alerts for grown-ups On\. /i);
    await p.$eval('#confirm [data-act="alerts-test"]', e => e.click());
    await p.waitForFunction(() => /Test alerts sent/.test(document.getElementById('toast').textContent));
    assert.deepEqual(ntfy.map(n => [n.method, n.url, n.body.topic, n.body.title]).sort(), [['POST', 'https://ntfy.sh/', G, 'Book Dude alerts are on'], ['POST', 'https://ntfy.sh/', K, 'Hi from Fig!']]);
    assert.equal(ntfy[0].body.attach, BASE + 'timer/img/fig-awake.png', 'with Fig');
    ntfy.length = 0;
    await p.$eval('#confirm [data-act="close-confirm"]', e => e.click());
    await progress();
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
    // What went to ntfy: an alert to each topic for every change, and the 5-minute heads-up and time's up handed to
    // ntfy to deliver later, cancelled when the clock pauses or stops and set again when it goes on.
    const t = (h, m, sec = 0) => String(Date.parse('2026-11-22T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + '-07:00') / 1000);
    for (let i = 0; i < 50 && ntfy.filter(n => n.method === 'POST').length < 22; i++) await p.waitForTimeout(100);
    const now = ntfy.filter(n => n.method === 'POST' && !n.body.delay);
    const later = ntfy.filter(n => n.method === 'POST' && n.body.delay);
    const gone = ntfy.filter(n => n.method === 'DELETE');
    assert.deepEqual(now.filter(n => n.body.topic === G).map(n => n.body.title + ': ' + n.body.message), [
      'Screen time started: Maddy: 15 min, ends 12:15 PM. Bank: 45 min.',
      'Screen time paused: Maddy has 10 min left. Bank: 45 min.',
      'Screen time is back on: Maddy: 10 min left, ends 12:40 PM. Bank: 45 min.',
      'Screen time stopped early: Maddy’s clock was stopped. 8 min went back to her bank. Bank: 53 min.',
      'Screen time started: Maddy: 15 min, ends 12:46 PM. Bank: 38 min.'
    ]);
    assert.equal(now.filter(n => n.body.topic === K).length, 5, 'and Fig tells her, every time');
    assert.match(now.find(n => n.body.topic === K).body.title, /^(Screen time! Fig is wide awake|Fig says: go!|Screen time is on)$/);
    assert.deepEqual(now.filter(n => n.body.topic === G).map(n => n.body.attach.replace(BASE + 'timer/img/', '')), ['fig-awake.png', 'fig-paused.png', 'fig-awake.png', 'fig-asleep.png', 'fig-awake.png']);
    // The grown-ups' alerts carry Pause (while it runs) or Resume (while paused), with the pause code; hers never do.
    const buttons = n => n.body.actions.map(a => a.label + (a.url.includes('do=pause') ? ':pause' : a.url.includes('do=resume') ? ':resume' : '')).join(' ');
    assert.deepEqual(now.filter(n => n.body.topic === G).map(buttons), ['Pause:pause Fig-o-Clock', 'Resume:resume Fig-o-Clock', 'Pause:pause Fig-o-Clock', 'Fig-o-Clock', 'Pause:pause Fig-o-Clock']);
    assert.ok(now.filter(n => n.body.topic === G).every(n => n.body.click.includes('&pk=' + PK)), 'her grown-ups\' Fig-o-Clock links can pause it');
    assert.ok(ntfy.filter(n => n.body && n.body.topic === K).every(n => !JSON.stringify(n.body).includes(PK)), 'her iPad never gets the pause code');
    assert.equal(buttons(later.find(n => n.body.topic === G && n.body.title === '5 minutes left')), 'Pause:pause Fig-o-Clock', 'the heads-up can pause it too');
    assert.equal(buttons(later.find(n => n.body.topic === G && n.body.title === 'Screen time is up!')), 'Fig-o-Clock');
    const first = now[0].body.click;
    assert.ok(first.startsWith(BASE + 'timer/#s=r&m=15&e=' + t(12, 15) + '&b=45&k='), 'a tap opens the Fig-o-Clock: ' + first);
    const ids = (await timerNow()).id;
    assert.deepEqual(later.filter(n => n.body.topic === G).map(n => [n.body.title, n.body.delay, n.body.priority, n.body.sequence_id.replace(/^bookdude-\w+-/, '')]), [
      ['5 minutes left', t(12, 10), 4, 'warn'], ['Screen time is up!', t(12, 15), 5, 'up'],
      ['5 minutes left', t(12, 35), 4, 'warn'], ['Screen time is up!', t(12, 40), 5, 'up'],
      ['5 minutes left', t(12, 41, 30), 4, 'warn'], ['Screen time is up!', t(12, 46, 30), 5, 'up']
    ]);
    assert.ok(later.slice(-2).every(n => n.body.sequence_id.startsWith('bookdude-' + ids + '-')), 'named for the clock they belong to');
    assert.deepEqual(gone.filter(n => n.url.includes('/' + G + '/')).map(n => n.url.replace(/^.*-/, '')).join(' '), 'warn up warn up warn up', 'pause, resume and stop clear them first');
    assert.equal(gone.length, 12, 'on both topics');
    // The Fig-o-Clock: the link's own time right away, then the clock as it is now, from the topic's newest alert.
    const figPage = await ctx.newPage();
    figPage.on('pageerror', e => errors.push(e.message));
    let looks = 0;
    const endsAt = Math.round(Date.parse('2026-11-22T12:30:00-07:00') / 1000);
    await figPage.route('https://ntfy.sh/**', r => {
      looks++;
      assert.match(r.request().url(), new RegExp('^https://ntfy\\.sh/' + K + '/json\\?poll=1&since=12h$'));
      const msg = (time, hash) => JSON.stringify({ id: 'm' + time, time, event: 'message', topic: K, title: 'x', message: 'x', click: BASE + 'timer/#' + hash });
      r.fulfill({ contentType: 'application/x-ndjson', headers: { 'access-control-allow-origin': '*' }, body: [
        msg(100, 's=r&m=30&e=' + endsAt + '&b=45&k=' + K), msg(300, 's=p&m=30&l=600&b=38&k=' + K), JSON.stringify({ id: 'q', time: 200, event: 'message', click: BASE + 'timer/' })].join('\n') + '\n' });
    });
    await figPage.goto(BASE + 'timer/#s=r&m=30&e=' + endsAt + '&b=45');
    await figPage.waitForFunction(() => /min still in Maddy’s bank/.test(document.getElementById('bank').textContent));
    assert.match(clean(await figPage.innerText('.wrap')), /Fig-o-Clock .* ended 12:30 PM Fig is asleep\. So is screen time\. .* 45 min still in Maddy’s bank/);
    assert.equal(looks, 0, 'no topic, nothing to ask');
    await figPage.goto(BASE + 'timer/#s=r&m=30&e=' + endsAt + '&b=45&k=' + K);
    await figPage.waitForFunction(() => /^Paused\./.test(document.getElementById('caption').textContent));
    assert.match(clean(await figPage.innerText('.wrap')), /10:00 paused Paused\. Fig is holding perfectly still.* 38 min still in Maddy’s bank/);
    assert.ok(looks >= 1);
    await figPage.close();
    // From an alert's Pause button: the Fig-o-Clock pauses the clock in the family account right away, sends the
    // alerts, and offers Resume.
    const ctl = await ctx.newPage();
    ctl.on('pageerror', e => errors.push(e.message));
    const rpcCalls = [], sent = [];
    let clockState = 'running';
    await ctl.route('https://coolooehjmqrxnndremb.supabase.co/**', r => {
      const body = JSON.parse(r.request().postData());
      rpcCalls.push(body);
      const answer = body.pause_key !== PK ? { error: 'unknown' } : (() => {
        const changed = body.what !== 'look' && (body.what === 'pause') === (clockState === 'running');
        if (changed) clockState = body.what === 'pause' ? 'paused' : 'running';
        const fixed = Date.parse('2026-11-22T12:47:00-07:00');
        return { ok: true, changed, state: clockState, name: 'Maddy', id: 'clockabc123', minutes: 30, left: 18 * 60000,
          ends: clockState === 'running' ? fixed + 18 * 60000 : 0, grown: G, kid: K };
      })();
      r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(answer) });
    });
    await ctl.route('https://ntfy.sh/**', r => {
      const q = r.request();
      if (q.url().includes('/json?')) return r.fulfill({ contentType: 'application/x-ndjson', headers: { 'access-control-allow-origin': '*' }, body: '' });
      sent.push({ method: q.method(), url: q.url(), body: q.postData() ? JSON.parse(q.postData()) : null });
      r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    });
    const runEnds = Math.round(Date.parse('2026-11-22T13:05:00-07:00') / 1000);
    await ctl.goto(BASE + 'timer/#s=r&m=30&e=' + runEnds + '&b=38&k=' + G + '&pk=' + PK + '&do=pause');
    await ctl.waitForFunction(() => /^Paused on every device\. 18:00 saved for later\./.test(document.getElementById('ctl-msg').textContent));
    assert.deepEqual(rpcCalls, [{ pause_key: PK, what: 'pause' }]);
    assert.ok(!(await ctl.evaluate(() => location.hash)).includes('do='), 'a reload won\'t pause it again');
    await ctl.waitForFunction(() => document.getElementById('ends').textContent === 'paused' && /Resume/.test(document.getElementById('ctl').textContent));
    assert.match(clean(await ctl.innerText('.wrap')), /18:00 paused Paused\. Fig is holding perfectly still.* Resume screen time/);
    assert.deepEqual(sent.filter(n => n.method === 'DELETE').map(n => n.url.replace('https://ntfy.sh/', '')).sort(),
      [G + '/bookdude-clockabc123-up', G + '/bookdude-clockabc123-warn', K + '/bookdude-clockabc123-up', K + '/bookdude-clockabc123-warn'], 'the heads-up and time\'s up are cancelled');
    const pausedNow = sent.filter(n => n.method === 'POST');
    assert.deepEqual(pausedNow.filter(n => n.body.topic === G).map(n => [n.body.title, n.body.message]), [['Screen time paused', 'Maddy has 18 min left. Bank: 38 min.']]);
    assert.equal(pausedNow.filter(n => n.body.topic === K).length, 1);
    if (SHOTS) await ctl.screenshot({ path: path.join(SHOTS, 'fig-paused-control.png') });
    // Resume, from the page's own button: the clock goes again, and the heads-up and time's up are set again.
    sent.length = 0;
    await ctl.click('#ctl');
    await ctl.waitForFunction(() => /^Back on\. It ends at 1:05 PM\./.test(document.getElementById('ctl-msg').textContent));
    assert.deepEqual(rpcCalls.map(c => c.what), ['pause', 'resume']);
    const back = sent.filter(n => n.method === 'POST' && n.body.topic === G);
    assert.deepEqual(back.map(n => [n.body.title, n.body.delay || '']), [['Screen time is back on', ''], ['5 minutes left', String(runEnds - 300)], ['Screen time is up!', String(runEnds)]]);
    await ctl.waitForFunction(() => /^Pause screen time/.test(document.getElementById('ctl').textContent));
    // An old alert's button (a pause code that's no longer the family's) does nothing, and says so.
    await ctl.goto('about:blank');
    await ctl.goto(BASE + 'timer/#s=r&m=30&e=' + runEnds + '&k=' + G + '&pk=pk' + '0'.repeat(40) + '&do=pause');
    await ctl.waitForFunction(() => /This button is from an old alert/.test(document.getElementById('ctl-msg').textContent));
    // Her own link has no pause code, so no button.
    await ctl.goto('about:blank');
    await ctl.goto(BASE + 'timer/#s=r&m=30&e=' + runEnds + '&k=' + K);
    await ctl.waitForTimeout(500);
    assert.equal(await ctl.isVisible('#controls'), false);
    await ctl.close();
    // With alerts off, the clock still works and nothing goes to ntfy.
    await p.evaluate(async () => { (await import('/book-dude-next/app/state.js')).state.settings.alerts = null; });
    ntfy.length = 0;
    await grown('.screen-card [data-act="minutes-given"]');
    await p.waitForSelector('#confirm[open] [data-act="minutes-give"][data-min="15"]');
    await p.$eval('#confirm [data-act="minutes-give"][data-min="15"]', e => e.click());
    await p.waitForFunction(() => /23/.test(document.querySelector('.screen-card .jar-count').textContent));
    await grown('#screen-timer [data-act="timer-stop"]');
    await p.waitForSelector('#confirm[open] [data-act="confirm-ok"]');
    await p.$eval('#confirm [data-act="confirm-ok"]', e => e.click());
    await p.waitForFunction(() => /38/.test(document.querySelector('.screen-card .jar-count').textContent));
    assert.equal(ntfy.length, 0);
    await p.unroute('https://ntfy.sh/**');
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
