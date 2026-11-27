/* The screen-time clock's alerts (scripts/school-email/Timer.gs, with Code.gs), with Google and ntfy played by
 * stand-ins: the right alerts to the family's topic, a tap that opens the Fig-o-Clock, the time's-up alarm set and
 * cleared, and the view-only clock the Fig-o-Clock page reads. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const DIR = path.join(__dirname, '..', 'scripts', 'school-email');
const CODE = fs.readFileSync(path.join(DIR, 'Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(DIR, 'Timer.gs'), 'utf8');
const TOPIC = 'bookdude-0123abcd456789ef0123', KID = 'bookdude-kid-0123abcd456789ef0123';
const VIEW = '0123abcd456789ef';
const FIG = 'https://dudebromanut.github.io/book-dude-next/timer/';

function load(props = {}, status = 200) {
  const store = Object.assign({ key: 'k123' }, props);
  const sent = { alerts: [], log: [] };
  const triggers = [];
  const builder = handler => { const b = { at: d => { b.when = d; return b; }, timeBased: () => b, create: () => { const tr = { handler, when: b.when, getHandlerFunction: () => handler }; triggers.push(tr); return tr; } }; return b; };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: n => (Object.prototype.hasOwnProperty.call(store, n) ? store[n] : null),
      setProperty: (n, v) => { store[n] = String(v); },
      deleteProperty: n => { delete store[n]; },
      getProperties: () => Object.assign({}, store)
    }) },
    UrlFetchApp: { fetch: (url, opts) => {
      sent.alerts.push(Object.assign({ url, auth: (opts.headers || {}).Authorization }, JSON.parse(opts.payload)));
      return { getResponseCode: () => status, getContentText: () => '{"error":"nope"}' };
    } },
    Utilities: { formatDate: d => d.toISOString().slice(0, 10), getUuid: () => '0123abcd-4567-89ef-0123-456789abcdef' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ContentService: { createTextOutput: s => ({ text: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: tr => { triggers.splice(triggers.indexOf(tr), 1); }, newTrigger: h => builder(h),
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/AKfyTESTID123/exec' }) },
    Logger: { log: s => sent.log.push(String(s)) },
    Date, JSON, Math: Object.assign(Object.create(Math), { random: () => 0 }), Number, String, Object, Array, isFinite, encodeURIComponent
  };
  vm.runInNewContext(CODE, ctx);
  const post = (body, key = 'k123') => JSON.parse(ctx.doPost({ parameter: { key }, postData: { contents: JSON.stringify(body) } }).text);
  const get = params => JSON.parse(ctx.doGet({ parameter: params }).text);
  return { ctx, store, sent, triggers, post, get };
}
const grown = s => s.sent.alerts.filter(a => a.topic === TOPIC);
const kid = s => s.sent.alerts.filter(a => a.topic === KID);
const handlers = s => s.triggers.map(t => t.handler).sort();
const clock = (extra = {}) => Object.assign({ action: 'timer', id: 'abcd1234', name: 'Maddy', page: FIG }, extra);

test('the wrong key sends nothing', () => {
  const s = load();
  assert.deepEqual(s.post(clock({ event: 'start', minutes: 30 }), 'nope'), { error: 'That link is not right.' });
  assert.equal(s.sent.alerts.length, 0);
});

test('start, add, pause, resume and stop: the facts to the grown-ups, Fig to Maddy, with pictures and the alarms', () => {
  const s = load();
  const ends = Date.now() + 30 * 60000;
  assert.deepEqual(s.post(clock({ event: 'start', minutes: 30, left: 30, ends, endsText: '4:35 PM', bank: 45 })), { ok: true, sent: true });
  const [g] = grown(s), [k] = kid(s);
  assert.equal(g.url, 'https://ntfy.sh/');
  assert.deepEqual([s.store.NTFY_TOPIC, s.store.NTFY_KID_TOPIC], [TOPIC, KID], 'two private topics, made once');
  assert.deepEqual([g.title, g.message, g.priority], ['Screen time started', 'Maddy: 30 min, ends 4:35 PM. Bank: 45 min.', 3]);
  assert.deepEqual([k.title, k.message], ['Screen time! Fig is wide awake', 'Meow! You have 30 min. Fig is watching the clock so you don\'t have to. It ends at 4:35 PM. You have 45 min saved in your bank.']);
  assert.equal(g.click, FIG + '#s=r&m=30&e=' + Math.round(ends / 1000) + '&b=45&t=' + VIEW + '&u=AKfyTESTID123', 'a tap opens the Fig-o-Clock');
  assert.equal(k.click, g.click);
  assert.deepEqual(g.actions, [{ action: 'view', label: 'Fig-o-Clock', url: g.click }]);
  assert.deepEqual([g.attach, k.attach, g.filename], [FIG + 'img/fig-awake.png', FIG + 'img/fig-awake.png', 'fig.png'], 'Fig, wide awake');
  assert.deepEqual(handlers(s), ['timerUp', 'timerWarn']);
  assert.equal(s.triggers.find(t => t.handler === 'timerUp').when.getTime(), ends);
  assert.equal(s.triggers.find(t => t.handler === 'timerWarn').when.getTime(), ends - 5 * 60000, 'a heads-up 5 minutes before the end');

  s.post(clock({ event: 'add', minutes: 45, added: 15, left: 40, ends: ends + 15 * 60000, endsText: '4:50 PM', bank: 30 }));
  assert.deepEqual([grown(s)[1].title, grown(s)[1].message], ['More screen time', '15 min added for Maddy. 40 min left, ends 4:50 PM. Bank: 30 min.']);
  assert.match(kid(s)[1].message, /^15 min more! Fig had a snack/);
  assert.deepEqual(handlers(s), ['timerUp', 'timerWarn'], 'the old alarms are replaced, not added to');
  assert.equal(s.triggers.find(t => t.handler === 'timerUp').when.getTime(), ends + 15 * 60000);

  s.post(clock({ event: 'pause', minutes: 45, left: 23, leftMs: 23 * 60000, bank: 30 }));
  assert.deepEqual([grown(s)[2].title, grown(s)[2].message, grown(s)[2].attach], ['Screen time paused', 'Maddy has 23 min left. Bank: 30 min.', FIG + 'img/fig-paused.png']);
  assert.match(kid(s)[2].message, /^Fig is frozen like a statue\. Your 23 min are safe/);
  assert.match(grown(s)[2].click, /#s=p&m=45&l=1380&b=30&t=/);
  assert.deepEqual(s.get({ clock: VIEW }), { id: 'abcd1234', state: 'paused', minutes: 45, ends: 0, left: 23 * 60000, bank: 30 }, 'the Fig-o-Clock sees the pause');
  assert.deepEqual(handlers(s), [], 'no alarms while paused');

  s.post(clock({ event: 'resume', minutes: 45, left: 3, ends: Date.now() + 3 * 60000, endsText: '5:10 PM', bank: 30 }));
  assert.deepEqual([grown(s)[3].title, grown(s)[3].message], ['Screen time is back on', 'Maddy: 3 min left, ends 5:10 PM. Bank: 30 min.']);
  assert.deepEqual(handlers(s), ['timerUp'], 'less than 5 minutes left: no heads-up, just time\'s up');

  s.post(clock({ event: 'stop', minutes: 45, back: 2, bank: 32 }));
  assert.deepEqual([grown(s)[4].title, grown(s)[4].message, grown(s)[4].attach], ['Screen time stopped early', 'Maddy\'s clock was stopped. 2 min went back to her bank. Bank: 32 min.', FIG + 'img/fig-asleep.png']);
  assert.deepEqual([kid(s)[4].title, kid(s)[4].message], ['Screen time stopped', 'A grown-up stopped the clock. Fig went back to sleep. You have 32 min saved in your bank.']);
  assert.deepEqual(handlers(s), []);
  assert.equal(s.store.TIMER_UP, undefined);
});

test('the 5-minute heads-up and time\'s up: each once, to both, and an early wake-up waits for the real time', () => {
  const s = load();
  const ends = Date.now() + 10 * 60000;
  s.post(clock({ event: 'start', minutes: 10, left: 10, ends, endsText: '4:35 PM', bank: 20 }));
  s.sent.alerts.length = 0;
  s.ctx.timerWarn();   // too early
  assert.equal(s.sent.alerts.length, 0);
  assert.deepEqual(handlers(s), ['timerUp', 'timerWarn'], 'the heads-up is set again for the real time');
  s.store.TIMER_UP = JSON.stringify(Object.assign(JSON.parse(s.store.TIMER_UP), { warnAt: Date.now() - 1000 }));
  s.ctx.timerWarn();
  assert.deepEqual([grown(s)[0].title, grown(s)[0].message, grown(s)[0].priority, grown(s)[0].attach], ['5 minutes left', 'Maddy\'s screen time ends at 4:35 PM. Bank: 20 min.', 4, FIG + 'img/fig-yawn.png']);
  assert.deepEqual([kid(s)[0].title, kid(s)[0].message], ['5 minutes left', 'Fig is yawning. Finish your level or your episode.']);
  assert.deepEqual(handlers(s), ['timerUp']);

  s.ctx.timerUp();   // too early
  assert.equal(s.sent.alerts.length, 2);
  assert.deepEqual(handlers(s), ['timerUp'], 'set again for the real end');
  s.store.TIMER_UP = JSON.stringify(Object.assign(JSON.parse(s.store.TIMER_UP), { ends: Date.now() - 1000 }));
  s.ctx.timerUp();
  const g = grown(s)[1], k = kid(s)[1];
  assert.deepEqual([g.title, g.message, g.priority, g.attach], ['Screen time is up!', 'Maddy\'s screen time is over (4:35 PM). Time to hand over the remote. Bank: 20 min.', 5, FIG + 'img/fig-asleep.png']);
  assert.deepEqual([k.title, k.priority], ['Time\'s up!', 5]);
  assert.match(g.click, /#s=r&m=10&e=\d+&b=20&t=0123abcd456789ef&u=AKfyTESTID123$/);
  assert.deepEqual(handlers(s), []);
  s.ctx.timerUp();
  assert.equal(s.sent.alerts.length, 4, 'only once');
});

test('Maddy\'s lines change from one alert to the next', () => {
  const s = load();
  let n = 0;
  s.ctx.Math.random = () => [0, .5, .9][n++ % 3];
  for (let i = 0; i < 3; i++) s.post(clock({ event: 'start', minutes: 30, left: 30, ends: Date.now() + 30 * 60000, endsText: '4:35 PM', bank: 45 }));
  assert.deepEqual(kid(s).map(a => a.title), ['Screen time! Fig is wide awake', 'Fig says: go!', 'Screen time is on']);
  assert.deepEqual(new Set(grown(s).map(a => a.title)).size, 1, 'the grown-ups get the same plain facts');
});

test('odd input is cleaned up, ntfy refusing is reported, and setup prints the topic', () => {
  const s = load({}, 500);
  assert.deepEqual(s.post({ action: 'timer', event: 'explode' }), { error: 'bad' });
  assert.deepEqual(s.post({ action: 'timer', event: 'start', name: '<b>Maddy</b>', minutes: 'lots', endsText: '=HACK()', page: 'javascript:alert(1)' }), { error: 'alert' });
  assert.equal(grown(s)[0].message, 'bMaddyb: 0 min.');
  assert.ok(s.sent.alerts[0].click.startsWith(FIG + '#'), 'only a plain https page');
  assert.match(s.sent.log.join('\n'), /ntfy did not take the alert: 500/);
  const ok = load({ NTFY_SERVER: 'https://ntfy.example.org/' });
  ok.ctx.timerSetup();
  assert.equal(ok.sent.alerts[0].url, 'https://ntfy.example.org/', 'your own server, if you have one');
  assert.deepEqual(ok.sent.alerts.map(a => [a.topic, a.title]), [[TOPIC, 'Book Dude alerts are on'], [KID, 'Hi from Fig!']]);
  assert.match(ok.sent.log.join('\n'), new RegExp('Test alerts went to both topics\\..*Grown-ups \\(your phones\\): +' + TOPIC + '.*Maddy \\(her iPad\\): +' + KID, 's'));
});

test('the Fig-o-Clock link: a view-only code shows the clock and nothing else', () => {
  const s = load();
  assert.deepEqual(s.get({ clock: 'whatever' }), { error: 'bad' }, 'no code made yet, nothing to see');
  s.post(clock({ event: 'start', minutes: 30, left: 30, ends: 1999999999000, endsText: '4:35 PM', bank: 45 }));
  assert.deepEqual(s.get({ clock: 'nope' }), { error: 'bad' });
  assert.deepEqual(s.get({ clock: VIEW }), { id: 'abcd1234', state: 'running', minutes: 30, ends: 1999999999000, left: 0, bank: 45 });
  assert.deepEqual(s.get({ key: 'nope' }), { error: 'That link is not right.' }, 'the school link still needs its key');
});

test('a free ntfy.sh account\'s token is sent along, and a 429 without one says what to do', () => {
  const s = load({}, 429);
  s.ctx.timerSetup();
  assert.equal(s.sent.alerts[0].auth, undefined);
  assert.match(s.sent.log.join('\n'), /shared allowance for Google scripts running out\. Add NTFY_TOKEN/);
  const t = load({ NTFY_TOKEN: 'tk_abc123' });
  t.post(clock({ event: 'start', minutes: 30, left: 30, ends: Date.now() + 30 * 60000, endsText: '4:35 PM', bank: 45 }));
  assert.deepEqual(t.sent.alerts.map(a => a.auth), ['Bearer tk_abc123', 'Bearer tk_abc123']);
  const bad = load({ NTFY_TOKEN: 'tk_wrong' }, 401);
  bad.ctx.timerSetup();
  assert.match(bad.sent.log.join('\n'), /did not accept NTFY_TOKEN/);
});
