/* The family account: who is signed in on this device, signing in and out, and asking the account's API (Supabase).
 * Nothing here touches her books; sync.js moves those. No library: the API is plain HTTPS.
 *
 * A grown-up signs in with an email and password (and signs up with a one-time invite code). A reader has no email:
 * her device first gets a nameless sign-in of its own, which can see nothing, and then she types the username and
 * password her grown-up set, which makes that device hers. The sign-in is remembered on this device until someone
 * signs out or a grown-up signs her out everywhere. */

import { UI_KEY } from './util.js';
import { CLOUD } from './config.js';

const KEY = UI_KEY + ':account';
// A nameless device sign-in that hasn't become a reader yet (a wrong password): kept so trying again reuses it.
const DEVICE_KEY = UI_KEY + ':device';
// What to say once after this device was signed out from somewhere else.
const NOTICE_KEY = UI_KEY + ':account-notice';

const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) { return false; }
};
const okAccount = a => (a && typeof a === 'object' && a.session && typeof a.session.refresh === 'string' && (a.role === 'reader' || a.role === 'grownup') ? a : null);

let cached;
/** Who is signed in on this device: { session, role: 'reader' | 'grownup', me, kid }, or null. */
export function account() {
  if (cached === undefined) cached = okAccount(read(KEY));
  return cached;
}
function store(a) {
  cached = a;
  return write(KEY, a);
}

/** The reader whose books this device is showing: the reader signed in here, or the one a grown-up opened. '' for the device's own books. */
export function activeKid() {
  const a = account();
  return a && typeof a.kid === 'string' && /^[0-9a-f-]{36}$/.test(a.kid) ? a.kid : '';
}
/** Her first name, as her grown-up typed it. */
export function activeKidName() {
  const a = account(), id = activeKid();
  if (!a || !id || !a.me) return '';
  const k = a.me.kid && a.me.kid.id === id ? a.me.kid : (a.me.kids || []).find(x => x.id === id);
  return k ? String(k.name || '') : '';
}
export const isGrownup = () => { const a = account(); return !!(a && a.role === 'grownup'); };

export function takeNotice() {
  const n = read(NOTICE_KEY);
  if (n) write(NOTICE_KEY, null);
  return typeof n === 'string' ? n : '';
}
export const leaveNotice = text => write(NOTICE_KEY, text);

// One request to the account. status 0 means it never got there (offline, or it took too long).
async function http(method, path, opts) {
  const o = opts || {};
  const headers = { apikey: CLOUD.key };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.token) headers.Authorization = 'Bearer ' + o.token;
  if (o.prefer) headers.Prefer = o.prefer;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 25000);
  let res;
  try {
    res = await fetch(CLOUD.url + path, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), signal: stop.signal });
  } catch (e) {
    return { status: 0, json: null };
  } finally {
    clearTimeout(timer);
  }
  let json = null;
  try { json = await res.json(); } catch (e) { /* no body, or not JSON */ }
  return { status: res.status, json };
}

// Whether an answer really came from the account (it always answers in JSON), not from something in between.
const said = r => !!r.json && typeof r.json === 'object';
const sessionFrom = j => ({ access: j.access_token, refresh: j.refresh_token, expires: Date.now() + (Number(j.expires_in) || 3600) * 1000, user: (j.user && j.user.id) || '' });
const fresh = s => s && s.expires - Date.now() > 60000;

// Renews the sign-in when it is about to run out. One at a time, across every open copy of the app: each renewal
// replaces the last, so two at once would cancel each other. 'ok', 'gone' (signed out for good) or 'offline'.
let renewing = null;
function renew(force) {
  if (renewing) return renewing;
  const work = async () => {
    const a = okAccount(read(KEY));
    cached = a;
    if (!a) return 'gone';
    if (!force && fresh(a.session)) return 'ok';
    const r = await http('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: a.session.refresh } });
    if (r.status === 200 && r.json && r.json.access_token) {
      a.session = sessionFrom(r.json);
      store(a);
      return 'ok';
    }
    // Only the account's own "no" counts as signed out. Anything else (a hotel Wi-Fi page, a busy server) is just
    // "not now": this device keeps its sign-in and tries again later.
    return said(r) && (r.status === 400 || r.status === 401 || r.status === 403) ? 'gone' : 'offline';
  };
  const locked = navigator.locks && navigator.locks.request ? navigator.locks.request(KEY, work) : work();
  renewing = Promise.resolve(locked).finally(() => { renewing = null; });
  return renewing;
}

/**
 * Asks the account something as whoever is signed in. Returns { status, json }, with status 0 when the account
 * can't be reached, and `gone: true` when this device isn't signed in any more (signed out somewhere else).
 */
export async function call(method, path, opts) {
  if (!account()) return { status: 401, json: null, gone: true };
  for (let attempt = 0; attempt < 2; attempt++) {
    const state = await renew(attempt > 0);
    if (state === 'gone') return { status: 401, json: null, gone: true };
    if (state === 'offline') return { status: 0, json: null };
    const r = await http(method, path, Object.assign({}, opts, { token: account().session.access }));
    if (r.status !== 401 || !said(r)) return r;
  }
  return { status: 401, json: null, gone: true };
}
export const rpc = (name, args) => call('POST', '/rest/v1/rpc/' + name, { body: args || {} });

/**
 * Asks the account who this sign-in is, and keeps the answer. 'ok', 'offline', or 'revoked' when the account no
 * longer knows this device as a reader's (a grown-up signed her out everywhere) or this grown-up as anyone's.
 */
export async function refreshMe() {
  const r = await rpc('me');
  if (r.gone) return 'revoked';
  if (r.status !== 200 || !r.json) return 'offline';
  const a = account();
  if (!a) return 'revoked';
  const me = r.json;
  if (a.role === 'reader' ? !(me.kid && me.kid.id === a.kid) : !me.grownup) return 'revoked';
  a.me = me;
  if (a.role === 'grownup' && a.kid && !(me.kids || []).some(k => k.id === a.kid)) a.kid = null;
  store(a);
  return 'ok';
}

const whyNot = r => (r.status === 0 ? 'offline' : r.status === 429 ? 'slow' : 'setup');

/** A reader signs in on this device. { ok } or { ok: false, why: 'no' | 'locked' | 'offline' | 'slow' | 'setup' | 'storage', until }. */
export async function readerSignIn(username, password) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let device = read(DEVICE_KEY);
    if (!device || !fresh(device)) {
      const made = await http('POST', '/auth/v1/signup', { body: { data: {} } });
      if (made.status !== 200 || !made.json || !made.json.access_token) return { ok: false, why: whyNot(made) };
      device = sessionFrom(made.json);
      write(DEVICE_KEY, device);
    }
    const r = await http('POST', '/rest/v1/rpc/kid_sign_in', { token: device.access, body: { username, password } });
    if (r.status === 401 && attempt === 0) { write(DEVICE_KEY, null); continue; }
    if (r.status !== 200 || !r.json) return { ok: false, why: whyNot(r) };
    if (!r.json.ok) return { ok: false, why: r.json.why === 'locked' ? 'locked' : 'no', until: r.json.until };
    const me = await http('POST', '/rest/v1/rpc/me', { token: device.access, body: {} });
    if (me.status !== 200 || !me.json || !me.json.kid) return { ok: false, why: whyNot(me) };
    if (!store({ session: device, role: 'reader', me: me.json, kid: me.json.kid.id })) return { ok: false, why: 'storage' };
    write(DEVICE_KEY, null);
    return { ok: true };
  }
  return { ok: false, why: 'setup' };
}

