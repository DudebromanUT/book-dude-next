/* The screen-time clock's texts (scripts/school-email/Timer.gs, with Code.gs), with Google and Twilio played by
 * stand-ins: the right texts to the right phones, the time's-up alarm set and cleared, and nothing without setup. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const DIR = path.join(__dirname, '..', 'scripts', 'school-email');
const CODE = fs.readFileSync(path.join(DIR, 'Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(DIR, 'Timer.gs'), 'utf8');
const TWILIO = { TWILIO_SID: 'AC123', TWILIO_TOKEN: 'tok', TWILIO_FROM: '(888) 555-1234', TEXT_TO: '801-555-1234, +1 801 555 5678, 801.555.1234' };

const first = body => body.split('\n')[0];
const link = body => body.split('\n')[1].replace(/^Fig-o-Clock: /, '');

function load(props = {}, status = 201) {
  const store = Object.assign({ key: 'k123' }, props);
  const sent = { texts: [], triggers: [], deleted: 0, log: [] };
  const triggers = [];
  const builder = handler => { const b = { at: d => { b.when = d; return b; }, timeBased: () => b, create: () => { const tr = { handler, when: b.when, getHandlerFunction: () => handler }; triggers.push(tr); sent.triggers.push(tr); return tr; } }; return b; };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: n => (Object.prototype.hasOwnProperty.call(store, n) ? store[n] : null),
      setProperty: (n, v) => { store[n] = String(v); },
      deleteProperty: n => { delete store[n]; },
      getProperties: () => Object.assign({}, store)
    }) },
    UrlFetchApp: { fetch: (url, opts) => {
      sent.texts.push({ url, to: opts.payload.To, from: opts.payload.From, body: opts.payload.Body, auth: opts.headers.Authorization });
      return { getResponseCode: () => status, getContentText: () => '{}' };
    } },
    Utilities: { formatDate: d => d.toISOString().slice(0, 10), getUuid: () => '0123abcd-4567-89ef-0123-456789abcdef', base64Encode: s => Buffer.from(s).toString('base64') },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ContentService: { createTextOutput: s => ({ text: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: tr => { triggers.splice(triggers.indexOf(tr), 1); sent.deleted++; }, newTrigger: h => builder(h), getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/AKfyTESTID123/exec' }) },
    Logger: { log: s => sent.log.push(String(s)) },
    Date, JSON, Math, Number, String, Object, Array, isFinite, encodeURIComponent
  };
  vm.runInNewContext(CODE, ctx);
  const post = (body, key = 'k123') => JSON.parse(ctx.doPost({ parameter: { key }, postData: { contents: JSON.stringify(body) } }).text);
  const get = params => JSON.parse(ctx.doGet({ parameter: params }).text);
  return { ctx, store, sent, triggers, post, get };
}

test('without Twilio set up, the clock is told nothing is texted, and nothing is', () => {
  const s = load();
  assert.deepEqual(s.post({ action: 'timer', event: 'start', minutes: 30, ends: Date.now() + 30 * 60000, endsText: '4:35 PM' }), { ok: true, off: true });
  assert.equal(s.sent.texts.length, 0);
  assert.equal(s.triggers.length, 0);
});

test('the wrong key texts nobody', () => {
  const s = load(TWILIO);
  assert.deepEqual(s.post({ action: 'timer', event: 'start', minutes: 30 }, 'nope'), { error: 'That link is not right.' });
  assert.equal(s.sent.texts.length, 0);
});

test('start, add, pause, resume and stop: a text to each phone, and one alarm for the end while it runs', () => {
  const s = load(TWILIO);
  const ends = Date.now() + 30 * 60000;
  assert.deepEqual(s.post({ action: 'timer', event: 'start', id: 'abcd1234', name: 'Maddy', minutes: 30, left: 30, ends, endsText: '4:35 PM', bank: 45, page: 'https://dudebromanut.github.io/book-dude-next/timer/' }), { ok: true, texted: 2 });
  assert.deepEqual(s.sent.texts.map(t => t.to), ['+18015551234', '+18015555678'], 'each phone once, written the way Twilio wants');
  assert.equal(s.sent.texts[0].from, '+18885551234');
  assert.equal(s.sent.texts[0].url, 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
  assert.equal(s.sent.texts[0].auth, 'Basic ' + Buffer.from('AC123:tok').toString('base64'));
  assert.equal(first(s.sent.texts[0].body), 'Book Dude: Maddy\'s screen time started: 30 min, ends 4:35 PM. Bank: 45 min.');
  assert.equal(link(s.sent.texts[0].body), 'https://dudebromanut.github.io/book-dude-next/timer/#s=r&m=30&e=' + Math.round(ends / 1000) + '&b=45&t=0123abcd456789ef&u=AKfyTESTID123');
  assert.equal(s.triggers.length, 1);
  assert.equal(s.triggers[0].handler, 'timerUp');
  assert.equal(s.triggers[0].when.getTime(), ends);

  s.post({ action: 'timer', event: 'add', id: 'abcd1234', name: 'Maddy', minutes: 45, added: 15, left: 40, ends: ends + 15 * 60000, endsText: '4:50 PM' });
  assert.equal(first(s.sent.texts[2].body), 'Book Dude: 15 min added to Maddy\'s screen time. 40 min left, ends 4:50 PM.');
  assert.equal(s.triggers.length, 1, 'the old alarm is replaced, not added to');
  assert.equal(s.triggers[0].when.getTime(), ends + 15 * 60000);

  s.post({ action: 'timer', event: 'pause', id: 'abcd1234', name: 'Maddy', minutes: 45, left: 23, leftMs: 23 * 60000, bank: 30 });
  assert.deepEqual(s.get({ clock: '0123abcd456789ef' }), { id: 'abcd1234', state: 'paused', minutes: 45, ends: 0, left: 23 * 60000, bank: 30 }, 'the Fig-o-Clock sees the pause');
  assert.match(link(s.sent.texts[4].body), /#s=p&m=45&l=1380&b=30&t=/);
  assert.equal(first(s.sent.texts[4].body), 'Book Dude: Maddy\'s screen time is paused with 23 min left. Bank: 30 min.');
  assert.equal(s.triggers.length, 0, 'no alarm while paused');

  s.post({ action: 'timer', event: 'resume', id: 'abcd1234', name: 'Maddy', minutes: 45, left: 23, ends: Date.now() + 23 * 60000, endsText: '5:10 PM' });
  assert.equal(first(s.sent.texts[6].body), 'Book Dude: Maddy\'s screen time is back on: 23 min left, ends 5:10 PM.');
  assert.equal(s.triggers.length, 1);

  s.post({ action: 'timer', event: 'stop', id: 'abcd1234', name: 'Maddy', minutes: 45, back: 12 });
  assert.equal(first(s.sent.texts[8].body), 'Book Dude: Maddy\'s screen time was stopped early. 12 min went back to her bank.');
  assert.equal(s.triggers.length, 0);
  assert.equal(s.store.TIMER_UP, undefined);
});

test('time\'s up: the alarm texts every phone once, and an early wake-up waits for the real end', () => {
  const s = load(TWILIO);
  const ends = Date.now() + 10 * 60000;
  s.post({ action: 'timer', event: 'start', id: 'abcd1234', name: 'Maddy', minutes: 10, left: 10, ends, endsText: '4:35 PM', bank: 20 });
  s.sent.texts.length = 0;
  s.ctx.timerUp();   // too early
  assert.equal(s.sent.texts.length, 0);
  assert.equal(s.triggers.length, 1, 'set again for the real end');
  s.store.TIMER_UP = JSON.stringify(Object.assign(JSON.parse(s.store.TIMER_UP), { ends: Date.now() - 1000 }));
  s.ctx.timerUp();
  assert.deepEqual(s.sent.texts.map(t => first(t.body)), Array(2).fill('Book Dude: Maddy\'s screen time is up (4:35 PM). Time to hand over the remote. Bank: 20 min.'));
  assert.match(link(s.sent.texts[0].body), /#s=r&m=10&e=\d+&b=20&t=0123abcd456789ef&u=AKfyTESTID123$/);
  assert.equal(s.triggers.length, 0);
  s.ctx.timerUp();
  assert.equal(s.sent.texts.length, 2, 'only once');
});

test('odd input is cleaned up, Twilio refusing is reported, and the test text works', () => {
  const s = load(TWILIO, 400);
  assert.deepEqual(s.post({ action: 'timer', event: 'explode' }), { error: 'bad' });
  const r = s.post({ action: 'timer', event: 'start', name: '<b>Maddy</b>', minutes: 'lots', endsText: '=HACK()' });
  assert.deepEqual(r, { error: 'text' });
  assert.equal(first(s.sent.texts[0].body), 'Book Dude: bMaddyb\'s screen time started: 0 min.');
  assert.match(s.sent.log.join('\n'), /Twilio did not send to \+1801555\*\*\*\*: 400/);
  const ok = load(TWILIO);
  ok.ctx.timerTextTest();
  assert.equal(ok.sent.texts.length, 2);
  assert.match(ok.sent.log.join('\n'), /2 of 2 test texts went out/);
});

test('the Fig-o-Clock link: a view-only code shows the clock and nothing else', () => {
  const s = load(TWILIO);
  assert.deepEqual(s.get({ clock: 'whatever' }), { error: 'bad' }, 'no code made yet, nothing to see');
  s.post({ action: 'timer', event: 'start', id: 'abcd1234', name: 'Maddy', minutes: 30, left: 30, ends: 1999999999000, endsText: '4:35 PM', bank: 45, page: 'javascript:alert(1)' });
  assert.match(link(s.sent.texts[0].body), /^https:\/\/dudebromanut\.github\.io\/book-dude-next\/timer\/#/, 'only a plain https page');
  assert.deepEqual(s.get({ clock: 'nope' }), { error: 'bad' });
  assert.deepEqual(s.get({ clock: '0123abcd456789ef' }), { id: 'abcd1234', state: 'running', minutes: 30, ends: 1999999999000, left: 0, bank: 45 });
  assert.deepEqual(s.get({ key: 'nope' }), { error: 'That link is not right.' }, 'the school link still needs its key');
  assert.equal(s.store.TIMER_VIEW, '0123abcd456789ef');
});
