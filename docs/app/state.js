/* What the app holds while it runs, the screen choices remembered between visits,
 * and saving her journal on this device (IndexedDB). */

import { C, BASE, UI_KEY, thisYear } from './util.js';
import { SORTS } from './books.js';
import { toast } from './page.js';
import { activeKid, forget, leaveNotice } from './cloud.js';

// The reader whose books this device is showing (signed in to a family account), or '' for the device's own books.
// Each reader has her own database on the device, so signing in never mixes her books with the device's or a sibling's.
const KID = activeKid();
const KID_PREFIX = 'reading-room:' + BASE + 'kid:';
const DB_NAME = KID ? KID_PREFIX + KID : 'reading-room:' + BASE;
const PROFILES_KEY = UI_KEY + ':profiles';
export const PAGE = 60;

export const DEFAULT_FILTERS = { collection: '', level: '', points: '', interest: '', ages: '', genre: '', hideFinished: false };
export const state = {
  tab: 'explore',
  query: '',
  filters: Object.assign({}, DEFAULT_FILTERS),
  filtersOpen: false,
  sort: 'award-new',
  layout: 'grid',
  shelf: 'reading',
  shelfSort: 'points-new',
  period: thisYear(),
  limit: PAGE,
  records: {},
  custom: {},
  settings: { goals: {}, readerName: '', accent: 'leather', lastExportAt: '', storySeen: false, reward: C.reward({}), pets: true, schoolLink: '', schoolSeen: [], dudeChat: true, reportAt: '', thinkReplies: {} },
  dudeLine: null,
  dudePs: '',
  offline: 'checking',
  covers: null,
  persisted: null,
  storage: 'loading',
  installTipDismissed: false,
  openId: null,
  scroll: {},
  dirty: false
};

export function loadUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
    if (saved.filters && typeof saved.filters === 'object') {
      for (const k of Object.keys(DEFAULT_FILTERS)) if (typeof saved.filters[k] === typeof DEFAULT_FILTERS[k]) state.filters[k] = saved.filters[k];
    }
    if (SORTS[saved.sort]) state.sort = saved.sort;
    if (saved.layout === 'list' || saved.layout === 'grid') state.layout = saved.layout;
    if (['reading', 'want', 'finished', 'paused', 'favorites', 'mine'].includes(saved.shelf)) state.shelf = saved.shelf;
    if (['points-new', 'points-most', 'title'].includes(saved.shelfSort)) state.shelfSort = saved.shelfSort;
    if (saved.period === 'all' || /^\d{4}$/.test(saved.period || '')) state.period = saved.period;
    state.installTipDismissed = saved.installTipDismissed === true;
  } catch (e) { /* storage unavailable: defaults are fine */ }
}
export function saveUi() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({
      filters: state.filters, sort: state.sort, layout: state.layout, shelf: state.shelf, shelfSort: state.shelfSort, period: state.period, installTipDismissed: state.installTipDismissed
    }));
  } catch (e) { /* ignore */ }
}

// sync.js asks to hear about every change saved here that should go up to the account.
let changed = () => {};
export function onLocalChange(fn) { changed = fn; }

