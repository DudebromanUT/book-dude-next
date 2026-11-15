/* Book Dude starts here: load what is saved on this device, draw the first screen, and get ready to work offline.
 * The README's "Where the code lives" lists what each file in docs/app does.
 *
 * Files import from each other freely, even in a circle (a tab redraws after a change, and the change
 * lives in another file). That works because, while the files load, they only define things; the work
 * starts below. A value computed while a file loads (outside any function) may only use util.js,
 * icons.js, and books.js, which never import the others. */

import { C, $, esc, today } from './util.js';
import { BOOKS, BY_ID, rebuildBooks } from './books.js';
import { state, db, loadUi, saveSetting, takeSettings } from './state.js';
import { main, toast } from './page.js';
import { emptyState } from './cards.js';
import { newDudeLine, openStory } from './dude-talk.js';
import { applyAccent, startPets } from './more.js';
import { openBook } from './book.js';
import { registerWorker } from './offline.js';
import { rewardPoints } from './money.js';
import { TABS, render } from './tabs.js';
import { listen } from './events.js';
import { HISTORY, addHistory } from './backup.js';
import { syncSchool } from './school.js';
import { APP_VERSION } from './version.js';
import { account, activeKid, activeKidName, takeNotice } from './cloud.js';
import { firstPull, startSync, checkAccount } from './sync.js';

async function start() {
  $('#app-version').textContent = 'App version ' + APP_VERSION;
  if (!C || !BOOKS.length) {
    main.innerHTML = emptyState('The book list did not load', 'Close Book Dude and open it again while online.');
    return;
  }
  loadUi();
  let loaded = await db.load();
  // A reader from a family account, opened on this device for the first time: everything she has in the account
  // comes down before the app starts, so nothing here is made up fresh and sent over the top of what she has.
  const kid = activeKid();
  if (kid && loaded.ok && typeof loaded.settings.syncFullAt !== 'string') {
    const name = activeKidName();
    main.innerHTML = '<p class="loading">Getting ' + esc(name || 'the reader') + '’s books from the family account…</p>';
    const got = await firstPull();
    if (got !== 'ok') {
      main.innerHTML = emptyState(got === 'out' ? 'This device isn’t signed in any more' : 'Could not reach the family account',
        got === 'out' ? 'A grown-up may have signed it out. Sign in again from Farty Pants Central.' : 'Check the internet connection. ' + esc(name || 'The reader') + '’s books will load as soon as the account answers.',
        '<div class="row-actions">' + (got === 'out' ? '' : '<button type="button" class="btn primary" data-act="acct-retry">Try again</button>') +
        '<button type="button" class="btn" data-act="acct-giveup">' + (got === 'out' ? 'OK' : 'Sign out instead') + '</button></div>');
      return;
    }
    loaded = await db.load();
  }
  state.storage = loaded.ok ? 'ok' : 'memory';
  for (const r of loaded.records) if (r && C.safeId(r.id)) state.records[r.id] = C.entry(r);
  for (const b of loaded.books) if (b && C.isCustomId(b.id) && b.title) state.custom[b.id] = C.customBook(b);
  rebuildBooks(state.custom);
  const s = loaded.settings;
  takeSettings(s);
  // A reader from the account is called by the name her grown-up gave, until she picks her own.
  if (kid && !state.settings.readerName) state.settings.readerName = activeKidName();
  // The first start with screen time on this device: extra minutes count for books finished from today on, and the
  // points she already earned stay in the jar, where every point went before she could choose screen time.
  const first = {};
  if (!state.settings.reward.since) first.since = today();
  if (!s.reward || s.reward.toJar === undefined) first.toJar = Math.floor(rewardPoints() / 10);
  // Book money moved from $100 Barnes & Noble payouts to $10 Greenlight payouts in October 2026. A jar still on the
  // old settings switches once, with payouts already made counted again in tens; a grown-up's own settings stay.
  if (s.jarDefaults !== 'greenlight-10') {
    const r = state.settings.reward;
    if (r.every === 100 && r.where === 'your Barnes & Noble account') Object.assign(first, { every: 10, where: 'your Greenlight account', paid: r.paid * 10 });
    saveSetting('jarDefaults', 'greenlight-10');
  }
  if (Object.keys(first).length) saveSetting('reward', C.reward(Object.assign({}, state.settings.reward, first)));
  applyAccent();
  if (!loaded.ok) {
    const warn = $('#storage-warning');
    warn.textContent = 'This browser is not letting the app save (Private Browsing can do this). Changes will be lost when you close it.';
    warn.hidden = false;
  }
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { state.persisted = p; }).catch(() => {});
  const initial = location.hash.slice(1);
  state.tab = TABS.includes(initial) ? initial : 'explore';
  newDudeLine();
  render();
  // A shared book (?book=...) opens right away, instead of the welcome story; the address then goes back to normal.
  const shared = new URLSearchParams(location.search).get('book');
  if (shared !== null) history.replaceState(null, '', location.pathname + location.hash);
  if (shared && BY_ID.has(shared)) openBook(shared);
  else {
    if (shared) toast('That book isn’t in the Reading Room.');
    // A brand-new reader meets the Dude first.
    const isNew = !Object.keys(state.records).length && !Object.keys(state.custom).length;
    if (!state.settings.storySeen && isNew) openStory();
  }
  startPets();
  registerWorker();
  const notice = takeNotice();
  if (notice) toast(notice);
  if (kid) startSync(s);
  else if (account()) checkAccount();
  // Her reading history lands first, so a new school quiz for one of those books finds it. It is Maddy's own history,
  // built into the site, so it only lands on a device's own books: a reader from a family account has her books there.
  (s.history !== HISTORY && state.storage === 'ok' && !kid ? addHistory() : Promise.resolve()).then(() => syncSchool(true));
}

listen();
start();
