/* Spelling BB: the Games tab opens it, she spells (typing here), words become gems, and gems become
 * points in Book Dude, counted by list (core.js spellPoints) and shown on the Progress tab's Spell-o-Meter and in
 * "Where your points came from". BB's Claude help goes through the school script, played by the test.
 * The clock is fixed at November 26, 2026.
 *
 *   Run:  node tests/browser/spelling-bee.cjs
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
  const ORIGIN = 'http://127.0.0.1:' + server.address().port;
  const BASE = ORIGIN + '/book-dude-next/';
  const LINK = 'https://script.google.com/macros/s/TEST-script/exec?key=abc123';
  const browser = await chromium.launch();
  const errors = [], outside = [], calls = [];
  const SHOTS = process.env.SHOTS;
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    // No device voice in the test: BB's lines are shown without being spoken.
    await ctx.addInitScript(() => { try { Object.defineProperty(window, 'speechSynthesis', { value: undefined }); } catch (e) { /* fine */ } });
    // Book Dude's school script, played by the test.
    await ctx.route('https://script.google.com/**', async route => {
      const req = JSON.parse(route.request().postData() || '{}');
      calls.push(req);
      const result = req.action === 'spell-ask' ? 'Your word is ' + req.arg.word + ', and it is a fun one.' : req.action === 'spell-trick' ? 'Remember: ' + req.arg.word.toUpperCase() + ' has a hidden word.' : true;
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ result }) });
    });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date('2026-11-26T12:00:00-07:00'));
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    p.on('request', r => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith(LINK.split('?')[0]) && !r.url().startsWith('data:')) outside.push(r.url()); });

    await p.goto(BASE);
    await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    // The school link is set (a grown-up pasted it), and she already has 140 of the 150 One Bee words as gems.
    const ONE = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(DOCS, 'games/spelling-bee/words.js'), 'utf8'))(w); return w.SPELL_DATA.one.map(e => e[0].split('|')[0]); })();
    assert.equal(ONE.length, 150);
    await p.evaluate(async ([link, words]) => {
      const st = await import('/book-dude-next/app/state.js');
      await st.saveSetting('schoolLink', link);
      const earned = {}, prog = {};
      words.slice(0, 140).forEach(w => { earned[w] = { lv: 'one', d: '2026-11-20', cb: 0 }; prog[w] = [2, 1, 0]; });
      prog[words[140]] = [0, 0, 1];   // missed once before: its gem will be a comeback
      await st.saveSetting('spelling', window.ReadingCore.spelling({ p: prog, earned, t: 1, set: { answer: 'type' } }));
      await (await import('/book-dude-next/app/games.js')).mirrorSpelling();
    }, [LINK, ONE]);
    const pointsBefore = await p.evaluate(async () => (await import('/book-dude-next/app/money.js')).rewardPoints());
    assert.equal(pointsBefore, 14, '140 One Bee gems are 14 points');

    // The Games tab has the Spelling Bee.
    await p.$eval('.tab[data-tab="games"]', e => e.click());
    await p.waitForSelector('.game-card');
    assert.match(clean(await p.textContent('#main')), /Spelling BB\s*Practice for the school spelling bee with BB, the reading blanket\./);
    await Promise.all([p.waitForNavigation(), p.$$eval('.game-card', els => els.find(e => /Spelling BB/.test(e.textContent)).querySelector('a.btn').click())]);
    await p.waitForSelector('#home:not([hidden]) #levels .lv');
    assert.ok(p.url().endsWith('/book-dude-next/games/spelling-bee/'));
    assert.equal(await p.evaluate(() => document.fonts.ready.then(() => document.fonts.check('600 20px Fredoka'))), true, 'its fonts ship with the app');
    const home = clean(await p.innerText('#home'));
    assert.match(home, /Spelling points so far: 14\. 10 more gems on One Bee for 1 more point\./);
    assert.match(home, /School spelling bee: January 10\. 45 days to go!/);
    assert.match(home, /One Bee\s*140 of 150 gems/);
    assert.equal(await p.getAttribute('#back', 'href'), '../../#games');
    assert.equal(await p.isVisible('#askBJ'), false);

    // A practice round, typing: the ten words without gems come up.
    const round = async (onWord) => {
      await p.click('#mPractice');
      await p.waitForSelector('#play:not([hidden])');
      for (let i = 0; i < 40 && await p.isVisible('#play'); i++) {
        const w = await p.evaluate(() => window.__bee.cur().w);
        if (onWord) await onWord(w, i);
        if (!(await p.isVisible('#nextRow'))) { await p.fill('#ans', w); await p.click('#checkTyped'); }
        await p.waitForSelector('#nextRow:not([hidden])');
        await p.click('#next');
        await p.waitForTimeout(50);
      }
      await p.waitForSelector('#done:not([hidden])');
    };
    let asked = false, missed = '';
    await round(async (w, i) => {
      if (i === 0) {
        // Ask BB: the answer comes through the school script, and never shows the word before she spells it.
        assert.ok(ONE.slice(140).includes(w), 'only words without gems: ' + w);
        await p.click('#askBJ');
        await p.fill('#askIn', 'What does it mean?');
        await p.click('#askGo');
        await p.waitForFunction(() => /BB:/.test(document.getElementById('info').textContent));
        const said = clean(await p.textContent('#info'));
        assert.match(said, /BB: Your word is your word, and it is a fun one\./, 'masked: ' + said);
        asked = true;
        // A miss: BB's memory trick, and the word comes back later in the round.
        missed = w;
        await p.fill('#ans', 'zzz'); await p.click('#checkTyped');
        await p.waitForFunction(() => /BB.s trick:/.test(document.body.textContent), null, { timeout: 5000 });
      }
      if (i === 1) {
        // What BB heard, with one sound-alike letter wrong and marked unsure: BB says which, and a tap fixes it.
        const j = await p.evaluate(word => {
          const toks = [...word.toLowerCase()].map(ch => ({ ch }));
          const k = toks.findIndex(o => window.__bee.alikeOf(o.ch));
          const g = window.__bee.alikeOf(toks[k].ch);
          toks[k] = { ch: g[(g.indexOf(toks[k].ch) - 1 + g.length) % g.length], unsure: true };
          document.getElementById('typeArea').hidden = true; document.getElementById('talkArea').hidden = false;   // as when she talks
          window.__bee.showHeard(toks);
          return k;
        }, w);
        const nth = ['1st', '2nd', '3rd'][j] || (j + 1) + 'th';
        assert.equal(clean(await p.textContent('#bubble')), 'I wasn’t sure about the ' + nth + ' letter. Tap a letter to change it, then tap Check it.');
        if (SHOTS) { await p.$eval('#play .stage', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(SHOTS, 'spell-heard.png') }); }
        await p.click('#tiles .tile.tap[data-i="' + j + '"]');
        assert.equal(clean(await p.textContent('#tiles')).toLowerCase(), w.toLowerCase(), 'one tap put the right letter back');
        await p.click('#checkHeard');
        await p.waitForSelector('#nextRow:not([hidden])');
        // Of the browser's guesses, the one that reads most like spelled letters wins.
        const pick = await p.evaluate(() => window.__bee.bestGuess([{ transcript: 'hello there' }, { transcript: 'B. E. E.' }, { transcript: 'bee' }]));
        assert.equal(pick, 'B. E. E.');
      }
    });
    assert.ok(asked);
    assert.deepEqual(calls.filter(c => c.action !== 'spell-log').map(c => c.action), ['spell-ask', 'spell-trick']);
    assert.equal(calls.find(c => c.action === 'spell-ask').arg.answered, false);
    assert.match(clean(await p.innerText('#done')), /more gems to the next point|spelling point/);
    // A second round: every one becomes a gem, which finishes One Bee.
    await p.click('#home2');
    await round();
    const done = clean(await p.innerText('#done'));
    assert.match(done, /\+6 spelling points! They’re waiting on the Progress tab\./, done);
    const snap = await p.evaluate(() => window.__bee.EARNED());
    assert.equal(Object.keys(snap).length, 150);
    assert.equal(snap[ONE[140]].cb, 1, 'a word she had missed before is a comeback gem');
    assert.equal(snap[missed].cb, 1, 'and so is the one she missed today');
    assert.ok(calls.some(c => c.action === 'spell-log' && Array.isArray(c.arg) && c.arg.length), 'her answers go to the Spelling log');
    if (SHOTS) { await p.click('#home2'); await p.waitForSelector('#home:not([hidden])'); await p.screenshot({ path: path.join(SHOTS, 'spell-home.png') }); }
    else await p.click('#home2');

    // Back in Book Dude: the gems are hers, and the points count.
    await Promise.all([p.waitForNavigation(), p.click('#back')]);
    await p.waitForSelector('.game-card');
    await p.waitForFunction(() => /Spelling BB: /.test(document.getElementById('toast').textContent), null, { timeout: 5000 });
    const after = await p.evaluate(async () => (await import('/book-dude-next/app/money.js')).rewardPoints());
    assert.equal(after, 20, '150 gems (one a comeback) = 15, plus 5 for finishing One Bee');
    const sp = await p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.spelling);
    assert.equal(Object.keys(sp.earned).length, 150);
    await p.$eval('.tab[data-tab="progress"]', e => e.click());
    await p.waitForSelector('#pet-meters .bobby');
    const meter = clean(await p.innerText('#pet-meters .bobby'));
    assert.match(meter, /^BB’s Spell-o-Meter Typo Smoother .* One Bee 150\/150 Two Bee 0\/150 Three Bee 0\/150 20 spelling points 10 more gems on Two Bee for 2 more points\. Finishing it is worth 10 more\. School spelling bee: January 10\. 45 days to go\. Practice with BB$/);
    assert.equal(await p.$$eval('#pet-meters .bobby-art.stomp', e => e.length), 1, 'BB wiggles for new points');
    const ledger = clean(await p.innerText('#ledger'));
    assert.match(ledger, /Spelling Bee 20 points Nov 26, 2026 Finished One Bee \+5 Nov 26, 2026 One Bee gems \+1 Nov 20, 2026 One Bee gems \+14 How your points/);
    assert.match(ledger, /\+ spelling: 20 = 20 points/);
    if (SHOTS) { await p.$eval('#pet-meters .bobby', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(SHOTS, 'spell-meter.png') }); }
    // Looking again: no stomp until there's a new point.
    await p.$eval('.tab[data-tab="explore"]', e => e.click()); await p.$eval('.tab[data-tab="progress"]', e => e.click());
    await p.waitForSelector('#pet-meters .bobby');
    assert.equal(await p.$$eval('#pet-meters .bobby-art.stomp', e => e.length), 0);

    // On an iPad, listening may only start right after a tap. A fake microphone that refuses anything else, like iPadOS:
    // the page never tries on its own, a pause doesn't break it, and it keeps working word after word.
    const ipad = await browser.newContext({ ...devices['iPad (gen 7)'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    await ipad.addInitScript(() => {
      try { Object.defineProperty(window, 'speechSynthesis', { value: undefined }); } catch (e) { /* fine */ }
      window.__srLog = []; window.__gesture = false;
      addEventListener('click', () => { window.__gesture = true; setTimeout(() => { window.__gesture = false; }, 0); }, true);
      window.__srMade = 0; window.__micAsk = 0; window.__micStop = 0;
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => { window.__micAsk++; return { active: true, getTracks: () => [{ stop: () => { window.__micStop++; } }] }; } } });
      window.__srMade = 0;
      class FakeSR {
        constructor() { window.__srMade++; }
        start() {
          if (window.__mute && window.__gesture) { window.__srLog.push('start'); setTimeout(() => { if (this.onstart) this.onstart(); if (this.onaudiostart) this.onaudiostart(); if (this.onsoundstart) this.onsoundstart(); setTimeout(() => this.onend && this.onend(), 60); }, 20); return; }
          if (!window.__gesture) { window.__srLog.push('refused'); setTimeout(() => this.onerror && this.onerror({ error: 'not-allowed' }), 10); return; }
          window.__srLog.push('start');
          this.live = true;
          const say = () => { const r = [{ transcript: window.__say || '' }]; r.isFinal = true; if (this.onresult) this.onresult({ results: [r] }); };
          if (window.__finalOnly) { setTimeout(() => { if (this.onstart) this.onstart(); if (this.onspeechstart) this.onspeechstart(); }, 20); this.flush = say; return; }
          setTimeout(() => { if (this.onstart) this.onstart(); say(); setTimeout(() => this.onend && this.onend(), 30); }, 20);
        }
        stop() { if (this.live && this.flush) { const f = this.flush; this.flush = null; setTimeout(() => { f(); setTimeout(() => this.onend && this.onend(), 20); }, 40); } this.live = false; }
        abort() { this.live = false; }
      }
      window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
    });
    const q = await ipad.newPage();
    q.on('pageerror', e => errors.push(e.message));
    await q.goto(BASE + 'games/spelling-bee/');
    await q.waitForSelector('#home:not([hidden]) #levels .lv');
    await q.click('#answerSeg [data-a="talk"]');
    assert.match(clean(await q.textContent('#micNote')), /^Tap the microphone for each word/);
    await q.click('#mPractice');
    await q.waitForSelector('#play:not([hidden])');
    const letters = w => [...w].map(c => (c === ' ' ? 'space' : c === '-' ? 'hyphen' : c.toUpperCase())).join(' ');
    for (let n = 0; n < 3; n++) {
      await q.waitForFunction(() => /Tap the microphone/.test(document.getElementById('bubble').textContent));
      const w = await q.evaluate(() => window.__bee.cur().w);
      if (n === 0) {
        // She pauses halfway; iOS stops listening. What she said stays, and Keep going (a tap) gets the rest.
        const half = Math.ceil(w.length / 2);
        await q.evaluate(t => { window.__say = t; }, letters(w.slice(0, half)));
        await q.click('#mic');
        await q.waitForSelector('#heardBtns:not([hidden])');
        await q.evaluate(t => { window.__say = t; }, letters(w.slice(half)));
        await q.click('#more');
      } else if (n === 2) {
        // Like iOS at its stingiest: nothing comes through while she spells, everything arrives when it stops.
        await q.evaluate(t => { window.__say = t; window.__finalOnly = true; }, letters(w));
        await q.click('#mic');
        await q.waitForFunction(() => /I can hear you\. Keep spelling!/.test(document.getElementById('bubble').textContent));
        await q.click('#mic');   // she taps the red square when she's done
        await q.evaluate(() => { window.__finalOnly = false; });
      } else {
        await q.evaluate(t => { window.__say = t; }, letters(w));
        await q.click('#mic');
      }
      await q.waitForSelector('#heardBtns:not([hidden])');
      assert.equal(clean(await q.textContent('#tiles')).replace(/\s|–/g, '').toLowerCase(), w.replace(/[\s-]/g, '').toLowerCase());
      await q.click('#checkHeard');
      await q.waitForSelector('#nextRow:not([hidden])');
      assert.match(clean(await q.textContent('#fb')), /^(Correct!|That’s right!|Nailed it!|You got it!|Perfect spelling!)/);
      await q.click('#next');
    }
    // The microphone was opened once for the round, and is still held.
    assert.deepEqual(await q.evaluate(() => [window.__micAsk, window.__micStop]), [1, 0], 'one open microphone for the whole round');
    const log = await q.evaluate(() => window.__srLog);
    assert.ok(log.length >= 4 && log.every(x => x === 'start'), 'every start came from a tap: ' + log);
    assert.equal(await q.isVisible('#mic'), true, 'the microphone is still on after three words');
    // One listener for the whole visit on an iPad.
    assert.equal(await q.evaluate(() => window.__srMade), 1, 'the same listener, word after word');
    // If iOS sends no words, BB says what it did get, and after two quiet tries switches her to the keyboard microphone.
    await q.waitForFunction(() => /Tap the microphone/.test(document.getElementById('bubble').textContent));
    await q.evaluate(() => { window.__mute = true; });
    await q.click('#mic');
    await q.waitForFunction(() => /BB check: hold ✓ mic ✓ sound ✓ voice ✗ words 0/.test(document.getElementById('bubble').textContent));
    await q.click('#mic');
    await q.waitForFunction(() => /This iPad isn’t sending me your letters\. Let’s use the keyboard/.test(document.getElementById('bubble').textContent));
    assert.equal(await q.isVisible('#ans'), true, 'the typing box (with the keyboard microphone) is ready');
    // Dictation types letters as words; they still count as letters.
    assert.equal(await q.evaluate(() => window.__bee.typedLetters('see are you em pee eye el why')), 'crumpily');
    assert.equal(await q.evaluate(() => window.__bee.typedLetters('m i s t')), 'mist');
    assert.equal(await q.evaluate(() => window.__bee.typedLetters('mist')), 'mist');
    await q.evaluate(() => { window.__mute = false; });
    // Leaving the round lets the microphone go.
    await q.click('#quit');
    await q.waitForSelector('#home:not([hidden])');
    assert.equal(await q.evaluate(() => window.__micStop), 1, 'the microphone is let go when the round ends');
    await ipad.close();

    assert.deepStrictEqual(outside, [], 'nothing is loaded from another site');
    assert.deepStrictEqual(errors, []);
    console.log('Spelling BB is on the Games tab: gems turn into points that reach the app, BB’s Claude help goes through the school script with its key, and the Spell-o-Meter counts down to the bee.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 6).join(' '), (e.stack.match(/spelling-bee.cjs:\d+/) || [''])[0]); process.exit(1); });
