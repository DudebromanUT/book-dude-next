/* The screen-time clock's alerts (scripts/school-email/Timer.gs, with Code.gs), with Google and ntfy played by
 * stand-ins: the right alerts to the family's topic, a tap that opens the Fig-o-Clock, the time's-up alarm set and
 * cleared, and the view-only clock the Fig-o-Clock page reads. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const DIR = path.join(__dirname, '..', 'scripts', 'school-email');
const CODE = fs.readFileSync(path.join(DIR, 'Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(DIR, 'Timer.gs'), 'utf8');
const TOPIC = 'bookdude-0123abcd456789ef0123';
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
      sent.alerts.push(Object.assign({ url }, JSON.parse(opts.payload)));
      return { getResponseCode: () => status, getContentText: () => '{"error":"nope"}' };
    } },
    Utilities: { formatDate: d => d.toISOString().slice(0, 10), getUuid: () => '0123abcd-4567-89ef-0123-456789abcdef' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ContentService: { createTextOutput: s => ({ text: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: tr => { triggers.splice(triggers.indexOf(tr), 1); }, newTrigger: h => builder(h),
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/AKfyTESTID123/exec' }) },
    Logger: { log: s => sent.log.push(String(s)) },
    Date, JSON, Math, Number, String, Object, Array, isFinite, encodeURIComponent
  };
  vm.runInNewContext(CODE, ctx);
  const post = (body, key = 'k123') => JSON.parse(ctx.doPost({ parameter: { key }, postData: { contents: JSON.stringify(body) } }).text);
  const get = params => JSON.parse(ctx.doGet({ parameter: params }).text);
  return { ctx, store, sent, triggers, post, get };
}
const clock = (extra = {}) => Object.assign({ action: 'timer', id: 'abcd1234', name: 'Maddy', page: FIG }, extra);

test('the wrong key sends nothing', () => {
  const s = load();
  assert.deepEqual(s.post(clock({ event: 'start', minutes: 30 }), 'nope'), { error: 'That link is not right.' });
  assert.equal(s.sent.alerts.length, 0);
});

test('start, add, pause, resume and stop: an alert to the family topic each time, and one alarm for the end while it runs', () => {
  const s = load();
  const ends = Date.now() + 30 * 60000;
  assert.deepEqual(s.post(clock({ event: 'start', minutes: 30, left: 30, ends, endsText: '4:35 PM', bank: 45 })), { ok: true, sent: true });
  const a = s.sent.alerts[0];
  assert.equal(a.url, 'https://ntfy.sh/');
  assert.equal(a.topic, TOPIC, 'a private topic, made once');
  assert.equal(s.store.NTFY_TOPIC, TOPIC);
  assert.deepEqual([a.title, a.message, a.priority], ['Screen time started', 'Maddy: 30 min, ends 4:35 PM. Bank: 45 min.', 3]);
  assert.equal(a.click, FIG + '#s=r&m=30&e=' + Math.round(ends / 1000) + '&b=45&t=' + VIEW + '&u=AKfyTESTID123', 'a tap opens the Fig-o-Clock');
  assert.deepEqual(a.actions, [{ action: 'view', label: 'Fig-o-Clock', url: a.click }]);
  assert.equal(s.triggers.length, 1);
  assert.equal(s.triggers[0].handler, 'timerUp');
  assert.equal(s.triggers[0].when.getTime(), ends);

  s.post(clock({ event: 'add', minutes: 45, added: 15, left: 40, ends: ends + 15 * 60000, endsText: '4:50 PM', bank: 30 }));
  assert.deepEqual([s.sent.alerts[1].title, s.sent.alerts[1].message], ['More screen time', '15 min added for Maddy. 40 min left, ends 4:50 PM. Bank: 30 min.']);
  assert.equal(s.triggers.length, 1, 'the old alarm is replaced, not added to');
  assert.equal(s.triggers[0].when.getTime(), ends + 15 * 60000);

  s.post(clock({ event: 'pause', minutes: 45, left: 23, leftMs: 23 * 60000, bank: 30 }));
  assert.deepEqual([s.sent.alerts[2].title, s.sent.alerts[2].message], ['Screen time paused', 'Maddy has 23 min left. Bank: 30 min.']);
  assert.match(s.sent.alerts[2].click, /#s=p&m=45&l=1380&b=30&t=/);
  assert.deepEqual(s.get({ clock: VIEW }), { id: 'abcd1234', state: 'paused', minutes: 45, ends: 0, left: 23 * 60000, bank: 30 }, 'the Fig-o-Clock sees the pause');
  assert.equal(s.triggers.length, 0, 'no alarm while paused');

  s.post(clock({ event: 'resume', minutes: 45, left: 23, ends: Date.now() + 23 * 60000, endsText: '5:10 PM', bank: 30 }));
  assert.deepEqual([s.sent.alerts[3].title, s.sent.alerts[3].message], ['Screen time is back on', 'Maddy: 23 min left, ends 5:10 PM. Bank: 30 min.']);
  assert.equal(s.triggers.length, 1);

  s.post(clock({ event: 'stop', minutes: 45, back: 12, bank: 42 }));
  assert.deepEqual([s.sent.alerts[4].title, s.sent.alerts[4].message], ['Screen time stopped early', 'Maddy\'s clock was stopped. 12 min went back to her bank. Bank: 42 min.']);
  assert.equal(s.triggers.length, 0);
  assert.equal(s.store.TIMER_UP, undefined);
});

test('time\'s up: an urgent alert once, and an early wake-up waits for the real end', () => {
  const s = load();
  const ends = Date.now() + 10 * 60000;
  s.post(clock({ event: 'start', minutes: 10, left: 10, ends, endsText: '4:35 PM', bank: 20 }));
  s.sent.alerts.length = 0;
  s.ctx.timerUp();   // too early
  assert.equal(s.sent.alerts.length, 0);
  assert.equal(s.triggers.length, 1, 'set again for the real end');
  s.store.TIMER_UP = JSON.stringify(Object.assign(JSON.parse(s.store.TIMER_UP), { ends: Date.now() - 1000 }));
  s.ctx.timerUp();
  assert.equal(s.sent.alerts.length, 1);
  const a = s.sent.alerts[0];
  assert.deepEqual([a.title, a.message, a.priority], ['Screen time is up!', 'Maddy\'s screen time is over (4:35 PM). Time to hand over the remote. Bank: 20 min.', 5]);
  assert.match(a.click, /#s=r&m=10&e=\d+&b=20&t=0123abcd456789ef&u=AKfyTESTID123$/);
  assert.equal(s.triggers.length, 0);
  s.ctx.timerUp();
  assert.equal(s.sent.alerts.length, 1, 'only once');
});

test('odd input is cleaned up, ntfy refusing is reported, and setup prints the topic', () => {
  const s = load({}, 500);
  assert.deepEqual(s.post({ action: 'timer', event: 'explode' }), { error: 'bad' });
  assert.deepEqual(s.post({ action: 'timer', event: 'start', name: '<b>Maddy</b>', minutes: 'lots', endsText: '=HACK()', page: 'javascript:alert(1)' }), { error: 'alert' });
  assert.equal(s.sent.alerts[0].message, 'bMaddyb: 0 min.');
  assert.ok(s.sent.alerts[0].click.startsWith(FIG + '#'), 'only a plain https page');
  assert.match(s.sent.log.join('\n'), /ntfy did not take the alert: 500/);
  const ok = load({ NTFY_SERVER: 'https://ntfy.example.org/' });
  ok.ctx.timerSetup();
  assert.equal(ok.sent.alerts[0].url, 'https://ntfy.example.org/', 'your own server, if you have one');
  assert.equal(ok.sent.alerts[0].title, 'Book Dude alerts are on');
  assert.match(ok.sent.log.join('\n'), new RegExp('A test alert went to the topic\\..*tap \\+, type this topic name exactly.*' + TOPIC, 's'));
});

test('the Fig-o-Clock link: a view-only code shows the clock and nothing else', () => {
  const s = load();
  assert.deepEqual(s.get({ clock: 'whatever' }), { error: 'bad' }, 'no code made yet, nothing to see');
  s.post(clock({ event: 'start', minutes: 30, left: 30, ends: 1999999999000, endsText: '4:35 PM', bank: 45 }));
  assert.deepEqual(s.get({ clock: 'nope' }), { error: 'bad' });
  assert.deepEqual(s.get({ clock: VIEW }), { id: 'abcd1234', state: 'running', minutes: 30, ends: 1999999999000, left: 0, bank: 45 });
  assert.deepEqual(s.get({ key: 'nope' }), { error: 'That link is not right.' }, 'the school link still needs its key');
});
