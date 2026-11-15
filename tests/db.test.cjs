/* The database rules (supabase/001_foundation.sql), run on a scratch Postgres with Supabase's own parts played by
 * tests/db/supabase-stub.sql. Each check asks the database the way the website would: not signed in, signed in as a
 * grown-up, or as a device signed in as a reader. The point of the file: one family can never see or change another's.
 *
 *   Run:  BOOKDUDE_TEST_DB=postgres://postgres:postgres@127.0.0.1:5432/postgres node --test tests/db.test.cjs
 *
 * The address is a superuser on a throwaway Postgres (never the real project). Without it, the checks are skipped. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');

const BASE = process.env.BOOKDUDE_TEST_DB;
const MIGRATION = path.join(__dirname, '..', 'supabase', '001_foundation.sql');
const STUB = path.join(__dirname, 'db', 'supabase-stub.sql');
const DB = 'bookdude_test_' + process.pid;

const urlFor = db => { const u = new URL(BASE); u.pathname = '/' + db; return u.href; };
function psql(db, args, input) {
  const r = spawnSync('psql', [urlFor(db), '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'].concat(args), { input, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const lit = s => "'" + String(s).replace(/'/g, "''") + "'";
// Who is asking: 'owner' (the SQL Editor), 'auth' (Supabase's sign-up service), 'anon' (not signed in), or a user id.
function as(who) {
  if (who === 'owner') return '';
  if (who === 'auth') return 'set local role supabase_auth_admin;';
  if (who === 'anon') return 'set local role anon; set local request.jwt.claims = \'{"role":"anon"}\';';
  return 'set local role authenticated; set local request.jwt.claims = ' + lit(JSON.stringify({ sub: who, role: 'authenticated' })) + ';';
}
const run = (who, sql) => psql(DB, ['-f', '-'], 'begin;\n' + as(who) + '\n' + sql + ';\ncommit;');
function get(who, expr) { const r = run(who, 'select to_jsonb((' + expr + '))'); assert.ok(r.ok, r.err); return JSON.parse(r.out); }
function rows(who, query) { const r = run(who, 'select coalesce(jsonb_agg(t), \'[]\'::jsonb) from (' + query + ') t'); assert.ok(r.ok, r.err); return JSON.parse(r.out); }
function changed(who, dml) { const r = run(who, 'with x as (' + dml + ' returning 1) select count(*) from x'); assert.ok(r.ok, r.err); return Number(r.out); }
function refused(who, sql, pattern) { const r = run(who, sql); assert.ok(!r.ok, 'should have been refused: ' + sql); assert.match(r.err, pattern); }

// Signing up the way Supabase does it: the sign-up service adds the account, with the invite code among its details.
function signup(email, invite, name) {
  const r = run('auth', 'insert into auth.users (email, raw_user_meta_data) values (' + lit(email) + ', ' + lit(JSON.stringify({ invite, name })) + '::jsonb) returning id');
  return r.ok ? { id: r.out } : { error: r.err };
}
// A device's nameless sign-in, before a reader signs in on it.
function device() { const r = run('auth', 'insert into auth.users (is_anonymous) values (true) returning id'); assert.ok(r.ok, r.err); return r.out; }
const ownerInvite = (family, cobol) => get('owner', 'bookdude.owner_invite(' + lit(family) + ', ' + !!cobol + ')');
const rpc = (who, call) => get(who, 'public.' + call);
const item = (kid, kind, id, data, at) => 'insert into public.items (kid_id, kind, id, data, client_at) values (' +
  [lit(kid), lit(kind), lit(id), lit(JSON.stringify(data)) + '::jsonb', lit(at)].join(', ') + ')';
const upsert = (kid, kind, id, data, at) => item(kid, kind, id, data, at) +
  ' on conflict (kid_id, kind, id) do update set data = excluded.data, client_at = excluded.client_at, deleted = excluded.deleted';

// The cast: two families. Home is the owner's (Ann and Ben are admins; readers Mia and Max). Cousins has Cal and reader Zoe.
const P = {};

if (!BASE) {
  test('database rules: skipped, no scratch Postgres (set BOOKDUDE_TEST_DB to run them)', { skip: true }, () => {});
} else {
  test.before(() => {
    const admin = (sql) => { const r = psql('postgres', ['-c', sql]); assert.ok(r.ok, r.err); };
    admin('drop database if exists ' + DB);
    admin('create database ' + DB);
    let r = psql(DB, ['-f', STUB]); assert.ok(r.ok, r.err);
    r = psql(DB, ['-f', MIGRATION]); assert.ok(r.ok, r.err);
  });
  test.after(() => { psql('postgres', ['-c', 'drop database if exists ' + DB + ' with (force)']); });

  test('the script can be run again without changing or losing anything', () => {
    assert.equal(changed('owner', 'insert into public.families (name) values (\'Keep me\')'), 1);
    const r = psql(DB, ['-f', MIGRATION]); assert.ok(r.ok, r.err);
    assert.equal(rows('owner', 'select name from public.families').length, 1);
    assert.equal(changed('owner', 'delete from public.families'), 1);
  });

  test('not signed in: the daily check-in works, and nothing else does', () => {
    assert.deepEqual(rpc('anon', 'ping()'), { ok: true, schema: 2 });
    assert.equal(rpc('anon', 'invite_ok(\'AAAAA-BBBBB\')'), false);
    for (const t of ['families', 'grownups', 'kids', 'kid_devices', 'items']) refused('anon', 'select * from public.' + t, /permission denied/);
    for (const f of ['me()', 'kid_sign_in(\'mia\', \'x\')', 'kid_sign_out()', 'create_kid(\'a\', \'bbb\', \'cccccc\')', 'create_invite()']) {
      refused('anon', 'select public.' + f, /permission denied for function/);
    }
    refused('anon', 'select * from bookdude.invites', /permission denied/);
    refused('anon', 'select bookdude.owner_invite(\'x\')', /permission denied/);
  });

  test('nothing is open by accident: exactly these functions and tables can be reached, and no others', () => {
    const can = (role, what) => rows('owner', what === 'functions'
      ? 'select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in (\'public\', \'bookdude\') and has_function_privilege(' + lit(role) + ', p.oid, \'execute\') order by 1'
      : 'select c.relname || \':\' || string_agg(x.priv, \',\' order by x.priv) as name from pg_class c join pg_namespace n on n.oid = c.relnamespace cross join (values (\'SELECT\'), (\'INSERT\'), (\'UPDATE\'), (\'DELETE\'), (\'TRUNCATE\')) x(priv) ' +
        'where n.nspname in (\'public\', \'bookdude\') and c.relkind in (\'r\', \'S\', \'v\') and has_table_privilege(' + lit(role) + ', c.oid, x.priv) group by c.relname order by 1').map(r => r.name);
    assert.deepEqual(can('anon', 'functions'), ['invite_ok', 'ping']);
    assert.deepEqual(can('anon', 'tables'), []);
    assert.deepEqual(can('authenticated', 'functions'), ['create_invite', 'create_kid', 'grownup_family', 'invite_ok', 'is_admin', 'kid_sign_in', 'kid_sign_out',
      'me', 'my_family', 'my_kids', 'ping', 'reset_grownup', 'set_kid_password', 'sign_out_kid']);
    assert.deepEqual(can('authenticated', 'tables'), ['families:SELECT', 'grownups:SELECT', 'items:INSERT,SELECT,UPDATE', 'kid_devices:SELECT', 'kids:SELECT']);
    // Every table has its rules switched on, and every function that runs with the owner's rights pins where it looks things up.
    assert.deepEqual(rows('owner', 'select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in (\'public\', \'bookdude\') and c.relkind = \'r\' and not c.relrowsecurity'), []);
    assert.deepEqual(rows('owner', 'select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in (\'public\', \'bookdude\') and p.prosecdef and not coalesce(p.proconfig, \'{}\') @> array[\'search_path=""\']'), []);
  });

  test('signing up needs a valid invite code: none, a wrong one, a used one and an expired one are all refused', () => {
    assert.match(signup('stranger@example.com', undefined, 'S').error, /a valid invite code is needed/);
    assert.match(signup('stranger@example.com', 'AAAAA-BBBBB', 'S').error, /a valid invite code is needed/);
    assert.equal(rows('owner', 'select 1 from auth.users').length, 0, 'no account was made');

    const code = ownerInvite('Home', true);
    assert.match(code, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    assert.equal(rows('owner', 'select 1 from bookdude.invites where code_hash like ' + lit('%' + code.replace('-', '') + '%')).length, 0, 'only a fingerprint is kept');
    // Typed in small letters with spaces instead of the dash: still the same code.
    assert.equal(rpc('anon', 'invite_ok(' + lit(code) + ')'), true);
    P.ann = signup('ann@example.com', ' ' + code.toLowerCase().replace('-', ' '), '  Ann  ').id;
    assert.ok(P.ann, 'the first grown-up is in');
    assert.match(signup('thief@example.com', code, 'T').error, /a valid invite code is needed/, 'a code works once');
    assert.equal(rpc('anon', 'invite_ok(' + lit(code) + ')'), false);

    const me = rpc(P.ann, 'me()');
    assert.deepEqual(me.grownup, { name: 'Ann', admin: true });
    assert.equal(me.family.name, 'Home');
    assert.equal(me.family.cobol, true);
    assert.deepEqual(me.kids, []);
    assert.equal(me.kid, null);
    P.home = me.family.id;

    const late = ownerInvite('Home');
    run('owner', 'update bookdude.invites set expires_at = now() - interval \'1 minute\' where used_at is null');
    assert.match(signup('late@example.com', late, 'L').error, /a valid invite code is needed/);
  });

  test('only an admin can invite; an invite joins a family or starts one, and other families never get admins', () => {
    // Ann invites Ben into her own family as a second admin.
    const forBen = rpc(P.ann, 'create_invite(admin => true)');
    assert.equal(forBen.ok, true);
    P.ben = signup('ben@example.com', forBen.code, 'Ben').id;
    assert.deepEqual(rpc(P.ben, 'me()').grownup, { name: 'Ben', admin: true });
    assert.equal(rpc(P.ben, 'me()').family.id, P.home);
    // The owner asking again for the same family name gets a code that joins it, not a second family.
    assert.equal(rows('owner', 'select 1 from public.families').length, 1);

    // Ben invites the cousins: a new family. Asking for admin there is ignored.
    const forCal = rpc(P.ben, 'create_invite(new_family => \'Cousins\', admin => true)');
    P.cal = signup('cal@example.com', forCal.code, 'Cal').id;
    const cal = rpc(P.cal, 'me()');
    assert.deepEqual(cal.grownup, { name: 'Cal', admin: false });
    assert.equal(cal.family.name, 'Cousins');
    assert.equal(cal.family.cobol, false, 'COBOL is never switched on by an invite from the website');
    P.cousins = cal.family.id;

    refused(P.cal, 'select public.create_invite()', /Only an admin can invite/);
    refused(device(), 'select public.create_invite()', /Only an admin can invite/);
    assert.deepEqual(rpc(P.ann, 'create_invite(family => \'' + P.home + '\', new_family => \'Both\')'), { ok: false, why: 'both' });
    assert.deepEqual(rpc(P.ann, 'create_invite(family => gen_random_uuid())'), { ok: false, why: 'family' });
    // An admin can invite a second grown-up into another family; they are not an admin.
    const forDee = rpc(P.ann, 'create_invite(family => \'' + P.cousins + '\', admin => true)');
    P.dee = signup('dee@example.com', forDee.code, 'Dee').id;
    assert.deepEqual(rpc(P.dee, 'me()').grownup, { name: 'Dee', admin: false });
    assert.equal(rpc(P.dee, 'me()').family.id, P.cousins);
  });

  test('a grown-up adds readers to their own family; usernames are unique everywhere and passwords have a minimum', () => {
    const mia = rpc(P.ann, 'create_kid(\' Mia \', \'Mia\', \'maple-123\')');
    assert.equal(mia.ok, true);
    assert.deepEqual([mia.kid.name, mia.kid.username], ['Mia', 'mia']);
    P.mia = mia.kid.id;
    P.max = rpc(P.ben, 'create_kid(\'Max\', \'max\', \'figcat-99\')').kid.id;
    assert.deepEqual(rpc(P.cal, 'create_kid(\'Zoe\', \'MIA\', \'tigger-55\')'), { ok: false, why: 'taken' });
    P.zoe = rpc(P.cal, 'create_kid(\'Zoe\', \'zoe\', \'tigger-55\')').kid.id;
    assert.deepEqual(rpc(P.ann, 'create_kid(\'\', \'kid\', \'secret1\')'), { ok: false, why: 'name' });
    assert.deepEqual(rpc(P.ann, 'create_kid(\'Kid\', \'a b\', \'secret1\')'), { ok: false, why: 'username' });
    assert.deepEqual(rpc(P.ann, 'create_kid(\'Kid\', \'kid\', \'12345\')'), { ok: false, why: 'password' });
    refused(device(), 'select public.create_kid(\'Kid\', \'kid\', \'secret1\')', /Only a grown-up can add a reader/);
    assert.deepEqual(rpc(P.ann, 'me()').kids.map(k => k.name), ['Mia', 'Max']);
    assert.deepEqual(rpc(P.cal, 'me()').kids.map(k => k.name), ['Zoe']);
    assert.equal(rows('owner', 'select 1 from bookdude.kid_secrets where pass_hash like \'%maple%\'').length, 0, 'passwords are kept as fingerprints');
  });

  test('a reader signs in on a device with her username and password, and then that device is hers', () => {
    P.miaPad = device();
    assert.equal(rpc(P.miaPad, 'me()').kid, null, 'a nameless device is nobody');
    assert.deepEqual(rpc(P.miaPad, 'kid_sign_in(\'mia\', \'wrong-one\')'), { ok: false, why: 'no' });
    assert.deepEqual(rpc(P.miaPad, 'kid_sign_in(\'nobody\', \'maple-123\')'), { ok: false, why: 'no' }, 'an unknown username looks the same');
    const inn = rpc(P.miaPad, 'kid_sign_in(\' Mia \', \'maple-123\')');
    assert.deepEqual(inn, { ok: true, kid: { id: P.mia, name: 'Mia', username: 'mia' } });
    const me = rpc(P.miaPad, 'me()');
    assert.equal(me.kid.id, P.mia);
    assert.equal(me.grownup, null);
    assert.deepEqual(me.kids.map(k => k.name), ['Mia'], 'she sees herself, not her brother');
    assert.equal(me.family.name, 'Home');
    // A grown-up's sign-in is not a reader's device.
    assert.deepEqual(rpc(P.ann, 'kid_sign_in(\'mia\', \'maple-123\')'), { ok: false, why: 'grownup' });
    P.zoePad = device();
    assert.equal(rpc(P.zoePad, 'kid_sign_in(\'zoe\', \'tigger-55\')').ok, true);
    P.maxPad = device();
    assert.equal(rpc(P.maxPad, 'kid_sign_in(\'max\', \'figcat-99\')').ok, true);
  });

  test('five wrong passwords lock the username for 15 minutes, the next five for 30; a grown-up\'s new password clears it', () => {
    const guesser = device();
    for (let i = 0; i < 4; i++) assert.deepEqual(rpc(guesser, 'kid_sign_in(\'max\', \'guess-' + i + '\')'), { ok: false, why: 'no' });
    assert.equal(rpc(guesser, 'kid_sign_in(\'max\', \'guess-4\')').why, 'no');
    const locked = rpc(guesser, 'kid_sign_in(\'max\', \'figcat-99\')');
    assert.equal(locked.why, 'locked', 'even the right password waits');
    let mins = (new Date(locked.until) - Date.now()) / 60000;
    assert.ok(mins > 13 && mins <= 15, 'about 15 minutes: ' + mins);
    // The device already signed in as Max is not affected.
    assert.equal(rpc(P.maxPad, 'me()').kid.id, P.max);
    // Time passes; five more wrong guesses double the wait.
    run('owner', 'update bookdude.kid_secrets set locked_until = now() - interval \'1 second\' where kid_id = ' + lit(P.max));
    for (let i = 0; i < 5; i++) rpc(guesser, 'kid_sign_in(\'max\', \'again-' + i + '\')');
    mins = (new Date(rpc(guesser, 'kid_sign_in(\'max\', \'figcat-99\')').until) - Date.now()) / 60000;
    assert.ok(mins > 28 && mins <= 30, 'about 30 minutes: ' + mins);
    // Only a grown-up in his family can set a new password. It clears the lock and signs his devices out.
    refused(P.cal, 'select public.set_kid_password(' + lit(P.max) + ', \'hacked-1\')', /Only a grown-up in her family/);
    refused(P.maxPad, 'select public.set_kid_password(' + lit(P.max) + ', \'hacked-1\')', /Only a grown-up in her family/);
    assert.deepEqual(rpc(P.ben, 'set_kid_password(' + lit(P.max) + ', \'short\')'), { ok: false, why: 'password' });
    assert.deepEqual(rpc(P.ben, 'set_kid_password(' + lit(P.max) + ', \'newfig-100\')'), { ok: true });
    assert.equal(rpc(P.maxPad, 'me()').kid, null, 'signed out everywhere');
    assert.equal(rpc(P.maxPad, 'kid_sign_in(\'max\', \'figcat-99\')').why, 'no', 'the old password is gone');
    assert.equal(rpc(P.maxPad, 'kid_sign_in(\'max\', \'newfig-100\')').ok, true);
  });

  test('items: a reader\'s device and her family\'s grown-ups can save and read them', () => {
    assert.equal(changed(P.miaPad, item(P.mia, 'record', 'hatchet--gary-paulsen', { status: 'finished', note: 'Secret note about Brian.' }, '2026-11-01T10:00:00Z')), 1);
    assert.equal(changed(P.ann, item(P.mia, 'setting', 'reward', { school: 37.3 }, '2026-11-01T10:00:00Z')), 1);
    assert.equal(changed(P.maxPad, item(P.max, 'record', 'frindle--andrew-clements', { status: 'reading' }, '2026-11-01T10:00:00Z')), 1);
    assert.equal(changed(P.zoePad, item(P.zoe, 'record', 'hatchet--gary-paulsen', { status: 'want' }, '2026-11-01T10:00:00Z')), 1);
    assert.equal(rows(P.miaPad, 'select id from public.items').length, 2, 'Mia\'s device: Mia\'s two');
    assert.equal(rows(P.ann, 'select id from public.items').length, 3, 'her mum: both of her kids');
    assert.equal(rows(P.ben, 'select id from public.items where kid_id = ' + lit(P.mia)).length, 2);
  });

  test('items: another family, a sibling\'s device, a nameless device and a signed-out visitor see none of them and can change none', () => {
    const nameless = device();
    for (const who of [P.cal, P.dee, P.zoePad, nameless]) {
      assert.deepEqual(rows(who, 'select * from public.items where kid_id = ' + lit(P.mia)), [], 'cannot read Mia\'s items');
      assert.deepEqual(rows(who, 'select * from public.items where data::text like \'%Secret note%\''), []);
      refused(who, item(P.mia, 'record', 'planted', { note: 'x' }, '2026-11-02T10:00:00Z'), /row-level security/);
      assert.equal(changed(who, 'update public.items set data = \'{"note":"defaced"}\', client_at = now() where kid_id = ' + lit(P.mia)), 0, 'cannot change them');
      refused(who, upsert(P.mia, 'record', 'hatchet--gary-paulsen', { note: 'defaced' }, '2026-11-03T10:00:00Z'), /row-level security/);
      refused(who, 'delete from public.items where kid_id = ' + lit(P.mia), /permission denied/);
      assert.deepEqual(rows(who, 'select * from public.kids where id = ' + lit(P.mia)), [], 'cannot see that she exists');
      assert.deepEqual(rows(who, 'select * from public.kid_devices where kid_id = ' + lit(P.mia)), []);
    }
    // A reader that doesn't exist is refused the same way, and the attempt leaves nothing behind.
    refused(nameless, item('00000000-0000-4000-8000-000000000000', 'record', 'planted', {}, '2026-11-02T10:00:00Z'), /row-level security/);
    assert.equal(get('owner', 'select bytes from bookdude.usage where kid_id = ' + lit(P.mia)), get('owner', 'select sum(octet_length(data::text)) from public.items where kid_id = ' + lit(P.mia)), 'refused saves were not counted');
    // Her brother's device: same family, still not his to read.
    assert.deepEqual(rows(P.maxPad, 'select * from public.items where kid_id = ' + lit(P.mia)), []);
    refused(P.maxPad, item(P.mia, 'record', 'planted', {}, '2026-11-02T10:00:00Z'), /row-level security/);
    // Nobody can move an item to another reader, or hand their own to someone else's.
    assert.equal(changed(P.zoePad, 'update public.items set kid_id = ' + lit(P.zoe) + ', client_at = now() where kid_id = ' + lit(P.mia)), 0);
    changed(P.zoePad, 'update public.items set kid_id = ' + lit(P.mia) + ', client_at = \'2026-11-04T10:00:00Z\' where kid_id = ' + lit(P.zoe));
    assert.equal(rows('owner', 'select 1 from public.items where kid_id = ' + lit(P.zoe)).length, 1, 'Zoe\'s item stayed Zoe\'s');
    assert.equal(rows('owner', 'select 1 from public.items where kid_id = ' + lit(P.mia)).length, 2);
    assert.equal(get('owner', 'select data ->> \'note\' from public.items where kid_id = ' + lit(P.mia) + ' and id = \'hatchet--gary-paulsen\''), 'Secret note about Brian.');
    refused('anon', 'select * from public.items', /permission denied/);
  });

  test('families, grown-ups, readers and devices can be read by their own family only, and never written from the website', () => {
    assert.deepEqual(rows(P.cal, 'select name from public.families'), [{ name: 'Cousins' }]);
    assert.deepEqual(rows(P.zoePad, 'select name from public.families'), [{ name: 'Cousins' }]);
    assert.deepEqual(rows(P.cal, 'select name from public.grownups order by name'), [{ name: 'Cal' }, { name: 'Dee' }]);
    assert.deepEqual(rows(P.zoePad, 'select name from public.grownups'), [], 'a reader\'s device doesn\'t list grown-ups');
    assert.deepEqual(rows(P.cal, 'select name from public.kids'), [{ name: 'Zoe' }]);
    // The admins run this Book Dude: they can see which families and grown-ups exist (not other families' readers or items).
    assert.deepEqual(rows(P.ann, 'select name from public.families order by name'), [{ name: 'Cousins' }, { name: 'Home' }]);
    assert.equal(rows(P.ann, 'select name from public.grownups').length, 4);
    assert.deepEqual(rows(P.ann, 'select name from public.kids order by name'), [{ name: 'Max' }, { name: 'Mia' }]);
    assert.deepEqual(rows(P.ann, 'select * from public.items where kid_id = ' + lit(P.zoe)), []);
    // Devices: a grown-up sees the devices of their own readers; a device sees only itself.
    assert.equal(rows(P.ann, 'select 1 from public.kid_devices').length, 2);
    assert.equal(rows(P.miaPad, 'select 1 from public.kid_devices').length, 1);
    assert.equal(rows(P.cal, 'select 1 from public.kid_devices').length, 1);
    for (const who of [P.ann, P.cal, P.miaPad]) {
      refused(who, 'insert into public.families (name) values (\'Mine now\')', /permission denied/);
      refused(who, 'update public.families set cobol = true', /permission denied/);
      refused(who, 'update public.grownups set is_admin = true', /permission denied/);
      refused(who, 'insert into public.grownups (user_id, family_id) values (' + lit(who) + ', ' + lit(P.home) + ')', /permission denied/);
      refused(who, 'update public.kids set family_id = ' + lit(P.cousins), /permission denied/);
      refused(who, 'insert into public.kid_devices (user_id, kid_id) values (' + lit(who) + ', ' + lit(P.mia) + ')', /permission denied/);
      refused(who, 'delete from public.kids', /permission denied/);
      refused(who, 'select * from bookdude.kid_secrets', /permission denied/);
      refused(who, 'select * from bookdude.invites', /permission denied/);
      refused(who, 'select bookdude.owner_invite(\'Home\')', /permission denied/);
      refused(who, 'select bookdude.owner_remove_family(\'Home\')', /permission denied/);
      refused(who, 'select bookdude.new_invite(null, \'X\', true, true, null)', /permission denied/);
      refused(who, 'select nextval(\'bookdude.rev\')', /permission denied/);
    }
  });

  test('saving: the newest copy wins, every change gets the next number, and a device can ask for what changed since', () => {
    const rec = () => rows(P.miaPad, 'select data, client_at, deleted, rev from public.items where kind = \'record\' and id = \'hatchet--gary-paulsen\'')[0];
    const first = rec();
    // An older copy (the iPad was offline with a stale one) is quietly skipped.
    assert.equal(changed(P.miaPad, upsert(P.mia, 'record', 'hatchet--gary-paulsen', { status: 'reading' }, '2026-10-30T10:00:00Z')), 0);
    assert.deepEqual(rec(), first);
    // A newer one wins and gets a higher number.
    const seen = get(P.miaPad, 'select max(rev) from public.items');
    assert.equal(changed(P.ann, upsert(P.mia, 'record', 'hatchet--gary-paulsen', { status: 'finished', rating: 5 }, '2026-11-05T10:00:00Z')), 1);
    const second = rec();
    assert.equal(second.data.rating, 5);
    assert.ok(second.rev > seen);
    // Asking for everything since the last number she saw brings back just that change.
    assert.deepEqual(rows(P.miaPad, 'select id from public.items where kid_id = ' + lit(P.mia) + ' and rev > ' + seen + ' order by rev'), [{ id: 'hatchet--gary-paulsen' }]);
    // A device can't pick its own number, and one with a wrong clock can't claim the far future.
    changed(P.miaPad, 'insert into public.items (kid_id, kind, id, data, client_at, rev) values (' + lit(P.mia) + ', \'setting\', \'goals\', \'{}\', \'2099-01-01T00:00:00Z\', 999999999)');
    const goals = rows(P.miaPad, 'select rev, client_at from public.items where id = \'goals\'')[0];
    assert.ok(goals.rev > second.rev && goals.rev < 999999999);
    assert.ok(Math.abs(new Date(goals.client_at) - Date.now()) < 60000, 'the far-future time became now');
    // Removing something she added leaves an empty marker for her other devices.
    changed(P.miaPad, item(P.mia, 'book', 'mine:abc', { title: 'My Own Book' }, '2026-11-05T10:00:00Z'));
    assert.equal(changed(P.miaPad, 'update public.items set deleted = true, data = \'{}\', client_at = \'2026-11-06T10:00:00Z\' where id = \'mine:abc\''), 1);
    assert.deepEqual(rows(P.ann, 'select deleted, data from public.items where id = \'mine:abc\''), [{ deleted: true, data: {} }]);
    refused(P.miaPad, 'insert into public.items (kid_id, kind, id, data, client_at) values (' + lit(P.mia) + ', \'score\', \'x\', \'{}\', now())', /items_kind_check/);
  });

  test('saving: one item can\'t be huge, and one reader can\'t fill the database', () => {
    refused(P.miaPad, item(P.mia, 'record', 'huge', { note: 'x'.repeat(21000) }, '2026-11-05T10:00:00Z'), /items_size/);
    assert.equal(changed(P.miaPad, item(P.mia, 'book', 'mine:photo', { photo: 'x'.repeat(400000) }, '2026-11-05T10:00:00Z')), 1, 'a cover photo fits');
    const used = get('owner', 'select bytes from bookdude.usage where kid_id = ' + lit(P.mia));
    assert.ok(used > 400000 && used < 410000, 'usage is counted: ' + used);
    // Making it smaller gives the room back.
    changed(P.miaPad, 'update public.items set deleted = true, data = \'{}\', client_at = \'2026-11-07T10:00:00Z\' where id = \'mine:photo\'');
    assert.ok(get('owner', 'select bytes from bookdude.usage where kid_id = ' + lit(P.mia)) < 5000);
    run('owner', 'update bookdude.usage set bytes = 39999990 where kid_id = ' + lit(P.mia));
    refused(P.miaPad, item(P.mia, 'record', 'one-too-many', { note: 'This is the straw.' }, '2026-11-05T10:00:00Z'), /storage is full/);
    assert.equal(changed(P.zoePad, item(P.zoe, 'record', 'frindle--andrew-clements', { status: 'reading' }, '2026-11-05T10:00:00Z')), 1, 'other readers are not affected');
    run('owner', 'update bookdude.usage set bytes = 1000 where kid_id = ' + lit(P.mia));
  });

  test('a device\'s nameless sign-in can never turn into an email account (a way around the invite code)', () => {
    const d = device();
    refused('auth', 'update auth.users set email = \'squatter@example.com\', is_anonymous = false where id = ' + lit(d), /cannot become an account/);
    refused('auth', 'update auth.users set email = \'squatter@example.com\' where id = ' + lit(d), /cannot become an account/);
    refused('auth', 'update auth.users set is_anonymous = false where id = ' + lit(d), /cannot become an account/);
    refused('auth', 'update auth.users set phone = \'+15550100\' where id = ' + lit(d), /cannot become an account/);
    // Everything else about a device, and everything about a grown-up, updates as usual.
    assert.equal(changed('auth', 'update auth.users set raw_user_meta_data = \'{"seen":1}\' where id = ' + lit(d)), 1);
    assert.equal(changed('auth', 'update auth.users set email = \'ann.new@example.com\', encrypted_password = \'x\' where id = ' + lit(P.ann)), 1);
  });

  test('a lost iPad: a grown-up signs the reader out everywhere; signing out on a device only affects that device', () => {
    const second = device();
    assert.equal(rpc(second, 'kid_sign_in(\'mia\', \'maple-123\')').ok, true);
    assert.deepEqual(rpc(second, 'kid_sign_out()'), { ok: true });
    assert.equal(rpc(second, 'me()').kid, null);
    assert.deepEqual(rows(second, 'select * from public.items'), []);
    assert.equal(rpc(P.miaPad, 'me()').kid.id, P.mia, 'her iPad is still signed in');
    refused(P.cal, 'select public.sign_out_kid(' + lit(P.mia) + ')', /Only a grown-up in her family/);
    assert.deepEqual(rpc(P.ben, 'sign_out_kid(' + lit(P.mia) + ')'), { ok: true });
    assert.equal(rpc(P.miaPad, 'me()').kid, null);
    assert.deepEqual(rows(P.miaPad, 'select * from public.items'), [], 'a signed-out device reads nothing');
    assert.equal(rpc(P.miaPad, 'kid_sign_in(\'mia\', \'maple-123\')').ok, true, 'her password still works');
    // Ten devices at most: the oldest sign-in falls off.
    run('owner', 'update public.kid_devices set created_at = now() - interval \'1 day\' where user_id = ' + lit(P.miaPad));
    for (let i = 0; i < 10; i++) assert.equal(rpc(device(), 'kid_sign_in(\'mia\', \'maple-123\')').ok, true);
    assert.equal(rows('owner', 'select 1 from public.kid_devices where kid_id = ' + lit(P.mia)).length, 10);
    assert.equal(rpc(P.miaPad, 'me()').kid, null, 'the oldest one was signed out');
    assert.equal(rpc(P.miaPad, 'kid_sign_in(\'mia\', \'maple-123\')').ok, true);
  });

  test('a grown-up who forgot their password: an admin resets them, and they sign up again into the same family with nothing lost', () => {
    refused(P.cal, 'select public.reset_grownup(' + lit(P.dee) + ')', /Only an admin can reset/);
    assert.deepEqual(rpc(P.ann, 'reset_grownup(' + lit(P.ann) + ')'), { ok: false, why: 'self' });
    assert.deepEqual(rpc(P.ann, 'reset_grownup(' + lit(P.miaPad) + ')'), { ok: false, why: 'who' }, 'only grown-ups, never a device');
    const reset = rpc(P.ann, 'reset_grownup(' + lit(P.cal) + ')');
    assert.equal(reset.ok, true);
    assert.equal(rows('owner', 'select 1 from auth.users where email = \'cal@example.com\'').length, 0, 'the old sign-in is gone');
    assert.equal(rpc(P.cal, 'me()').grownup, null, 'and it opens nothing any more');
    assert.deepEqual(rows(P.cal, 'select * from public.items'), []);
    assert.equal(rows('owner', 'select 1 from public.items where kid_id = ' + lit(P.zoe)).length, 2, 'the family\'s reader and her items are untouched');
    P.cal = signup('cal@example.com', reset.code, 'Cal').id;
    const cal = rpc(P.cal, 'me()');
    assert.deepEqual([cal.family.id, cal.grownup.admin, cal.kids.map(k => k.name)], [P.cousins, false, ['Zoe']]);
    // Resetting an admin keeps them an admin.
    P.ben = signup('ben@example.com', rpc(P.ann, 'reset_grownup(' + lit(P.ben) + ')').code, 'Ben').id;
    assert.deepEqual(rpc(P.ben, 'me()').grownup, { name: 'Ben', admin: true });
  });

  test('the daily check-in tidies up nameless devices that never became a reader, and nothing else', () => {
    const stale = device(), fresh = device();
    run('owner', 'update auth.users set created_at = now() - interval \'8 days\' where id in (' + [stale, P.miaPad, P.ann].map(lit).join(', ') + ')');
    run('owner', 'update bookdude.meta set at = now() - interval \'21 hours\' where key = \'tidied\'');
    assert.deepEqual(rpc('anon', 'ping()'), { ok: true, schema: 2 });
    const left = id => rows('owner', 'select 1 from auth.users where id = ' + lit(id)).length;
    assert.deepEqual([left(stale), left(fresh), left(P.miaPad), left(P.ann)], [0, 1, 1, 1]);
    // It tidies once a day, not on every call.
    const again = device();
    run('owner', 'update auth.users set created_at = now() - interval \'8 days\' where id = ' + lit(again));
    rpc('anon', 'ping()');
    assert.equal(left(again), 1);
  });

  test('the owner can make a family whose grown-up is not an admin, and remove a whole family, from the SQL Editor only', () => {
    const code = get('owner', 'bookdude.owner_invite(\'Try-out\', false, false)');
    const tess = signup('tess@example.com', code, 'Tess').id;
    assert.deepEqual(rpc(tess, 'me()').grownup, { name: 'Tess', admin: false });
    const kid = rpc(tess, 'create_kid(\'Tia\', \'tia\', \'pepper-77\')').kid.id;
    const pad = device();
    assert.equal(rpc(pad, 'kid_sign_in(\'tia\', \'pepper-77\')').ok, true);
    changed(pad, item(kid, 'record', 'hatchet--gary-paulsen', { status: 'reading' }, '2026-11-01T10:00:00Z'));
    assert.equal(get('owner', 'bookdude.owner_remove_family(\'Nobody\')'), 'No family is called that. Nothing was removed.');
    const before = rows('owner', 'select 1 from public.items').length;
    assert.equal(get('owner', 'bookdude.owner_remove_family(\' Try-out \')'), 'Removed.');
    assert.equal(rows('owner', 'select 1 from public.families where name = \'Try-out\'').length, 0);
    assert.equal(rows('owner', 'select 1 from auth.users where id in (' + lit(tess) + ', ' + lit(pad) + ')').length, 0, 'its sign-ins are gone');
    assert.equal(rows('owner', 'select 1 from public.kids where id = ' + lit(kid)).length, 0);
    assert.equal(rows('owner', 'select 1 from public.items').length, before - 1, 'only that family\'s items went');
    assert.equal(rows('owner', 'select 1 from public.families').length, 2, 'the other families are untouched');
    assert.equal(rpc(tess, 'me()').grownup, null);
  });

  test('removing an account never removes a family\'s data: a deleted device just signs out, a deleted grown-up leaves the readers', () => {
    run('owner', 'delete from auth.users where id = ' + lit(P.zoePad));
    assert.equal(rows('owner', 'select 1 from public.kid_devices where user_id = ' + lit(P.zoePad)).length, 0);
    run('owner', 'delete from auth.users where id = ' + lit(P.dee));
    assert.equal(rows('owner', 'select 1 from public.kids where family_id = ' + lit(P.cousins)).length, 1);
    assert.equal(rows('owner', 'select 1 from public.items where kid_id = ' + lit(P.zoe)).length, 2);
  });
}