export const db = (() => {
  let opening = null;
  let useMemory = false;
  function open() {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('IndexedDB is not available')); return; }
        // Version 2 added the "books" store for books the reader adds herself. Version 3 added "outbox": the changes
        // still waiting to be saved to a family account (only used while signed in).
        const req = indexedDB.open(DB_NAME, 3);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
          if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'key' });
        };
        req.onsuccess = () => {
          const d = req.result;
          // Let a newer version of the app upgrade the database after an update (and let signing out remove it).
          d.onversionchange = () => d.close();
          resolve(d);
        };
        req.onerror = () => reject(req.error);
      });
    }
    return opening;
  }
  // One save over the stores named: all of it happens or none of it. fn gets a function that hands out each store.
  function tx(stores, mode, fn) {
    return open().then(d => new Promise((resolve, reject) => {
      const t = d.transaction(stores, mode);
      const result = fn(name => t.objectStore(name));
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Save was cancelled'));
    }));
  }
  const run = (store, mode, fn) => (useMemory ? Promise.resolve(fn(null)) : tx([store], mode, s => fn(s(store))));
  // A change that should go up to the account: which thing, and when this device saved it.
  const note = (box, kind, id, at, gone) => box.put({ key: kind + ':' + id, kind, id, at, gone: !!gone });
  const stamp = () => new Date().toISOString();
  return {
    async load() {
      try {
        const [records, books, keys, values] = await Promise.all([
          run('records', 'readonly', s => s.getAll()),
          run('books', 'readonly', s => s.getAll()),
          run('settings', 'readonly', s => s.getAllKeys()),
          run('settings', 'readonly', s => s.getAll())
        ]);
        const settings = {};
        keys.forEach((k, i) => { settings[k] = values[i]; });
        if (KID) {
          try {
            const seen = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
            if (!seen.includes(DB_NAME)) localStorage.setItem(PROFILES_KEY, JSON.stringify(seen.concat(DB_NAME)));
          } catch (e) { /* the list is a convenience: signing out also looks for the databases themselves */ }
        }
        return { records, books, settings, ok: true };
      } catch (e) {
        useMemory = true;
        return { records: [], books: [], settings: {}, ok: false };
      }
    },
    // In memory mode (storage blocked) state already holds everything, so writes are no-ops.
    putRecords(list) {
      if (useMemory) return Promise.resolve();
      return tx(KID ? ['records', 'outbox'] : ['records'], 'readwrite', s => {
        list.forEach(r => { s('records').put(r); if (KID) note(s('outbox'), 'record', r.id, r.updatedAt || stamp()); });
      }).then(() => { if (KID && list.length) changed(); });
    },
    putBooks(list) {
      if (useMemory) return Promise.resolve();
      return tx(KID ? ['books', 'outbox'] : ['books'], 'readwrite', s => {
        list.forEach(b => { s('books').put(b); if (KID) note(s('outbox'), 'book', b.id, b.updatedAt || stamp()); });
      }).then(() => { if (KID && list.length) changed(); });
    },
    deleteBook(id) {
      if (useMemory) return Promise.resolve();
      return tx(KID ? ['books', 'records', 'outbox'] : ['books', 'records'], 'readwrite', s => {
        s('books').delete(id);
        s('records').delete(id);
        if (KID) { note(s('outbox'), 'book', id, stamp(), true); note(s('outbox'), 'record', id, stamp(), true); }
      }).then(() => { if (KID) changed(); });
    },
    setSetting(key, value) {
      if (useMemory) return Promise.resolve();
      const track = KID && C.SYNCED_SETTINGS.includes(key);
      return tx(track ? ['settings', 'outbox'] : ['settings'], 'readwrite', s => {
        s('settings').put(value, key);
        if (track) note(s('outbox'), 'setting', key, stamp());
      }).then(() => { if (track) changed(); });
    },
    // The changes waiting to go up to the account.
    outbox() {
      return useMemory ? Promise.resolve([]) : run('outbox', 'readonly', s => s.getAll());
    },
    // These went up (or can't): they stop waiting, unless she changed the same thing again in the meantime.
    settle(entries) {
      if (useMemory || !entries.length) return Promise.resolve();
      return tx(['outbox'], 'readwrite', s => {
        entries.forEach(e => {
          const req = s('outbox').get(e.key);
          req.onsuccess = () => { if (req.result && req.result.at === e.at) s('outbox').delete(e.key); };
        });
      });
    },
    // Newer copies from the account, saved here without going back up, together with how far this device has read.
    applyRemote(put) {
      if (useMemory) return Promise.resolve();
      return tx(['records', 'books', 'settings', 'outbox'], 'readwrite', s => {
        put.records.forEach(r => s('records').put(r));
        put.dropRecords.forEach(id => s('records').delete(id));
        put.books.forEach(b => s('books').put(b));
        put.dropBooks.forEach(id => s('books').delete(id));
        Object.keys(put.settings).forEach(k => s('settings').put(put.settings[k], k));
        put.dropOutbox.forEach(k => s('outbox').delete(k));
        s('settings').put(put.rev, 'syncRev');
        if (put.fullAt) s('settings').put(put.fullAt, 'syncFullAt');
      });
    },
    close() {
      const was = opening;
      opening = null;
      return was ? was.then(d => d.close(), () => {}) : Promise.resolve();
    }
  };
})();

// Removes every reader's copy kept on this device (signing out). The device's own books are never touched.
async function wipeProfiles() {
  let names = [];
  try { names = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch (e) { names = []; }
  try {
    if (indexedDB.databases) (await indexedDB.databases()).forEach(d => names.push(d.name));
  } catch (e) { /* the remembered list will do */ }
  await db.close();
  const mine = Array.from(new Set(names)).filter(n => typeof n === 'string' && n.indexOf(KID_PREFIX) === 0);
  await Promise.all(mine.map(name => new Promise(resolve => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  })));
  try { localStorage.removeItem(PROFILES_KEY); } catch (e) { /* ignore */ }
}

/** This device stops being signed in: the readers' copies kept here are removed, and it starts again on its own books. */
export async function leaveAccount(notice) {
  await wipeProfiles();
  forget();
  if (notice) leaveNotice(notice);
  location.reload();
}

// Saved settings (read from this device, or a newer copy from the account), checked on the way in.
const TAKE = {
  goals: v => { if (v && typeof v === 'object') state.settings.goals = v; },
  readerName: v => { if (typeof v === 'string') state.settings.readerName = v; },
  accent: v => { if (typeof v === 'string') state.settings.accent = v; },
  lastExportAt: v => { if (typeof v === 'string') state.settings.lastExportAt = v; },
  storySeen: v => { state.settings.storySeen = v === true; },
  pets: v => { state.settings.pets = v !== false; },
  schoolLink: v => { if (typeof v === 'string') state.settings.schoolLink = v; },
  dudeChat: v => { state.settings.dudeChat = v !== false; },
  reportAt: v => { if (typeof v === 'string') state.settings.reportAt = v; },
  thinkReplies: v => { if (v && typeof v === 'object') state.settings.thinkReplies = v; },
  schoolSeen: v => { if (Array.isArray(v)) state.settings.schoolSeen = v.filter(id => typeof id === 'string'); },
  reward: v => { if (v && typeof v === 'object') state.settings.reward = C.reward(v); }
};
export function takeSettings(s) {
  for (const key of Object.keys(TAKE)) if (Object.prototype.hasOwnProperty.call(s, key)) TAKE[key](s[key]);
}

export function rec(id) {
  return state.records[id] || C.entry({ id });
}

let persistAsked = false;
export function requestPersistence() {
  if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
  persistAsked = true;
  navigator.storage.persisted()
    .then(p => p || navigator.storage.persist())
    .then(p => { state.persisted = p; })
    .catch(() => {});
}

export async function save(id, patch) {
  const next = C.entry(Object.assign({}, rec(id), patch, { id, updatedAt: new Date().toISOString() }));
  state.records[id] = next;
  state.dirty = true;
  requestPersistence();
  try {
    await db.putRecords([next]);
  } catch (e) {
    toast('Could not save on this device. Try again, or export a backup.');
  }
  return next;
}

export async function saveSetting(key, value) {
  state.settings[key] = value;
  try { await db.setSetting(key, value); } catch (e) { toast('Could not save that setting.'); }
}
