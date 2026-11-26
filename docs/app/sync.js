/* Saving a reader's books to her family's account, and bringing changes back from it.
 *
 * The device is always the working copy: every change is saved here first (state.js), so the app works offline and
 * never waits for the internet. While this device is showing a reader from a family account, each change also joins
 * a waiting list (the "outbox"), and this file sends the list up and asks the account for anything newer:
 *   down  everything the account changed since this device last looked (each change there has a number that only
 *         goes up), taken unless this device has a newer change of its own to the same thing still waiting.
 *   up    the waiting changes, a batch at a time. The account keeps whichever copy of a thing was saved last.
 * Game scores are the exception to "newest wins": two sets are always put together, the best of each level.
 * It runs when the app opens, a moment after any change, when the app comes back to the front, and when the internet
 * returns. Once a week it reads everything again, in case a change slipped past. */

import { C, plural } from './util.js';
import { rebuildBooks } from './books.js';
import { state, db, onLocalChange, takeSettings, leaveAccount, saveSetting } from './state.js';
import { sheet, confirmBox } from './page.js';
import { activeKid, call, refreshMe, account } from './cloud.js';
import { render } from './tabs.js';
import { applyAccent } from './more.js';
import { syncSchool } from './school.js';
import { mirrorArcade, mirrorSpelling } from './games.js';

const KID = activeKid();
const PAGE = 500;
// One batch going up: at most this many things and about this many bytes (a cover photo can be 400 KB on its own).
const BATCH = 100;
const BATCH_BYTES = 600000;
const FULL_EVERY = 7 * 864e5;

// How saving is going: 'off' (not showing a reader from an account), 'idle', 'busy' or 'offline'.
export const sync = { state: KID ? 'idle' : 'off', pending: 0, skipped: 0, at: 0 };
let rev = 0;
let fullAt = '';
let quiet = false;
let running = null;
let again = false;
let timer = 0;

// The line on the More tab that says how saving is going.
export function syncLine() {
  if (sync.state === 'off') return '';
  const waiting = sync.pending ? plural(sync.pending, 'change is', 'changes are') + ' waiting to be saved to the family account.' : '';
  const skipped = sync.skipped ? ' ' + plural(sync.skipped, 'thing') + ' could not be saved to the account.' : '';
  if (sync.state === 'busy') return 'Saving to the family account…';
  if (sync.state === 'offline') return 'Can’t reach the family account right now. ' + (waiting || 'Nothing is waiting.') + ' Everything is still saved on this device.' + skipped;
  return (waiting || 'Everything is saved to the family account.') + skipped;
}
function paint() {
  const el = document.getElementById('sync-status');
  if (el) el.textContent = syncLine();
}
function setState(next) {
  sync.state = next;
  paint();
}

// A reader's page changed underneath: redraw it, or wait until the open book or box closes.
function redraw() {
  if (quiet) return;
  if (sheet.open || confirmBox.open) { state.dirty = true; return; }
  render(true);
}

const valueOf = e => (e.gone ? null : e.kind === 'record' ? state.records[e.id] : e.kind === 'book' ? state.custom[e.id] : state.settings[e.id]);

// 'ok', 'offline' (try again later), or 'out' (this device is not signed in as this reader any more).
function verdict(r) {
  if (r.gone || r.status === 401 || r.status === 403) return 'out';
  if (r.status === 0 || r.status === 429 || r.status >= 500) return 'offline';
  return 'ok';
}