async function seat(session) {
  const me = await http('POST', '/rest/v1/rpc/me', { token: session.access, body: {} });
  if (me.status !== 200 || !me.json) return { ok: false, why: whyNot(me) };
  if (!me.json.grownup) {
    http('POST', '/auth/v1/logout?scope=local', { token: session.access });
    return { ok: false, why: 'nofamily' };
  }
  const first = (me.json.kids || [])[0];
  if (!store({ session, role: 'grownup', me: me.json, kid: first ? first.id : null })) return { ok: false, why: 'storage' };
  return { ok: true };
}

/** A grown-up signs in. { ok } or { ok: false, why: 'no' | 'nofamily' | 'offline' | 'slow' | 'setup' | 'storage' }. */
export async function grownupSignIn(email, password) {
  const r = await http('POST', '/auth/v1/token?grant_type=password', { body: { email, password } });
  if (r.status === 400 || r.status === 401 || r.status === 422) return { ok: false, why: 'no' };
  if (r.status !== 200 || !r.json || !r.json.access_token) return { ok: false, why: whyNot(r) };
  return seat(sessionFrom(r.json));
}

/** A grown-up signs up with an invite code. why can also be 'code' (not good), 'exists', 'weak', 'email' or 'confirm'. */
export async function grownupSignUp(name, email, password, code) {
  const good = await http('POST', '/rest/v1/rpc/invite_ok', { body: { code } });
  if (good.status !== 200) return { ok: false, why: whyNot(good) };
  if (good.json !== true) return { ok: false, why: 'code' };
  const r = await http('POST', '/auth/v1/signup', { body: { email, password, data: { invite: code, name } } });
  const text = JSON.stringify(r.json || {});
  if (r.status === 200 && r.json && r.json.access_token) return seat(sessionFrom(r.json));
  if (r.status === 200) return { ok: false, why: 'confirm' };
  if (/already.registered|user_already_exists|email_exists/i.test(text)) return { ok: false, why: 'exists' };
  if (/weak_password|password should/i.test(text)) return { ok: false, why: 'weak' };
  if (/email_address_invalid|validation_failed|invalid.*email|email.*invalid/i.test(text)) return { ok: false, why: 'email' };
  // The code was good a moment ago: someone else used it in between.
  if (r.status === 500) return { ok: false, why: 'code' };
  return { ok: false, why: whyNot(r) };
}

/** Signs this device out of the account (the books it was showing are cleared by the caller). */
export async function signOut() {
  const a = account();
  if (a) {
    if (a.role === 'reader') await rpc('kid_sign_out');
    const state = await renew(false);
    if (state === 'ok') await http('POST', '/auth/v1/logout?scope=local', { token: account().session.access });
  }
  store(null);
  write(DEVICE_KEY, null);
}
/** Forgets the sign-in without asking the account (it already said this device is signed out). */
export function forget() {
  store(null);
  write(DEVICE_KEY, null);
}

/** A grown-up opens one of the family's readers on this device ('' goes back to the device's own books). */
export function openKid(id) {
  const a = account();
  if (!a || a.role !== 'grownup') return false;
  a.kid = id && (a.me.kids || []).some(k => k.id === id) ? id : null;
  return store(a);
}

// What a grown-up can do for the family. Each answers { ok, ... }, or { ok: false, why } with 'offline', 'denied' or the account's own reason.
async function ask(name, args) {
  const r = await rpc(name, args);
  if (r.status === 200 && r.json) return r.json;
  return { ok: false, why: r.status === 0 ? 'offline' : r.status === 403 || r.gone ? 'denied' : 'setup' };
}
export const createKid = (name, username, password) => ask('create_kid', { name, username, password });
export const setKidPassword = (kid, password) => ask('set_kid_password', { kid, password });
export const signOutKid = kid => ask('sign_out_kid', { kid });
export const createInvite = (newFamily, admin) => ask('create_invite', newFamily ? { new_family: newFamily } : { admin: !!admin });
