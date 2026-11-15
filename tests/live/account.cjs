/* The family account, end to end, against the REAL Supabase project: the app in Chromium, served from this folder,
 * talking to the real sign-up service, API and database. tests/browser/account.cjs proves the app against the real
 * database script with Supabase's API played by the test; this proves it against Supabase itself.
 *
 * It needs an invite code for a try-out family, which only the owner can make. In the Supabase SQL Editor:
 *     select bookdude.owner_invite('Dude Next try-out', false, false);
 * Then:
 *     INVITE=XXXXX-XXXXX node tests/live/account.cjs
 * It signs up one made-up grown-up (no email is ever sent: "Confirm email" is off), adds a reader, saves and changes
 * a book from two devices, checks the try-out family can't see anyone else's readers, and signs out. Afterwards the
 * owner removes the try-out family and everything in it:
 *     select bookdude.owner_remove_family('Dude Next try-out');
 *
 * Needs Playwright 1.56.1 and its Chromium, like clickthrough.cjs. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const INVITE = (process.env.INVITE || '').trim();
if (!INVITE) { console.error('Set INVITE to a code from: select bookdude.owner_invite(\'Dude Next try-out\', false, false);'); process.exit(1); }
const DOCS = path.join(__dirname, '..', '..', 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const stamp = Date.now().toString(36);
const EMAIL = process.env.TRY_EMAIL || 'dudenext.tryout.' + stamp + '@gmail.com';
const PASSWORD = 'tryout-' + stamp + '-Pw9';
const READER = 'tryout' + stamp;

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/book-dude-next\//, '');
    const file = path.join(DOCS, rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!url.pathname.startsWith('/book-dude-next/') || !file.startsWith(DOCS + path.sep)) { res.writeHead(404); res.end(); return; }
    // The built-in reading history isn't part of this: leave the devices' own shelves empty.
    if (rel === 'history.json') { res.writeHead(404); res.end(); return; }
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
  const end = Date.now() + (ms || 15000);
  for (;;) {
    const got = await check();
    if (got) return got;
    if (Date.now() > end) throw new Error('Timed out waiting for: ' + what);
    await sleep(300);
  }
}

(async () => {
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/book-dude-next/';
  const browser = await chromium.launch();
  const errors = [];
  const done = [];
  const ok = what => { done.push(what); console.log('  ok  ' + what); };
  try {
    const device = async kind => {
      const ctx = await browser.newContext({ ...devices[kind], serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(kind + ': ' + e.message));
      await p.goto(BASE);
      return { ctx, p };
    };
    const ready = async p => { await p.waitForSelector('.view-head', { timeout: 30000 }); await sleep(400); if (await p.$('#sheet[open] .story')) { await p.click('.story .btn[data-act="close-sheet"]'); await sleep(300); } };
    const more = async p => { await p.$eval('.tab[data-tab="more"]', e => e.click()); await p.waitForSelector('#account-panel'); return clean(await p.textContent('#account-panel')); };
    const submit = (p, form) => p.$eval('form[data-form="' + form + '"] button[type="submit"]', e => e.click());
    const reloaded = async (p, act, form) => {
      const failed = form ? p.waitForSelector('#acct-error:not([hidden])', { timeout: 40000 }).then(async () => { throw new Error('the account said: ' + clean(await p.textContent('#acct-error'))); }) : new Promise(() => {});
      await Promise.race([Promise.all([p.waitForNavigation({ timeout: 40000 }), act()]), failed]);
      await ready(p);
    };
    const rec = (p, id) => p.evaluate(async id => (await import('/book-dude-next/app/state.js')).state.records[id] || null, id);
    const save = (p, id, patch) => p.evaluate(async ([id, patch]) => { await (await import('/book-dude-next/app/state.js')).save(id, patch); }, [id, patch]);
    const status = async p => { await more(p); return clean(await p.textContent('#sync-status')); };
    const ask = (p, path) => p.evaluate(async path => { const r = await (await import('/book-dude-next/app/cloud.js')).call('GET', path); return [r.status, r.json]; }, path);
    const says = async (p, text) => p.waitForFunction(t => { const el = document.querySelector('#toast'); return el.classList.contains('show') && el.textContent.replace(/\s+/g, ' ').trim() === t; }, text, { timeout: 20000 });

    // A grown-up joins with the invite code.
    const phone = await device('iPhone 13');
    await ready(phone.p);
    await more(phone.p);
    await phone.p.click('[data-act="acct-grownup"]');
    await phone.p.click('[data-act="acct-signup"]');
    await phone.p.fill('#acct-name', 'Tester'); await phone.p.fill('#acct-email', EMAIL); await phone.p.fill('#acct-password', PASSWORD); await phone.p.fill('#acct-code', INVITE);
    await reloaded(phone.p, () => submit(phone.p, 'acct-signup'), true);
    let panel = await more(phone.p);
    assert.match(panel, /Signed in as Tester, a grown-up in /);
    assert.doesNotMatch(panel, /Make an invite code/, 'the try-out grown-up must not be an admin');
    assert.doesNotMatch(panel, /needs its newest script/);
    ok('a grown-up signed up with the invite code (' + EMAIL + '), and is not an admin');

    // They add a reader and save her first book.
    await phone.p.click('[data-act="acct-add-kid"]');
    await phone.p.fill('#acct-name', 'Tryout'); await phone.p.fill('#acct-username', READER); await phone.p.fill('#acct-password', 'maple-123');
    await submit(phone.p, 'acct-add-kid');
    await says(phone.p, 'Tryout can now sign in with the username “' + READER + '”.');
    await reloaded(phone.p, () => phone.p.click('[data-act="acct-open"]'));
    await save(phone.p, 'hatchet--gary-paulsen', { status: 'finished', rating: 5, note: 'Saved from the phone.' });
    await until('the saved line', async () => (await status(phone.p)) === 'Everything is saved to the family account.');
    const kid = await phone.p.evaluate(async () => (await import('/book-dude-next/app/cloud.js')).activeKid());
    const mine = await ask(phone.p, '/rest/v1/items?select=id,data&kid_id=eq.' + kid + '&kind=eq.record');
    assert.equal(mine[0], 200);
    assert.equal(mine[1].find(r => r.id === 'hatchet--gary-paulsen').data.note, 'Saved from the phone.');
    ok('they added a reader, and a book saved on the phone is in the account');

    // The reader signs in on her own device and gets it; a wrong password is turned away.
    const pad = await device('iPad (gen 7)');
    await ready(pad.p);
    await more(pad.p);
    await pad.p.click('[data-act="acct-reader"]');
    await pad.p.fill('#acct-username', READER); await pad.p.fill('#acct-password', 'not-the-password');
    await submit(pad.p, 'acct-reader');
    await pad.p.waitForSelector('#acct-error:not([hidden])', { timeout: 30000 });
    assert.equal(clean(await pad.p.textContent('#acct-error')), 'That username or password isn’t right.');
    await pad.p.fill('#acct-password', 'maple-123');
    await reloaded(pad.p, () => submit(pad.p, 'acct-reader'), true);
    assert.equal((await rec(pad.p, 'hatchet--gary-paulsen')).note, 'Saved from the phone.');
    assert.match(await more(pad.p), /Signed in as Tryout\./);
    ok('the reader signed in on a second device (after one wrong password) and her book came down');

    // Changes travel both ways, and wait while there's no internet.
    await save(pad.p, 'hatchet--gary-paulsen', { rating: 3, note: 'Changed on the iPad.' });
    await until('the saved line on the iPad', async () => (await status(pad.p)) === 'Everything is saved to the family account.');
    await phone.p.click('[data-act="acct-sync"]');
    await until('the change on the phone', async () => (await rec(phone.p, 'hatchet--gary-paulsen')).note === 'Changed on the iPad.');
    await pad.ctx.setOffline(true);
    await save(pad.p, 'frindle--andrew-clements', { status: 'reading' });
    await until('the waiting line', async () => /1 change is waiting/.test(await status(pad.p)), 40000);
    await pad.ctx.setOffline(false);
    await until('the saved line after coming back', async () => (await status(pad.p)) === 'Everything is saved to the family account.', 30000);
    await phone.p.click('[data-act="acct-sync"]');
    await until('the offline change on the phone', async () => ((await rec(phone.p, 'frindle--andrew-clements')) || {}).status === 'reading');
    ok('changes travel both ways, and one made with no internet went up when it came back');

    // The try-out family sees only itself.
    assert.deepEqual((await ask(phone.p, '/rest/v1/families?select=name'))[1].length, 1, 'only its own family');
    assert.deepEqual((await ask(phone.p, '/rest/v1/kids?select=username'))[1], [{ username: READER }], 'only its own reader');
    assert.deepEqual((await ask(pad.p, '/rest/v1/kids?select=username'))[1], [{ username: READER }]);
    const all = (await ask(pad.p, '/rest/v1/items?select=kid_id'))[1];
    assert.ok(all.length > 0 && all.every(r => r.kid_id === kid), 'every item the reader can see is her own');
    ok('the try-out family and its reader can see no other family, reader or saved thing');

    // A new password signs the iPad out and removes her copy from it.
    await more(phone.p);
    await phone.p.click('[data-act="acct-kid-password"]');
    await phone.p.fill('#acct-password', 'figcat-456');
    await submit(phone.p, 'acct-kid-password');
    await says(phone.p, 'Tryout has a new password and is signed out everywhere.');
    await more(pad.p);
    await Promise.all([pad.p.waitForNavigation({ timeout: 40000 }), pad.p.click('[data-act="acct-sync"]')]);
    await ready(pad.p);
    assert.match(await more(pad.p), /This device isn’t signed in/);
    assert.deepEqual(await pad.p.evaluate(async () => (await indexedDB.databases()).map(d => d.name).filter(n => n.includes('kid:'))), []);
    ok('a new password from the grown-up signed the iPad out and removed her copy from it');

    // The grown-up signs out, and back in with the password.
    await more(phone.p);
    await phone.p.click('[data-act="acct-signout"]');
    await phone.p.waitForSelector('#confirm[open] [data-act="confirm-ok"]', { timeout: 30000 });
    await reloaded(phone.p, () => phone.p.click('#confirm [data-act="confirm-ok"]'));
    assert.match(await more(phone.p), /This device isn’t signed in/);
    await phone.p.click('[data-act="acct-grownup"]');
    await phone.p.fill('#acct-email', EMAIL); await phone.p.fill('#acct-password', PASSWORD);
    await reloaded(phone.p, () => submit(phone.p, 'acct-grownup'), true);
    assert.equal((await rec(phone.p, 'hatchet--gary-paulsen')).note, 'Changed on the iPad.');
    await more(phone.p);
    await phone.p.click('[data-act="acct-signout"]');
    await phone.p.waitForSelector('#confirm[open] [data-act="confirm-ok"]', { timeout: 30000 });
    await reloaded(phone.p, () => phone.p.click('#confirm [data-act="confirm-ok"]'));
    ok('the grown-up signed out, back in with the password (her books came back), and out again');

    assert.deepStrictEqual(errors, []);
    console.log('The real project works end to end (' + done.length + ' checks). Now remove the try-out family in the SQL Editor:\n    select bookdude.owner_remove_family(\'Dude Next try-out\');');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED ' + e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