async function push() {
  const entries = await db.outbox();
  sync.pending = entries.length;
  paint();
  let batch = [], bytes = 0;
  const batches = [];
  for (const e of entries) {
    const row = Object.assign({ kid_id: KID }, C.cloudRow(e.kind, e.id, valueOf(e), e.at));
    const size = JSON.stringify(row).length;
    if (batch.length && (batch.length >= BATCH || bytes + size > BATCH_BYTES)) { batches.push(batch); batch = []; bytes = 0; }
    batch.push({ entry: e, row });
    bytes += size;
  }
  if (batch.length) batches.push(batch);
  const send = items => call('POST', '/rest/v1/items?on_conflict=kid_id,kind,id', { body: items.map(x => x.row), prefer: 'resolution=merge-duplicates,return=minimal' });
  const done = async items => {
    await db.settle(items.map(x => x.entry));
    sync.pending = Math.max(0, sync.pending - items.length);
    paint();
  };
  for (const items of batches) {
    const r = await send(items);
    if (r.status >= 200 && r.status < 300) { await done(items); continue; }
    if (verdict(r) !== 'ok') return verdict(r);
    // Something in this batch can't be saved (too big for the account, say). Send them one at a time: the ones that
    // can go do, and the one that can't stops waiting so it doesn't hold up everything behind it.
    for (const one of items) {
      const single = items.length === 1 ? r : await send([one]);
      if (!(single.status >= 200 && single.status < 300)) {
        if (verdict(single) !== 'ok') return verdict(single);
        sync.skipped++;
        console.error('Book Dude: could not save ' + one.entry.key + ' to the account (' + single.status + ').');
      }
      await done([one]);
    }
  }
  return 'ok';
}

// Takes one page of rows from the account into this device. Returns whether anything here changed.
async function take(rows, last, markFull) {
  const waiting = new Map((await db.outbox()).map(e => [e.key, e.at]));
  const put = { records: [], dropRecords: [], books: [], dropBooks: [], settings: {}, dropOutbox: [], rev: last, fullAt: markFull };
  let books = false, settings = false, any = false, better = null, betterSpell = null;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  for (const row of rows) {
    const v = C.cloudValue(row);
    if (!v) continue;
    const key = v.kind + ':' + v.id;
    // Game scores are never "newest wins": the account's and this device's are put together, the best of each level.
    // If that is better than what the account has, it goes back up.
    if (key === 'setting:arcade') {
      const best = C.arcadeBest(state.settings.arcade, v.value);
      if (!same(best, state.settings.arcade)) { put.settings.arcade = best; settings = any = true; }
      if (!same(best, v.value)) better = best;
      continue;
    }
    // Spelling too: what pays is never lost, so the two copies are put together, and the result goes back up if it has more.
    if (key === 'setting:spelling') {
      const both = C.spellMerge(state.settings.spelling, v.value);
      if (!same(both, C.spelling(state.settings.spelling))) { put.settings.spelling = both; settings = any = true; }
      if (!same(both, C.spelling(v.value))) betterSpell = both;
      continue;
    }
    if (!C.cloudWins(row.client_at, waiting.get(key))) continue;
    if (waiting.has(key)) put.dropOutbox.push(key);
    if (v.kind === 'record') {
      if (v.value === null) {
        if (state.records[v.id]) { delete state.records[v.id]; put.dropRecords.push(v.id); any = true; }
      } else if (!same(state.records[v.id], v.value)) { state.records[v.id] = v.value; put.records.push(v.value); any = true; }
    } else if (v.kind === 'book') {
      if (v.value === null) {
        if (state.custom[v.id]) { delete state.custom[v.id]; put.dropBooks.push(v.id); books = any = true; }
      } else if (!same(state.custom[v.id], v.value)) { state.custom[v.id] = v.value; put.books.push(v.value); books = any = true; }
    } else if (!same(state.settings[v.id], v.value)) { put.settings[v.id] = v.value; settings = any = true; }
  }
  await db.applyRemote(put);
  rev = last;
  if (markFull) fullAt = markFull;
  if (settings) {
    takeSettings(put.settings);
    applyAccent();
    // A school quiz link that just arrived (a grown-up pasted it on another device) is used right away.
    if (put.settings.schoolLink && !quiet) syncSchool(true);
    // Game scores from her other devices: put together with this device's, and handed to the games here.
    if (put.settings.arcade && !quiet) mirrorArcade();
    if (put.settings.spelling && !quiet) mirrorSpelling();
  }
  if (books) rebuildBooks(state.custom);
  if (better) await saveSetting('arcade', better);
  if (betterSpell) await saveSetting('spelling', betterSpell);
  return any;
}

