/* The family account, end to end, on two pretend devices: a grown-up's phone and a reader's iPad.
 *
 * The app runs in Chromium as usual. Supabase's API is played by this test, but the database behind it is real: a
 * scratch Postgres with supabase/001_foundation.sql installed (and Supabase's own parts from tests/db/supabase-stub.sql),
 * so every sign-up, sign-in and save goes through the same rules as the real project. It checks that a grown-up signs
 * up with an invite code and adds a reader; the reader signs in on her own device and gets her books; changes travel
 * both ways, wait while offline, and the newest wins; a device's own books never mix with a reader's; signing out
 * (here, or everywhere by a grown-up) removes the reader's copy from the device; a backup restored into her account
 * (the move from the old Book Dude) reaches a new device; and another family sees none of it.
 *
 *   Run:  BOOKDUDE_TEST_DB=postgres://postgres:postgres@127.0.0.1:5432/postgres node tests/browser/account.cjs
 *
 * Needs Playwright 1.56.1 and its Chromium, like clickthrough.cjs, and psql. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { chromium, devices } = require('playwright');

const BASE_DB = process.env.BOOKDUDE_TEST_DB;
if (!BASE_DB) { console.log('Skipped: no scratch Postgres (set BOOKDUDE_TEST_DB to run the family account test).'); process.exit(0); }

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const SUPA = require(path.join(ROOT, 'supabase', 'project.json')).url;
const DB = 'bookdude_account_' + process.pid;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

/* ---------- the scratch database ---------- */
const urlFor = db => { const u = new URL(BASE_DB); u.pathname = '/' + db; return u.href; };
function psql(db, args, input) {
  const r = spawnSync('psql', [urlFor(db), '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'].concat(args), { input, encoding: 'utf8', maxBuffer: 64e6 });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const lit = s => "'" + String(s).replace(/'/g, "''") + "'";
function as(who) {
  if (who === 'owner') return '';
  if (who === 'auth') return 'set local role supabase_auth_admin;';
  if (who === 'anon') return 'set local role anon; set local request.jwt.claims = \'{"role":"anon"}\';';
  return 'set local role authenticated; set local request.jwt.claims = ' + lit(JSON.stringify({ sub: who, role: 'authenticated' })) + ';';
}
const run = (who, sql) => psql(DB, ['-f', '-'], 'begin;\n' + as(who) + '\n' + sql + ';\ncommit;');
function owner(expr) { const r = run('owner', 'select to_jsonb((' + expr + '))'); assert.ok(r.ok, r.err); return r.out ? JSON.parse(r.out) : null; }

/* ---------- Supabase's API, played over that database ---------- */
const api = { tokens: new Map(), refreshes: new Map(), calls: [], n: 0 };
function session(user, email, anonymous) {
  const access = 'access-' + (++api.n), refresh = 'refresh-' + api.n;
  api.tokens.set(access, { user, until: Date.now() + 3600e3 });
  api.refreshes.set(refresh, { user, email, anonymous });
  return { access_token: access, refresh_token: refresh, expires_in: 3600, token_type: 'bearer', user: { id: user, email: email || '', is_anonymous: !!anonymous } };
}
const sqlValue = v => (v === null || v === undefined ? 'null' : typeof v === 'boolean' || typeof v === 'number' ? String(v) : typeof v === 'object' ? lit(JSON.stringify(v)) + '::jsonb' : lit(v));
// What PostgREST would answer for a database error.
function refusal(err) {
  const denied = /permission denied|row-level security|Only a|Only an/.test(err);
  return { status: denied ? 403 : 400, json: { code: denied ? '42501' : 'P0001', message: err.split('\n')[0] } };
}
function handle(method, url, headers, body) {
  const u = new URL(url);
  const bearer = (headers.authorization || '').replace(/^Bearer /, '');
  let who = 'anon';
  if (bearer) {
    const t = api.tokens.get(bearer);
    if (!t || t.until < Date.now()) return { status: 401, json: { code: 'PGRST301', message: 'JWT expired' } };
    who = t.user;
  }
  api.calls.push(method + ' ' + u.pathname);
  if (u.pathname === '/auth/v1/signup') {
    if (!body.email) {
      const r = run('auth', 'insert into auth.users (is_anonymous) values (true) returning id');
      return r.ok ? { status: 200, json: session(r.out, '', true) } : { status: 500, json: { msg: r.err } };
    }
    if (owner('select count(*) from auth.users where email = ' + lit(body.email))) return { status: 422, json: { code: 422, error_code: 'user_already_exists', msg: 'User already registered' } };
    const r = run('auth', 'insert into auth.users (email, encrypted_password, raw_user_meta_data) values (' + lit(body.email) + ', ' + lit(body.password) + ', ' + lit(JSON.stringify(body.data || {})) + '::jsonb) returning id');
    return r.ok ? { status: 200, json: session(r.out, body.email, false) } : { status: 500, json: { code: 500, error_code: 'unexpected_failure', msg: 'Database error saving new user' } };
  }
  if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
    const id = owner('select id from auth.users where email = ' + lit(body.email) + ' and encrypted_password = ' + lit(body.password));
    return id ? { status: 200, json: session(id, body.email, false) } : { status: 400, json: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' } };
  }
  if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token') {
    const known = api.refreshes.get(body.refresh_token);
    if (!known || !owner('select count(*) from auth.users where id = ' + lit(known.user))) return { status: 400, json: { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' } };
    api.refreshes.delete(body.refresh_token);
    return { status: 200, json: session(known.user, known.email, known.anonymous) };
  }
  if (u.pathname === '/auth/v1/logout') { api.tokens.delete(bearer); return { status: 204, json: null }; }
  const rpc = /^\/rest\/v1\/rpc\/(\w+)$/.exec(u.pathname);
  if (rpc) {
    const args = Object.keys(body || {}).map(k => k + ' => ' + sqlValue(body[k])).join(', ');
    const r = run(who, 'select to_jsonb(public.' + rpc[1] + '(' + args + '))');
    return r.ok ? { status: 200, json: JSON.parse(r.out) } : (who === 'anon' && /permission denied/.test(r.err) ? { status: 401, json: { code: '42501', message: r.err } } : refusal(r.err));
  }
  if (u.pathname === '/rest/v1/items' && method === 'GET') {
    const eq = (u.searchParams.get('kid_id') || '').replace(/^eq\./, ''), gt = Number((u.searchParams.get('rev') || 'gt.0').replace(/^gt\./, ''));
    const r = run(who, 'select coalesce(jsonb_agg(t), \'[]\'::jsonb) from (select kind, id, data, client_at, deleted, rev from public.items where kid_id = ' + lit(eq) + ' and rev > ' + gt +
      ' order by rev asc limit ' + Number(u.searchParams.get('limit') || 1000) + ') t');
    return r.ok ? { status: 200, json: JSON.parse(r.out) } : refusal(r.err);
  }
  if (u.pathname === '/rest/v1/items' && method === 'POST') {
    const r = run(who, 'insert into public.items (kid_id, kind, id, data, client_at, deleted) select kid_id, kind, id, data, client_at, deleted from jsonb_to_recordset(' + lit(JSON.stringify(body)) +
      '::jsonb) as x(kid_id uuid, kind text, id text, data jsonb, client_at timestamptz, deleted boolean) ' +
      'on conflict (kid_id, kind, id) do update set data = excluded.data, client_at = excluded.client_at, deleted = excluded.deleted');
    return r.ok ? { status: 201, json: null } : refusal(r.err);
  }
  return { status: 404, json: { message: 'not played: ' + method + ' ' + u.pathname } };
}

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/book-dude-next\//, '');
    const file = path.join(DOCS, rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!url.pathname.startsWith('/book-dude-next/') || !file.startsWith(DOCS + path.sep)) { res.writeHead(404); res.end(); return; }
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
async function until(what, check, ms) {
  const end = Date.now() + (ms || 8000);
  for (;;) {
    const got = await check();
    if (got) return got;
    if (Date.now() > end) throw new Error('Timed out waiting for: ' + what);
    await sleep(150);
  }
}

(async () => {
  const admin = sql => { const r = psql('postgres', ['-c', sql]); assert.ok(r.ok, r.err); };
  admin('drop database if exists ' + DB);
  admin('create database ' + DB);
  for (const file of [path.join(ROOT, 'tests', 'db', 'supabase-stub.sql'), path.join(ROOT, 'supabase', '001_foundation.sql'), path.join(ROOT, 'supabase', '002_scores.sql')]) {
    const r = psql(DB, ['-f', file]); assert.ok(r.ok, r.err);
  }
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/book-dude-next/';
  const browser = await chromium.launch();
  const errors = [];
  try {
    // A device: its own browser storage, with Supabase played by this test.
    const device = async kind => {
      const ctx = await browser.newContext({ ...devices[kind], timezoneId: 'America/Denver', serviceWorkers: 'block' });
      const net = { off: false };
      await ctx.route(SUPA + '/**', route => {
        const req = route.request();
        if (net.off) return route.abort('internetdisconnected');
        const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        let body = null;
        try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch (e) { body = null; }
        const out = handle(req.method(), req.url(), req.headers(), body || {});
        return route.fulfill({ status: out.status, headers: cors, contentType: 'application/json', body: out.json === null ? '' : JSON.stringify(out.json) });
      });
      // The school's Google script, with nothing new to say (a reader's saved link makes her devices ask it).
      await ctx.route('https://script.google.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(route.request().method() === 'GET' ? { app: 'book-dude-school', quizzes: [] } : { ok: true }) }));
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(kind + ': ' + e.message));
      await p.goto(BASE);
      await p.waitForSelector('.view-head');
      // No internet on this device, and back again (the app hears about it the way the iPad tells it).
      const offline = async off => { net.off = off; if (!off) await p.evaluate(() => window.dispatchEvent(new Event('online'))); };
      return { ctx, p, offline };
    };
    const ready = async p => { await p.waitForSelector('.view-head', { timeout: 15000 }); await sleep(300); if (await p.$('#sheet[open] .story')) { await p.click('.story .btn[data-act="close-sheet"]'); await sleep(300); } };
    const more = async p => { await p.$eval('.tab[data-tab="more"]', e => e.click()); await p.waitForSelector('#account-panel'); return clean(await p.textContent('#account-panel')); };
    // Waits for this exact message to pop up (an earlier one may still be fading).
    const says = async (p, text) => {
      try {
        await p.waitForFunction(t => { const el = document.querySelector('#toast'); return el.classList.contains('show') && el.textContent.replace(/\s+/g, ' ').trim() === t; }, text, { timeout: 8000 });
      } catch (e) { assert.equal(clean(await p.textContent('#toast')), text); }
    };
    const submit = (p, form) => p.$eval('form[data-form="' + form + '"] button[type="submit"]', e => e.click());
    const errorText = async p => { await p.waitForSelector('#acct-error:not([hidden])', { timeout: 8000 }); return clean(await p.textContent('#acct-error')); };
    const reloaded = async (p, act) => { await Promise.all([p.waitForNavigation({ timeout: 15000 }), act()]); await ready(p); };
    // Reading and changing her books through the app's own code, the way a tap would.
    const rec = (p, id) => p.evaluate(async id => (await import('/book-dude-next/app/state.js')).state.records[id] || null, id);
    const save = (p, id, patch) => p.evaluate(async ([id, patch]) => { await (await import('/book-dude-next/app/state.js')).save(id, patch); }, [id, patch]);
    const counts = p => p.evaluate(async () => { const s = (await import('/book-dude-next/app/state.js')).state; return { records: Object.keys(s.records).length, custom: Object.keys(s.custom).length }; });
    const status = async p => { await more(p); return clean(await p.textContent('#sync-status')); };
    // Save now, the button a reader or a grown-up looking at her books taps: it waits for the pop-up that says how it went.
    const saveNow = async p => { await more(p); await p.click('[data-act="acct-sync"]'); await says(p, 'Everything is saved to the family account.'); };
    const kidDbs = p => p.evaluate(async () => (await indexedDB.databases()).map(d => d.name).filter(n => n.includes('kid:')));
    // SHOTS=<folder> saves pictures of the account screens there, for a grown-up to look over.
    const shot = async (p, name) => { if (process.env.SHOTS) { await sleep(250); await p.screenshot({ path: path.join(process.env.SHOTS, name + '.png') }); } };
    const item = (kid, kind, id) => owner('select to_jsonb(i) from public.items i where kid_id = ' + lit(kid) + ' and kind = ' + lit(kind) + ' and id = ' + lit(id));

    /* ---- A grown-up joins with an invite code, on a phone that already has books of its own ---- */
    const dad = await device('iPhone 13');
    await ready(dad.p);
    await until('the built-in reading history on the phone\'s own shelves', async () => (await counts(dad.p)).records > 600, 20000);
    await save(dad.p, 'frindle--andrew-clements', { status: 'reading', note: 'The phone\'s own book.' });
    // A backup of the phone's own shelves (the built-in history and that book), for the move later on.
    const backup = await dad.p.evaluate(async () => { const s = (await import('/book-dude-next/app/state.js')).state; return JSON.stringify(window.ReadingCore.exportBackup(s.records, s.settings, undefined, s.custom)); });
    assert.match(await more(dad.p), /This device isn’t signed in\. Everything here is saved only on this device\./);
    assert.deepEqual(api.calls, [], 'a device that isn\'t signed in never talks to the account');
    await dad.p.$eval('#account-panel', e => e.scrollIntoView({ block: 'center' }));
    await shot(dad.p, '1-not-signed-in');

    await dad.p.click('[data-act="acct-grownup"]');
    await dad.p.click('[data-act="acct-signup"]');
    await dad.p.fill('#acct-name', 'Dad'); await dad.p.fill('#acct-email', 'dad@example.com'); await dad.p.fill('#acct-password', 'short');
    await dad.p.fill('#acct-code', 'AAAAA-BBBBB');
    await submit(dad.p, 'acct-signup');
    assert.equal(await errorText(dad.p), 'Pick a longer password: 8 or more characters.');
    await dad.p.fill('#acct-password', 'correct-horse-9');
    await submit(dad.p, 'acct-signup');
    assert.equal(await errorText(dad.p), 'That invite code isn’t right, or it has been used or has run out. Ask for a new one.');
    assert.equal(owner('select count(*) from auth.users'), 0, 'no account without a good code');
    const code = owner('select bookdude.owner_invite(\'Home\', true)');
    await dad.p.fill('#acct-code', code.toLowerCase());
    await dad.p.$eval('#acct-error', e => { e.hidden = true; });
    await shot(dad.p, '2-join-with-invite-code');
    await reloaded(dad.p, () => submit(dad.p, 'acct-signup'));
    let panel = await more(dad.p);
    assert.match(panel, /Signed in as Dad, a grown-up in Home\. This device is showing its own books, which are not in the account\./);
    assert.match(panel, /No readers yet\./);
    assert.match(panel, /Make an invite code/, 'the first grown-up is an admin');
    assert.equal((await rec(dad.p, 'frindle--andrew-clements')).note, 'The phone\'s own book.');

    /* ---- The grown-up adds a reader and opens her (empty) Book Dude ---- */
    await dad.p.click('[data-act="acct-add-kid"]');
    await dad.p.fill('#acct-name', 'Mia'); await dad.p.fill('#acct-username', 'A b'); await dad.p.fill('#acct-password', 'maple-123');
    await submit(dad.p, 'acct-add-kid');
    assert.match(await errorText(dad.p), /A username is 3 to 24 small letters or numbers/);
    await dad.p.fill('#acct-username', 'Mia');
    await submit(dad.p, 'acct-add-kid');
    await says(dad.p, 'Mia can now sign in with the username “mia”.');
    assert.match(clean(await dad.p.textContent('.reader-list')), /Mia\s*Signs in as “mia”\s*Open\s*New password\s*Sign out everywhere/);
    const MIA = owner('select id from public.kids where username = \'mia\'');
    await dad.p.$eval('#account-panel', e => e.scrollIntoView({ block: 'center' }));
    await sleep(3400);
    await shot(dad.p, '3-grown-up-family-area');
    await reloaded(dad.p, () => dad.p.click('[data-act="acct-open"]'));
    assert.match(clean(await dad.p.textContent('.kicker')), /, Mia$/, 'her name is on the greeting');
    assert.deepEqual(await counts(dad.p), { records: 0, custom: 0 }, 'her Book Dude starts empty: not the phone\'s books, not the built-in history');
    assert.match(await more(dad.p), /This device is showing Mia’s books\./);
    // Her first book, saved by her dad: it reaches the account.
    await save(dad.p, 'hatchet--gary-paulsen', { status: 'finished', rating: 5, note: 'Brian and the hatchet.', finishedDate: '2026-11-01' });
    await until('Hatchet in the account', () => item(MIA, 'record', 'hatchet--gary-paulsen'));
    assert.equal(item(MIA, 'record', 'hatchet--gary-paulsen').data.note, 'Brian and the hatchet.');
    await until('the saved line', async () => (await status(dad.p)) === 'Everything is saved to the family account.');
    // The school quiz link, pasted once by her dad, is saved with her: every device she signs in on will have it.
    await dad.p.evaluate(async () => { await (await import('/book-dude-next/app/state.js')).saveSetting('schoolLink', 'https://script.google.com/macros/s/AKfyTEST/exec?key=abc123'); });
    await until('the link in the account', () => item(MIA, 'setting', 'schoolLink'));

    /* ---- The reader signs in on her own iPad, which also has books of its own ---- */
    const pad = await device('iPad (gen 7)');
    await ready(pad.p);
    await save(pad.p, 'holes--louis-sachar', { status: 'want', note: 'The iPad\'s own book.' });
    await more(pad.p);
    await pad.p.click('[data-act="acct-reader"]');
    await pad.p.fill('#acct-username', 'mia'); await pad.p.fill('#acct-password', 'not-it');
    await submit(pad.p, 'acct-reader');
    assert.equal(await errorText(pad.p), 'That username or password isn’t right.');
    await pad.p.fill('#acct-password', 'maple-123');
    await reloaded(pad.p, () => submit(pad.p, 'acct-reader'));
    assert.deepEqual([(await rec(pad.p, 'hatchet--gary-paulsen')).note, (await rec(pad.p, 'hatchet--gary-paulsen')).rating], ['Brian and the hatchet.', 5], 'her book came down');
    assert.equal(await rec(pad.p, 'holes--louis-sachar'), null, 'the iPad\'s own book is not hers');
    assert.match(await more(pad.p), /Signed in as Mia\. Mia’s books are saved on this device and in the family account\./);
    await pad.p.$eval('#account-panel', e => e.scrollIntoView({ block: 'center' }));
    await shot(pad.p, '4-reader-signed-in');
    assert.equal(owner('select count(*) from auth.users where is_anonymous'), 1, 'the wrong try and the right one used the same device sign-in');
    assert.equal(await pad.p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.schoolLink), 'https://script.google.com/macros/s/AKfyTEST/exec?key=abc123', 'the school quiz link came with her');

    /* ---- Changes travel both ways ---- */
    await save(pad.p, 'hatchet--gary-paulsen', { rating: 3 });
    await pad.p.evaluate(async () => {
      const s = await import('/book-dude-next/app/state.js'), b = await import('/book-dude-next/app/books.js'), C = window.ReadingCore;
      const book = C.customBook({ id: 'mine:pancake', title: 'The Purple Pancake Detectives', author: 'Sam Sample', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      await s.db.putBooks([book]);
      s.state.custom[book.id] = book;
      b.rebuildBooks(s.state.custom);
      await s.saveSetting('accent', 'teal');
    });
    await until('the rating in the account', () => item(MIA, 'record', 'hatchet--gary-paulsen').data.rating === 3);
    await until('her own book in the account', () => item(MIA, 'book', 'mine:pancake'));
    await saveNow(dad.p);
    assert.equal((await rec(dad.p, 'hatchet--gary-paulsen')).rating, 3, 'her change reached her dad\'s phone');
    assert.equal((await counts(dad.p)).custom, 1);
    assert.equal(await dad.p.evaluate(() => document.documentElement.dataset.accent), 'teal', 'and so did her color');

    /* ---- The screen-time clock: started on her dad's phone, it shows on her tablet by itself (it looks every 30 seconds) ---- */
    await dad.p.evaluate(async () => {
      const s = await import('/book-dude-next/app/state.js'), C = window.ReadingCore;
      await s.saveSetting('timer', C.timerDo(null, 'cash', Date.now(), 30, 'famclock1').timer);
    });
    await until('the clock in her account', () => { const row = item(MIA, 'setting', 'timer'); return row && row.data.v.id === 'famclock1'; });
    await pad.p.waitForFunction(() => /^Screen time: (30:00|29:\d\d) left/.test(document.getElementById('screen-timer').textContent), null, { timeout: 45000 });
    await dad.p.waitForSelector('#screen-timer:not([hidden])');

    /* ---- Account check: a grown-up sees what the account itself holds for each reader, and can download it ---- */
    await more(dad.p);
    await dad.p.click('#account-panel [data-act="acct-check"]');
    await dad.p.waitForSelector('#confirm[open] .check-table');
    const checked = await dad.p.$$eval('.check-table tr', rows => Object.fromEntries(rows.map(r => [r.querySelector('th').textContent, r.querySelector('td').textContent])));
    const inAccount = owner('select count(*) from public.items where kid_id = ' + lit(MIA) + " and kind = 'record' and not deleted");
    assert.equal(checked.Reader, 'Mia');
    assert.equal(Number(checked['Book records']), Number(inAccount), 'the same books the account holds');
    assert.equal(Number(checked['Finished books']), 1, 'Frindle');
    assert.equal(checked['School AR total'], 'not yet');
    assert.match(checked['Last saved'], /^\d{4}-\d\d-\d\d \d\d:\d\d$/);
    assert.ok(await dad.p.$$eval('.check-recent li', li => li.some(l => /setting timer/.test(l.textContent))), 'the clock is among the latest saves');
    if (process.env.SHOTS) await dad.p.screenshot({ path: path.join(process.env.SHOTS, 'account-check.png') });
    const [file] = await Promise.all([dad.p.waitForEvent('download'), dad.p.click('#confirm [data-act="acct-check-csv"][data-which="summary"]')]);
    assert.match(file.suggestedFilename(), /^book-dude-account-check-\d{4}-\d\d-\d\d-\d\d-\d\d\.csv$/);
    const text = fs.readFileSync(await file.path(), 'utf8');
    assert.match(text, /^reader,Mia\nbook_records,\d+\nfinished_books,1\n/);
    assert.match(text, /\npoints_for_rewards,[\d.]+\n/);
    await dad.p.click('#confirm [data-act="close-confirm"]');

    /* ---- Game scores: hers on every device, the best of each level, and the family's scoreboard ---- */
    const scoresKey = 'book-dude:arcade:/book-dude-next/kid:' + MIA + ':maple-madness:records';
    const play = async (p, name, records) => {
      await p.goto(BASE + 'games/maple-madness/');
      await p.waitForSelector('#levels .lvl');
      assert.equal(clean(await p.textContent('#playerFixed')), name);
      assert.equal(await p.isHidden('#inPlayer'), true, 'whoever is signed in is the player: no name to type');
      // A score saved the way the game saves one after a level.
      await p.evaluate(r => { window.BookDudeArcade.open('maple-madness').set('records', r); }, { [name]: records });
      await Promise.all([p.waitForNavigation(), p.click('#homeLink')]);
      await ready(p);
    };
    const boardText = async p => { await p.$eval('.tab[data-tab="games"]', e => e.click()); await p.waitForSelector('.board', { timeout: 15000 }); return clean(await p.textContent('#scoreboard')); };
    // Mia plays on her iPad.
    await play(pad.p, 'Mia', { poop: { stars: 2, score: 100 } });
    assert.match(clean(await pad.p.textContent('#main')), /Playing as Mia\. 2 stars of 12 so far\..*Mia’s scores are saved to the family account/);
    await until('her score in her account', () => { const row = item(MIA, 'setting', 'arcade'); return row && row.data.v['maple-madness'].poop.stars === 2; });
    await until('her score on the scoreboard', () => owner('select count(*) from public.scores where kid_id = ' + lit(MIA)) === 1);
    // An older, worse result on that level (and a good one on another) never takes a star away: the best of each stays.
    await pad.p.evaluate(key => localStorage.setItem(key, JSON.stringify({ Mia: { poop: { stars: 1, score: 500 }, tug: { stars: 3, score: 9 } } })), scoresKey);
    await pad.p.reload(); await ready(pad.p);
    await until('the best of both in her account', () => { const v = item(MIA, 'setting', 'arcade').data.v['maple-madness']; return v.tug && v.tug.stars === 3 && v.poop.stars === 2; });
    assert.deepEqual(await pad.p.evaluate(key => JSON.parse(localStorage.getItem(key)), scoresKey), { Mia: { poop: { stars: 2, score: 100 }, tug: { stars: 3, score: 9 } } }, 'and the game has her best');
    // Her dad plays on his phone as himself (with her books open), and beats her at Poop Patrol.
    await play(dad.p, 'Dad', { poop: { stars: 3, score: 90 } });
    assert.match(clean(await dad.p.textContent('.game-card')), /Playing as Dad\. 3 stars of 12 so far\./);
    await until('his score on the scoreboard', () => owner('select count(*) from public.scores where grownup_id is not null') === 1);
    assert.equal(item(MIA, 'setting', 'arcade').data.v['maple-madness'].poop.stars, 2, 'his games are his, not hers');
    assert.match(await boardText(dad.p), /Family scoreboard.*Poop Patrol\s*Dad \(you\)\s*★★★\s*90\s*Mia\s*★★★\s*100.*Catch Fig\s*No scores yet\..*Tug of War\s*Mia\s*★★★\s*9/);
    await pad.p.reload(); await ready(pad.p);
    if (process.env.SHOTS) { await pad.p.$eval('#scoreboard', e => e.scrollIntoView({ block: 'center' })); await shot(pad.p, '6-family-scoreboard'); }
    assert.match(await boardText(pad.p), /Poop Patrol\s*Dad\s*★★★\s*90\s*Mia \(you\)\s*★★★\s*100.*Tug of War\s*Mia \(you\)/, 'she sees him ahead of her');

    /* ---- Offline: changes wait on the device, then go up ---- */
    await pad.offline(true);
    await save(pad.p, 'hatchet--gary-paulsen', { note: 'Written on the bus.' });
    await until('the waiting line', async () => /Can’t reach the family account right now\. 1 change is waiting to be saved to the family account\. Everything is still saved on this device\./.test(await status(pad.p)));
    assert.equal(item(MIA, 'record', 'hatchet--gary-paulsen').data.note, 'Brian and the hatchet.');
    // Meanwhile her dad fixes the same book, a moment later: the newest change wins on both devices.
    await sleep(50);
    await save(dad.p, 'hatchet--gary-paulsen', { note: 'Dad fixed a typo.' });
    await until('dad\'s note in the account', () => item(MIA, 'record', 'hatchet--gary-paulsen').data.note === 'Dad fixed a typo.');
    await pad.offline(false);
    await until('the newest note on the iPad', async () => (await rec(pad.p, 'hatchet--gary-paulsen')).note === 'Dad fixed a typo.');
    await until('nothing left waiting', async () => (await status(pad.p)) === 'Everything is saved to the family account.');
    assert.equal(item(MIA, 'record', 'hatchet--gary-paulsen').data.note, 'Dad fixed a typo.');
    // And a change made offline that nobody else touched goes up when the internet is back.
    await pad.offline(true);
    await save(pad.p, 'frindle--andrew-clements', { status: 'reading' });
    await sleep(2200);
    assert.equal(item(MIA, 'record', 'frindle--andrew-clements'), null);
    await pad.offline(false);
    await until('Frindle in the account', () => item(MIA, 'record', 'frindle--andrew-clements'));

    /* ---- Removing a book she added reaches her other device; a sign-in that ran out renews itself ---- */
    for (const t of api.tokens.values()) t.until = 0;
    await dad.p.evaluate(async () => {
      const s = await import('/book-dude-next/app/state.js'), b = await import('/book-dude-next/app/books.js');
      await s.db.deleteBook('mine:pancake');
      delete s.state.custom['mine:pancake'];
      b.rebuildBooks(s.state.custom);
    });
    await until('the removal in the account', () => item(MIA, 'book', 'mine:pancake').deleted === true);
    await saveNow(pad.p);
    assert.equal((await counts(pad.p)).custom, 0, 'gone from the iPad too');

    /* ---- Five wrong passwords lock the username; a grown-up's new password signs the iPad out and clears it ---- */
    const other = await device('iPhone 13');
    await ready(other.p);
    await more(other.p);
    await other.p.click('[data-act="acct-reader"]');
    await other.p.fill('#acct-username', 'mia');
    for (let i = 0; i < 5; i++) {
      await other.p.fill('#acct-password', 'guess-' + i);
      await submit(other.p, 'acct-reader');
      assert.equal(await errorText(other.p), 'That username or password isn’t right.');
      await other.p.waitForSelector('form[data-form="acct-reader"] button[type="submit"]:not([disabled])');
    }
    await other.p.fill('#acct-password', 'maple-123');
    await submit(other.p, 'acct-reader');
    assert.equal(await errorText(other.p), 'Too many wrong tries. Try again in 15 minutes, or ask a grown-up to set a new password.');
    await more(dad.p);
    await dad.p.click('[data-act="acct-kid-password"]');
    await dad.p.fill('#acct-password', 'newfig-100');
    await submit(dad.p, 'acct-kid-password');
    await says(dad.p, 'Mia has a new password and is signed out everywhere.');
    // The iPad finds out the next time it checks: her copy is removed, and it is back on its own books.
    await more(pad.p);
    await Promise.all([pad.p.waitForNavigation({ timeout: 15000 }), pad.p.click('[data-act="acct-sync"]')]);
    await ready(pad.p);
    await says(pad.p, 'This device was signed out of the family account.');
    assert.deepEqual(await kidDbs(pad.p), [], 'her copy is gone from the iPad');
    assert.equal(await pad.p.evaluate(key => localStorage.getItem(key), scoresKey), null, 'and her game scores with it (they are in the account)');
    assert.equal((await rec(pad.p, 'holes--louis-sachar')).note, 'The iPad\'s own book.', 'the iPad\'s own books were never touched');
    assert.notEqual(((await rec(pad.p, 'hatchet--gary-paulsen')) || {}).note, 'Dad fixed a typo.', 'her Hatchet is not here (the iPad\'s own shelves have the built-in history\'s)');
    assert.match(await more(pad.p), /This device isn’t signed in/);
    // She signs in again with the new password, and everything is back.
    await pad.p.click('[data-act="acct-reader"]');
    await pad.p.fill('#acct-username', 'MIA'); await pad.p.fill('#acct-password', 'newfig-100');
    await reloaded(pad.p, () => submit(pad.p, 'acct-reader'));
    assert.equal((await rec(pad.p, 'hatchet--gary-paulsen')).note, 'Dad fixed a typo.');
    assert.equal((await rec(pad.p, 'frindle--andrew-clements')).status, 'reading');

    /* ---- A lost iPad: the grown-up signs her out everywhere ---- */
    await more(dad.p);
    await dad.p.click('[data-act="acct-kid-signout"]');
    await dad.p.click('#confirm [data-act="confirm-ok"]');
    await says(dad.p, 'Mia is signed out everywhere.');
    await more(pad.p);
    await Promise.all([pad.p.waitForNavigation({ timeout: 15000 }), pad.p.click('[data-act="acct-sync"]')]);
    await ready(pad.p);
    assert.deepEqual(await kidDbs(pad.p), []);
    assert.deepEqual(owner('select jsonb_agg(kind || \':\' || id order by kind, id) from public.items where kid_id = ' + lit(MIA) + ' and not deleted'),
      ['record:frindle--andrew-clements', 'record:hatchet--gary-paulsen', 'setting:accent', 'setting:arcade', 'setting:payoutTold', 'setting:reward', 'setting:schoolLink', 'setting:storySeen', 'setting:timer'], 'nothing in the account was lost');

    /* ---- The grown-up signs out, and back in ---- */
    await more(dad.p);
    await dad.p.click('[data-act="acct-signout"]');
    await dad.p.waitForSelector('#confirm[open] [data-act="confirm-ok"]');
    assert.match(clean(await dad.p.textContent('#confirm')), /The readers’ books stay safe in the family account\. The copies on this device are removed/);
    await reloaded(dad.p, () => dad.p.click('#confirm [data-act="confirm-ok"]'));
    assert.deepEqual(await kidDbs(dad.p), []);
    assert.equal(await dad.p.evaluate(() => Object.keys(localStorage).filter(k => /account$/.test(k)).length), 0);
    assert.equal((await rec(dad.p, 'frindle--andrew-clements')).note, 'The phone\'s own book.');
    assert.equal(await dad.p.evaluate(async () => (await import('/book-dude-next/app/state.js')).state.settings.schoolLink), '', 'the link is hers, not the phone\'s: it left with her copy');
    await more(dad.p);
    await dad.p.click('[data-act="acct-grownup"]');
    await dad.p.fill('#acct-email', 'dad@example.com'); await dad.p.fill('#acct-password', 'wrong-horse');
    await submit(dad.p, 'acct-grownup');
    assert.equal(await errorText(dad.p), 'That email or password isn’t right.');
    await dad.p.fill('#acct-password', 'correct-horse-9');
    await reloaded(dad.p, () => submit(dad.p, 'acct-grownup'));
    assert.equal((await rec(dad.p, 'hatchet--gary-paulsen')).note, 'Dad fixed a typo.', 'signing in opens the family\'s reader');
    assert.equal(await dad.p.evaluate(() => document.documentElement.dataset.accent), 'teal');

    /* ---- Moving in: a backup from another Book Dude is restored into her account, and a new device gets all of it ---- */
    await more(dad.p);
    await dad.p.setInputFiles('#restore-file', { name: 'book-dude-backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await dad.p.waitForSelector('#confirm[open] [data-act="confirm-ok"]');
    assert.match(clean(await dad.p.textContent('#confirm')), /Restore this backup\?/);
    await dad.p.click('#confirm [data-act="confirm-ok"]');
    const moved = await until('the backup on the phone, in Mia\'s books', async () => { const c = await counts(dad.p); return c.records > 650 && c.custom > 600 ? c : null; }, 20000);
    await until('every book in the account', () => owner('select count(*) from public.items where kid_id = ' + lit(MIA) + ' and not deleted and kind in (\'record\', \'book\')') === moved.records + moved.custom, 60000);
    await until('nothing left waiting', async () => (await status(dad.p)) === 'Everything is saved to the family account.', 20000);
    assert.equal(item(MIA, 'record', 'hatchet--gary-paulsen').data.note, 'Dad fixed a typo.', 'her own newer copy of a book in the backup stayed');
    const fresh = await device('iPad (gen 7)');
    await ready(fresh.p);
    await more(fresh.p);
    await fresh.p.click('[data-act="acct-reader"]');
    await fresh.p.fill('#acct-username', 'mia'); await fresh.p.fill('#acct-password', 'newfig-100');
    await reloaded(fresh.p, () => submit(fresh.p, 'acct-reader'));
    assert.deepEqual(await counts(fresh.p), moved, 'a new device gets everything, more than one page of it');
    assert.equal((await rec(fresh.p, 'hatchet--gary-paulsen')).note, 'Dad fixed a typo.');
    assert.match(clean(await fresh.p.textContent('.kicker')), /, Mia$/);
    await fresh.ctx.close();

    /* ---- Another family, invited by the admin, sees none of it ---- */
    await more(dad.p);
    await dad.p.click('[data-act="acct-invite"]');
    await dad.p.selectOption('#acct-who', 'new');
    await submit(dad.p, 'acct-invite');
    assert.equal(await errorText(dad.p), 'Type the new family’s name.');
    await dad.p.fill('#acct-family', 'Cousins');
    await submit(dad.p, 'acct-invite');
    await dad.p.waitForSelector('#invite-code');
    const cousinCode = clean(await dad.p.textContent('#invite-code'));
    await shot(dad.p, '5-invite-code');
    assert.match(cousinCode, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    await other.p.reload(); await ready(other.p);
    await more(other.p);
    await other.p.click('[data-act="acct-grownup"]');
    await other.p.click('[data-act="acct-signup"]');
    await other.p.fill('#acct-name', 'Cal'); await other.p.fill('#acct-email', 'dad@example.com'); await other.p.fill('#acct-password', 'battery-staple-4'); await other.p.fill('#acct-code', cousinCode);
    await submit(other.p, 'acct-signup');
    assert.equal(await errorText(other.p), 'That email already has an account. Sign in instead, or ask whoever invited you to reset it.');
    await other.p.fill('#acct-email', 'cal@example.com');
    await reloaded(other.p, () => submit(other.p, 'acct-signup'));
    panel = await more(other.p);
    assert.match(panel, /Signed in as Cal, a grown-up in Cousins\./);
    assert.match(panel, /No readers yet\./);
    assert.doesNotMatch(panel, /Mia|Make an invite code/, 'no sign of the other family, and not an admin');
    await other.p.click('[data-act="acct-add-kid"]');
    await other.p.fill('#acct-name', 'Zoe'); await other.p.fill('#acct-username', 'mia'); await other.p.fill('#acct-password', 'tigger-55');
    await submit(other.p, 'acct-add-kid');
    assert.equal(await errorText(other.p), 'Someone already has that username. Try another.');
    await other.p.fill('#acct-username', 'zoe');
    await submit(other.p, 'acct-add-kid');
    await says(other.p, 'Zoe can now sign in with the username “zoe”.');
    await reloaded(other.p, () => other.p.click('[data-act="acct-open"]'));
    assert.deepEqual(await counts(other.p), { records: 0, custom: 0 });
    // Asking the account for Mia's books as the cousins' grown-up brings back nothing.
    const peek = await other.p.evaluate(async kid => {
      const c = await import('/book-dude-next/app/cloud.js');
      const r = await c.call('GET', '/rest/v1/items?select=id&kid_id=eq.' + kid + '&rev=gt.0&order=rev.asc&limit=10');
      return [r.status, r.json];
    }, MIA);
    assert.deepEqual(peek, [200, []]);

    assert.deepStrictEqual(errors, []);
    console.log('A grown-up joins with an invite code and adds a reader; she signs in on her own device; changes travel both ways, wait offline, and the newest wins; ' +
      'signing out removes her copy and never touches a device\'s own books; a restored backup moves into her account and onto a new device; another family sees nothing.');
  } finally {
    await browser.close();
    server.close();
    psql('postgres', ['-c', 'drop database if exists ' + DB + ' with (force)']);
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
