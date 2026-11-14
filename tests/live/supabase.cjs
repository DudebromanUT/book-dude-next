/* Checks the real Supabase project from the outside, the way a stranger with the website's public key would see it:
 * the sign-in settings are right, the database script is installed, nothing can be read or written without belonging
 * to a family, signing up without an invite code is refused, and a device's nameless sign-in can't become an account.
 *
 *   Run:  node tests/live/supabase.cjs          (after supabase/001_foundation.sql has been run in the SQL Editor)
 *
 * It uses only the public address and publishable key in supabase/project.json. Each run leaves one nameless device
 * sign-in behind, which the daily check-in removes after a week. */
const assert = require('node:assert/strict');
const { url: URL_, publishableKey: KEY } = require('../../supabase/project.json');

async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(URL_ + path, { method,
    headers: Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}, headers || {}),
    body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
  return { status: res.status, json, text };
}
const rpc = (name, args, token) => call('POST', '/rest/v1/rpc/' + name, { token, body: args || {} });
const TABLES = ['families', 'grownups', 'kids', 'kid_devices', 'items'];
const done = [];
const ok = what => { done.push(what); console.log('  ok  ' + what); };

(async () => {
  // 1. Sign-in settings in the dashboard.
  const settings = (await call('GET', '/auth/v1/settings')).json;
  assert.equal(settings.external.anonymous_users, true, 'Turn ON "Allow anonymous sign-ins" (Authentication, Sign In / Providers)');
  assert.equal(settings.mailer_autoconfirm, true, 'Turn OFF "Confirm email" (Authentication, Sign In / Providers)');
  assert.equal(settings.external.email, true, 'The Email provider must stay on');
  ok('sign-in settings: readers\' devices can sign in, and no confirmation email is needed');

  // 2. The script is installed, and a signed-out visitor gets the check-in and nothing else.
  const ping = await rpc('ping');
  assert.deepEqual([ping.status, ping.json], [200, { ok: true, schema: 1 }], 'supabase/001_foundation.sql has not been run yet: ' + ping.text);
  ok('the database script is installed (schema 1) and the daily check-in answers');
  assert.deepEqual((await rpc('invite_ok', { code: 'AAAAA-BBBBB' })).json, false);
  for (const t of TABLES) {
    const r = await call('GET', '/rest/v1/' + t + '?select=*');
    assert.ok(r.status === 401 || r.status === 403, t + ' should be closed to visitors, got ' + r.status + ' ' + r.text);
    assert.match(r.text, /permission denied/);
  }
  for (const f of ['me', 'kid_sign_out', 'create_invite']) {
    const r = await rpc(f);
    assert.ok(r.status === 401 || r.status === 403 || r.status === 404, f + ' should be closed to visitors, got ' + r.status);
  }
  const guess = await rpc('kid_sign_in', { username: 'maddy', password: 'guess' });
  assert.ok(guess.status === 401 || guess.status === 403, 'kid_sign_in should need a device sign-in, got ' + guess.status);
  ok('a visitor who is not signed in can read no table and call nothing but the check-in');

  // 3. Signing up without an invite code is refused, and so is a wrong code.
  const stamp = Date.now().toString(36);
  for (const invite of [undefined, 'AAAAA-BBBBB']) {
    const r = await call('POST', '/auth/v1/signup', { body: { email: 'bookdude.gatecheck.' + stamp + '@gmail.com', password: 'not-a-real-account-' + stamp, data: { invite, name: 'Gate check' } } });
    assert.ok(r.status >= 400, 'A sign-up without a valid invite went through! Delete the user "bookdude.gatecheck.' + stamp + '" in the dashboard. ' + r.text);
    assert.ok(!r.json || !r.json.access_token);
    assert.match(r.text, /Database error|invite/i, 'refused, but not by the invite rule: ' + r.text);
  }
  ok('signing up without a valid invite code is refused by the database');

  // 4. A device's nameless sign-in: it works, and on its own it sees nothing.
  const anon = await call('POST', '/auth/v1/signup', { body: { data: {} } });
  assert.equal(anon.status, 200, 'the nameless device sign-in failed: ' + anon.text);
  const token = anon.json.access_token;
  assert.equal(anon.json.user.is_anonymous, true);
  for (const t of TABLES) {
    const r = await call('GET', '/rest/v1/' + t + '?select=*', { token });
    assert.deepEqual([r.status, r.json], [200, []], t + ' should be empty for a nameless device: ' + r.text);
  }
  const me = (await rpc('me', {}, token)).json;
  assert.deepEqual([me.schema, me.grownup, me.kid, me.family, me.kids], [1, null, null, null, []]);
  ok('a nameless device sign-in works, and sees no family, no reader and no items');

  // 5. It can't write, can't sign in as a reader without the password, and can't do a grown-up's jobs.
  const plant = await call('POST', '/rest/v1/items', { token, body: { kid_id: '00000000-0000-4000-8000-000000000000', kind: 'record', id: 'planted', data: {}, client_at: new Date().toISOString() } });
  assert.equal(plant.status, 403, 'writing an item for a reader it isn\'t: ' + plant.text);
  assert.match(plant.text, /row-level security/);
  for (const t of ['families', 'kids', 'kid_devices', 'grownups']) {
    const r = await call('POST', '/rest/v1/' + t, { token, body: {} });
    assert.equal(r.status, 403, t + ' must not be writable: ' + r.text);
  }
  assert.deepEqual((await rpc('kid_sign_in', { username: 'no-such-reader-' + stamp, password: 'guess-' + stamp }, token)).json, { ok: false, why: 'no' });
  const kid = await rpc('create_kid', { name: 'X', username: 'gatecheck', password: 'secret-1' }, token);
  assert.equal(kid.status, 403, kid.text);
  const invite = await rpc('create_invite', {}, token);
  assert.equal(invite.status, 403, invite.text);
  ok('it cannot write anything, guess its way into a reader, add a reader or make an invite');

  // 6. It can't turn itself into an email account (a way around the invite code), and its session still renews.
  const grab = await call('PUT', '/auth/v1/user', { token, body: { email: 'bookdude.gatecheck.' + stamp + '@gmail.com', password: 'not-a-real-account-' + stamp } });
  assert.ok(grab.status >= 400, 'A device sign-in became an email account! ' + grab.text);
  const renew = await call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: anon.json.refresh_token } });
  assert.equal(renew.status, 200, 'renewing the device session failed: ' + renew.text);
  assert.equal(renew.json.user.is_anonymous, true);
  assert.equal(renew.json.user.email || '', '');
  ok('it cannot become an email account, and its session renews as usual');
  await call('POST', '/auth/v1/logout', { token: renew.json.access_token });

  console.log('The Supabase project is set up and closed to strangers (' + done.length + ' checks).');
})().catch(e => { console.error('FAILED ' + e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