async function pull() {
  const full = !fullAt || Date.now() - Date.parse(fullAt) > FULL_EVERY;
  let cursor = full ? 0 : rev;
  let any = false;
  for (;;) {
    const r = await call('GET', '/rest/v1/items?select=kind,id,data,client_at,deleted,rev&kid_id=eq.' + KID + '&rev=gt.' + cursor + '&order=rev.asc&limit=' + PAGE);
    if (r.status !== 200 || !Array.isArray(r.json)) return verdict(r) === 'ok' ? 'offline' : verdict(r);
    const rows = r.json;
    const end = rows.length < PAGE;
    const last = rows.length ? Number(rows[rows.length - 1].rev) || cursor : cursor;
    // The first look and the weekly one finish by remembering when, so the next looks only ask for what's new.
    if (rows.length || (full && end)) any = (await take(rows, Math.max(last, full ? 0 : rev), full && end ? new Date().toISOString() : '')) || any;
    cursor = last;
    if (end) break;
  }
  if (any) redraw();
  return 'ok';
}

// Asks the account whether this device is still signed in as this reader. If not (a grown-up signed her out
// everywhere, or the sign-in is gone), her copy here is removed and the device goes back to its own books. The
// account never says "no" to a look: it just shows nothing, so this is the only way to find out. true when it is over.
let checkedAt = 0;
async function stillHers(force) {
  if (!force && Date.now() - checkedAt < 10 * 60000) return false;
  const who = await refreshMe();
  if (who === 'revoked') { await leaveAccount('This device was signed out of the family account.'); return true; }
  if (who === 'ok') {
    checkedAt = Date.now();
    // A grown-up's reader who is no longer in the family: back to the device's own books.
    if (activeKid() !== KID) { location.reload(); return true; }
  }
  return false;
}

async function round(check) {
  setState('busy');
  if (await stillHers(check)) return;
  // Down first, then up: what her other devices saved is taken in (and game scores put together) before this device
  // sends its own, so nothing here is sent over the top of something newer or better.
  let result = await pull();
  if (result === 'ok') result = await push();
  if (result === 'out') {
    if (await stillHers(true)) return;
    result = 'offline';
  }
  sync.at = Date.now();
  setState(result === 'ok' ? 'idle' : 'offline');
}

/**
 * Saves what is waiting and fetches what is new, now. One at a time: a call during a round asks for another after it.
 * `check` also asks the account, first, whether this device is still signed in as this reader (when the app opens or
 * comes back to the front, and when someone taps Save now); otherwise that is asked every ten minutes.
 */
export function syncNow(check) {
  if (!KID) return Promise.resolve();
  if (running) { again = true; return running; }
  clearTimeout(timer);
  running = round(check === true).catch(e => { console.error('Book Dude: saving to the account failed.', e); setState('offline'); }).finally(() => {
    running = null;
    if (again) { again = false; syncSoon(); }
  });
  return running;
}
export function syncSoon(ms) {
  if (!KID) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(), ms === undefined ? 1500 : ms);
}

/**
 * The first time a reader is opened on this device: everything she has in the account comes down before the app
 * starts, so nothing here is made up fresh and sent over the top of what she already has. 'ok', 'offline' or 'out'.
 */
export async function firstPull() {
  quiet = true;
  try {
    const who = await refreshMe();
    if (who !== 'ok') return who === 'revoked' ? 'out' : 'offline';
    checkedAt = Date.now();
    return await pull();
  } finally {
    quiet = false;
  }
}

/** Starts saving for the reader on screen. `saved` is what this device remembers about how far it has read. */
export function startSync(saved) {
  if (!KID) return;
  rev = Number(saved.syncRev) || 0;
  fullAt = typeof saved.syncFullAt === 'string' ? saved.syncFullAt : '';
  onLocalChange(() => { sync.pending++; paint(); syncSoon(); });
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - sync.at > 20000) syncNow(true);
  });
  // While the app is on screen, a look every 30 seconds: a screen-time clock started on another phone shows up here.
  setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine !== false && Date.now() - sync.at > 25000) syncNow();
  }, 30000);
  // What changed underneath while a box was open is drawn when it closes (an open book does the same in events.js).
  confirmBox.addEventListener('close', () => {
    if (state.dirty && !sheet.open) { state.dirty = false; render(true); }
  });
  syncNow(true);
}

/** With a grown-up signed in but no reader on screen there is nothing to save: just check the sign-in still stands. */
export async function checkAccount() {
  if (!account() || KID) return;
  if ((await refreshMe()) === 'revoked') await leaveAccount('This device was signed out of the family account.');
}
