/* The Millcreek Trail on the Games tab: the family's homemade trail game opens from its card, plays (shop, travel,
 * stop), saves the trip through the arcade, offers it again after a reload, scores a finish for the family scoreboard
 * and the hall of fame, and works offline, loading nothing from another site.
 *
 *   Run:  node tests/browser/millcreek-trail.cjs
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
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('request', r => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) outside.push(r.url()); });
    const panel = async () => clean(await p.innerText('#panel'));
    const press = async id => { await p.click('#panel #' + id); };

    await p.goto(BASE);
    await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    await p.$eval('.tab[data-tab="games"]', e => e.click());
    await p.waitForSelector('.game-card');
    const cards = await p.$$eval('.game-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    assert.equal(cards.length, 2);
    assert.match(cards[1], /The Millcreek Trail\s*It’s 1862\. .*No stars yet\. 1 level to play\./);

    // The game's own page, with its own font and nothing from another site.
    await Promise.all([p.waitForNavigation(), p.$$eval('.game-card a.btn', els => els[1].click())]);
    await p.waitForSelector('#panel #go');
    assert.ok(p.url().endsWith('/book-dude-next/games/millcreek-trail/'));
    assert.equal(await p.evaluate(() => document.fonts.ready.then(() => document.fonts.check('22px VT323'))), true, 'its font ships with the app');
    assert.match(await panel(), /^The year is 1862\. Haddam and Katrina/);
    assert.deepEqual(await p.$$eval('#panel input', els => els.map(e => e.value)), ['Haddam', 'Katrina', 'Mabel', 'Twig', 'Gigi']);

    // Start, shop, and hit the trail.
    await p.selectOption('#mode', 'gentle');
    await press('go');
    assert.match(await panel(), /stock up at a San Francisco outfitter.* It won't be built for another 75 years\. Don't tell Haddam\./);
    await p.waitForTimeout(300);
    const tower = await p.evaluate(() => Array.from(document.getElementById('scene').getContext('2d').getImageData(141, 70, 1, 1).data));
    assert.ok(tower[0] > 120 && tower[0] > tower[2] * 1.4, 'the red bridge tower from the family\'s photo: ' + tower);
    if (process.env.SHOTS) await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'photo-sf.png') });
    await press('ok');
    for (let i = 0; i < 3; i++) await p.click('#panel [data-p="oxen"]');
    for (let i = 0; i < 24; i++) await p.click('#panel [data-p="food"]');
    for (let i = 0; i < 4; i++) await p.click('#panel [data-p="clothes"]');
    await press('buy');
    assert.match(await panel(), /have 6 .* have 600 lbs .* have 4/);
    await press('lv');
    await p.waitForSelector('#panel #go');
    // The health bars get their width without inline styles (the page's rules forbid them).
    assert.deepEqual(await p.$$eval('#panel .bar i', els => els.map(e => e.style.width)), ['100%', '100%', '100%', '100%', '100%']);
    await press('go');
    await p.waitForSelector('#panel #stop');
    await p.waitForTimeout(2500);
    // Events may stop the wagon: keep clicking Continue until we're back at the menu.
    for (let i = 0; i < 20 && !(await p.$('#panel #stop')) && !(await p.$('#panel #go')); i++) await p.click('#panel button.pri');
    if (await p.$('#panel #stop')) await press('stop');
    await p.waitForSelector('#panel #go');
    const trip = await p.evaluate(() => window.BookDudeArcade.open('millcreek-trail').get('trip'));
    assert.ok(trip && trip.miles > 0 && trip.oxen >= 5 && trip.mode === 'gentle', 'the trip saves through the arcade');
    assert.equal(await p.evaluate(() => localStorage.getItem('mct-save')), null, 'not under the old standalone key');

    // Coming back offers the saved trip.
    await p.reload();
    await p.waitForSelector('#panel #cont');
    await press('cont');
    await p.waitForSelector('#panel #go');

    // Hunting, big-game style: drag to aim, Fire, wind, drop, heart shots and wounded animals.
    await p.evaluate(() => { S.bullets = 40; });
    await press('hunt');
    await p.waitForSelector('#panel #fire');
    assert.match(await panel(), /^Drag on the picture to aim\. Tap Fire to shoot\. The wind pushes your bullet sideways/);
    assert.equal(await p.evaluate(() => mode + ':' + getComputedStyle(document.getElementById('scene')).touchAction), 'hunt:none', 'dragging aims, it doesn\'t scroll the page');
    // Dragging moves the crosshair by the finger's movement, not to where the finger is.
    const box = await p.locator('#scene').boundingBox();
    const aim0 = await p.evaluate(() => [hunt.ax, hunt.ay]);
    await p.mouse.move(box.x + 40, box.y + 40); await p.mouse.down(); await p.mouse.move(box.x + 140, box.y + 60, { steps: 5 }); await p.mouse.up();
    const aim1 = await p.evaluate(() => [hunt.ax, hunt.ay]);
    if (process.env.SHOTS) { await p.waitForTimeout(3500); await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'hunt-live.png') }); }
    assert.ok(aim1[0] > aim0[0] + 20 && aim1[1] > aim0[1], 'the crosshair moved right and down: ' + aim0 + ' -> ' + aim1);
    // A shot: one bullet, then a reload before the next; the wind pushes it and distance drops it.
    const shot = await p.evaluate(() => { hunt.wind = 10; hunt.windTo = 10; hunt.windT = 99; hunt.ax = 160; hunt.ay = 104; const b = S.bullets; fire(); fire(); const s = hunt.shots[0]; const [dx, dy] = sway(hunt.T); return { used: b - S.bullets, n: hunt.shots.length, drift: s.x - (160 + dx), drop: s.y - (104 + dy), t: s.t }; });
    assert.equal(shot.used, 1, 'the second tap is still reloading');
    assert.ok(shot.drift > 10 && shot.drop > 8 && shot.t > .5, 'a far shot drifts with the wind, drops and takes time: ' + JSON.stringify(shot));
    const near = await p.evaluate(() => { hunt.reload = 0; hunt.shots = []; hunt.ay = 140; fire(); const s = hunt.shots[0]; const [dx, dy] = sway(hunt.T); return { drift: s.x - (160 + dx), drop: s.y - (140 + dy), t: s.t }; });
    assert.ok(near.drift < 4 && near.drop < 2 && near.t < .2, 'a near shot barely moves: ' + JSON.stringify(near));
    // Shots landing on a standing deer: the body wounds it and it runs; a second hit brings it down; a heart shot is clean.
    const hits = await p.evaluate(() => {
      hunt.shots = []; hunt.an = []; hunt.spawn = 99; hunt.meat = 0; hunt.kills = [];
      const deer = { k: 'deer', z: 0, sc: 1, d: 1, x: 100, y: 120, dead: false, ph: 0, graze: 99, walk: 99, flee: false, wounded: false };
      const buck = { k: 'deer', z: 0, sc: 1, d: 1, x: 200, y: 120, dead: false, ph: 0, graze: 99, walk: 99, flee: false, wounded: false };
      const rabbit = { k: 'rabbit', z: 0, sc: 1, d: -1, x: 60, y: 130, dead: false, ph: 0, graze: 99, walk: 99, flee: false, wounded: false };
      hunt.an.push(deer, buck, rabbit);
      const out = [];
      const b = huntBoxes(deer).body; landShot({ x: b[0] + 2, y: b[1] + b[3] / 2 }); out.push([deer.wounded, deer.flee, deer.dead, hunt.msg]);
      landShot({ x: b[0] + 2, y: b[1] + b[3] / 2 }); out.push([deer.dead, hunt.meat, hunt.msg]);
      const h = huntBoxes(buck).heart; landShot({ x: h[0] + h[2] / 2, y: h[1] + h[3] / 2 }); out.push([buck.dead, hunt.meat, hunt.msg]);
      landShot({ x: 20, y: 70 }); out.push([rabbit.flee, hunt.msg.startsWith('Missed'), hunt.puffs.length]);
      return out;
    });
    assert.deepEqual(hits[0].slice(0, 3), [true, true, false]); assert.match(hits[0][3], /wounded and running/);
    assert.deepEqual(hits[1].slice(0, 2), [true, 60]); assert.match(hits[1][2], /^Got it!/);
    assert.deepEqual(hits[2].slice(0, 2), [true, 120]); assert.match(hits[2][2], /^Heart shot!/);
    assert.deepEqual(hits[3], [true, true, 1], 'a miss scares the rabbit and kicks up dust');
    await p.waitForTimeout(400);
    if (process.env.SHOTS) await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'hunt.png') });
    // Stopping brings back what she can carry, and says what got away.
    await p.evaluate(() => { hunt.lost = 1; });
    await press('hs');
    assert.match(await panel(), /You brought down a deer, a deer: 120 lbs of meat, but you could only carry 100 lbs back to the wagon\./);
    for (let i = 0; i < 10 && await p.$('#panel #ok'); i++) { const t = await panel(); if (/A wounded animal got away/.test(t)) break; await press('ok'); }
    assert.match(await panel(), /A wounded animal got away\./);
    for (let i = 0; i < 10 && await p.$('#panel #ok'); i++) await press('ok');
    await p.waitForSelector('#panel #go');
    assert.equal(await p.evaluate(() => mode + ':' + document.getElementById('scene').style.touchAction), 'menu:');

    // Side trips: offered once from a nearby stop; taking one costs days and shows its own scene.
    const reach = name => p.evaluate(n => { S.li = LM.findIndex(l => l.n === n) - 1; S.miles = LM[S.li + 1].m; arrive(); }, name);
    const sights = [['Beaver', 'bryce', /^Bryce Canyon\? A shepherd in Beaver says .* about 4 days\./, /hoodoos/],
      ['Fillmore', 'swell', /^San Rafael Swell\? A trapper in Fillmore .* about 6 days\./, /painted figures on the walls/],
      ['St. George', 'hole', /^Hole in the Rock\? A cattleman in St\. George .* about 8 days/, /In the winter of 1879, about 250 Mormon pioneers did exactly that/]];
    for (const [stop, key, ask, story] of sights) {
      await reach(stop);
      await press('ok');
      assert.match(await panel(), ask);
      const before = await p.evaluate(() => S.t);
      await press('see');
      let seen = '';
      for (let i = 0; i < 60 && await p.$('#panel #ok'); i++) {
        seen += ' ' + await panel();
        if (i === 1 && process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, 'sight-' + key + '.png') });
        await press('ok');
      }
      assert.match(seen, story);
      if (key === 'bryce') assert.equal(await p.evaluate(() => PIC['Bryce Canyon'].naturalWidth), 160, 'Bryce has the family\'s photo');
      if (key === 'hole') { assert.equal(await p.evaluate(() => PIC['Hole in the Rock'].naturalWidth), 160); assert.match(seen, /Lake Powell/); }
      if (key === 'swell') { assert.equal(await p.evaluate(() => PIC['San Rafael Swell'].naturalWidth), 160); assert.match(seen, /a valley full of stone goblins/); }
      assert.ok(await p.evaluate(b => S.t - b >= 3 * 864e5, before), 'the detour takes days');
      await p.waitForSelector('#panel #go');
      await reach(stop);
      await press('ok');
      assert.ok(await p.$('#panel #go'), 'each side trip is offered only once');
    }
    // A river crossing with a photo shows it while you decide, and goes back to the trail once across.
    await reach('San Joaquin River crossing');
    assert.match(await panel(), /^San Joaquin River crossing The river is \d+ feet across/);
    assert.equal(await p.evaluate(() => mode + ':' + S.photoNow), 'photo:San Joaquin River crossing');
    await p.waitForTimeout(300);
    if (process.env.SHOTS) await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'photo-river.png') });
    await p.evaluate(() => { S.cash = 100; });
    await press('ferry');
    for (let i = 0; i < 30 && await p.$('#panel #ok'); i++) await press('ok');
    await p.waitForSelector('#panel #go');
    assert.equal(await p.evaluate(() => mode + ':' + S.photoNow), 'menu:null');

    // Every photo in the game loads, at the size the scene expects.
    assert.deepEqual(await p.evaluate(() => Object.keys(PHOTO).filter(n => !(PIC[n].complete && PIC[n].naturalWidth === 160 && PIC[n].naturalHeight === 75))), []);
    // A town with a store shows its photo on arrival too.
    await reach('Fort Tejon');
    assert.match(await panel(), /^You have arrived at Fort Tejon\./);
    assert.equal(await p.evaluate(() => mode + ':' + S.photoNow), 'photo:Fort Tejon');
    await press('ok');
    await p.waitForSelector('#panel #buy');

    // The route through Beaver: the river, the town, then the Mineral Mountains (with the family's photo).
    assert.deepEqual(await p.evaluate(() => LM.slice(8, 13).map(l => l.n + ' ' + l.m)), ['Zion Canyon 925', 'Beaver River crossing 1030', 'Beaver 1040', 'Mineral Mountains 1075', 'Sevier River crossing 1130']);
    assert.equal(await p.evaluate(() => LM.some(l => /Cedar/.test(l.n))), false);
    await reach('Mineral Mountains');
    assert.match(await panel(), /^You have reached Mineral Mountains\. Pale granite domes/);
    assert.equal(await p.evaluate(() => mode + ':' + S.photoNow), 'photo:Mineral Mountains');
    await p.waitForTimeout(300);
    if (process.env.SHOTS) await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'photo-mineral.png') });
    await press('ok');
    await p.waitForSelector('#panel #go');

    // The family's own photo of Zion Canyon, pixelated, shows on arrival.
    await reach('Zion Canyon');
    assert.match(await panel(), /^You have reached Zion Canyon\./);
    await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => mode + ':' + S.photoNow), 'photo:Zion Canyon');
    const px = await p.evaluate(() => Array.from(document.getElementById('scene').getContext('2d').getImageData(20, 140, 1, 1).data));
    assert.ok(px[0] > 90 && px[0] > px[2] * 1.5, 'red rock at the bottom of the photo, not the drawn scenery: ' + px);
    if (process.env.SHOTS) await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'photo-zion.png') });
    await press('ok');
    await p.waitForSelector('#panel #go');
    assert.equal(await p.evaluate(() => mode), 'menu');
    await reach('Provo and Utah Lake');
    await press('ok');
    assert.ok(await p.$('#panel #go'), 'stops without a side trip go straight back to the trail');

    // The finish: the whole party makes it, 3 stars, on the scoreboard records and in the hall of fame.
    await p.evaluate(() => { finish(); });
    assert.match(await panel(), /^Congratulations! You made it to Millcreek .* Haddam, Katrina, Mabel, Twig, Gigi made it to the Salt Lake Valley\. .* Side trips seen: 3 \+300 Party and supplies and sights \d+ .* Final score \d+/);
    // The ending shows the Salt Lake Valley: green fields at the bottom of the scene, not the trail's road.
    await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => mode), 'end');
    const field = await p.evaluate(() => Array.from(document.getElementById('scene').getContext('2d').getImageData(300, 146, 1, 1).data));
    assert.ok(field[1] > field[0] && field[1] > field[2], 'a green valley floor: ' + field);
    if (process.env.SHOTS) await p.locator('#scene').screenshot({ path: path.join(process.env.SHOTS, 'valley.png') });
    const saved = await p.evaluate(() => { const a = window.BookDudeArcade.open('millcreek-trail'); return [a.get('records'), a.get('hof')]; });
    assert.equal(saved[0].Haddam.trip.stars, 3, 'on a device not signed in, the wagon leader is the player');
    assert.ok(saved[0].Haddam.trip.score > 0);
    assert.equal(saved[1][0].n, 'Haddam');
    if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, 'trail-finish.png') });
    await Promise.all([p.waitForNavigation(), p.click('a.home')]);
    await p.waitForSelector('.game-card');
    assert.match(await p.$$eval('.game-card', els => els[1].textContent.replace(/\s+/g, ' ')), /3 stars of 3/);

    // Offline: the game opens with no internet.
    await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1500);
    await ctx.setOffline(true);
    await p.goto(BASE + 'games/millcreek-trail/');
    await p.waitForSelector('#panel #go');
    assert.equal(await p.evaluate(() => document.fonts.ready.then(() => document.fonts.check('22px VT323'))), true);

    assert.deepStrictEqual(outside, [], 'nothing is loaded from another site');
    assert.deepStrictEqual(errors, []);
    console.log('The Millcreek Trail is on the Games tab: it plays, saves the trip, scores the finish for the family scoreboard, and works offline, loading nothing from anywhere else.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' '), (e.stack.match(/millcreek-trail.cjs:\d+/) || [''])[0]); process.exit(1); });
