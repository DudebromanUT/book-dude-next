/* Piano practice on the Progress tab: a grown-up checks off each 15 minutes she practices. Piano earns no screen time
 * itself; 90 minutes in a week (Monday to Sunday) unlock cashing in her screen time that weekend (docs/core.js
 * pianoWeek, and the screen-time card in money.js). The checks are the synced setting "piano": { 'YYYY-MM-DD': checks }.
 * This week's days show, newest first, so a forgotten day can still be checked. */

import { C, esc, today, fmtNum } from './util.js';
import { state, saveSetting } from './state.js';
import { toast } from './page.js';
import { asGrownup } from './grownup.js';
import { renderProgress } from './progress.js';

const STEP = C.PIANO_STEP;
const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const minutes = n => fmtNum(n) + ' min';
const back = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') - n * 864e5).toISOString().slice(0, 10);
const NOTES = ['A little Mozart never hurt anybody.', 'Fig sat on the keys once. It was not music.', 'Maple howls along. Maple thinks she is helping.',
  'The Dude can play one song on the piano. It is Chopsticks. Badly.', 'No piano, no remote. Maple made the rules.'];

export function pianoHtml() {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.screen) return '';
  const p = C.piano(state.settings.piano), d = today();
  const wk = C.pianoWeek(p, d);
  const week = wk.days.filter(k => k <= d).reverse();
  const pct = Math.min(100, wk.minutes / wk.goal * 100).toFixed(1);
  const row = k => {
    const n = p[k] || 0;
    const label = k === d ? 'Today' : k === back(d, 1) ? 'Yesterday' : dayFmt.format(new Date(k + 'T00:00:00Z'));
    return '<li class="piano-day' + (k === d ? ' today' : '') + '"><span class="piano-when">' + esc(label) + '</span><span class="piano-checks">' +
      Array.from({ length: n }, (_, i) => '<button type="button" class="piano-check done" data-act="piano-undo" data-day="' + k + '" aria-label="' +
        esc(label + ': ' + minutes((i + 1) * STEP) + ' checked. Grown-up: take one back') + '"><span aria-hidden="true">✓</span></button>').join('') +
      '<button type="button" class="piano-check add" data-act="piano-add" data-day="' + k + '" aria-label="' + esc('Grown-up: check 15 more minutes for ' + label) + '"><span aria-hidden="true">+</span></button>' +
      '</span><b class="piano-min">' + (n ? minutes(n * STEP) : '') + '</b></li>';
  };
  return '<section class="panel piano-card" id="piano"><h2 class="section-title">Piano practice <small>' + wk.goal + ' min a week unlocks screen time</small></h2>' +
    '<p class="piano-goal"><b>' + minutes(wk.minutes) + '</b> of ' + minutes(wk.goal) + ' this week' + (wk.met ? ' · Weekend screen time unlocked!' : '') + '</p>' +
    '<span class="bar' + (wk.met ? ' gold' : '') + '"><i data-w="' + pct + '"></i></span>' +
    '<p class="hint">' + esc(wk.met ? 'Maple has returned the remote. Maple is not happy about it.' : NOTES[new Date(d + 'T12:00:00Z').getUTCDate() % NOTES.length]) + '</p>' +
    '<ul class="piano-week">' + week.map(row).join('') + '</ul>' +
    '<p class="hint">Grown-ups: tap + for each 15 minutes she practices (passcode needed). Tap a check to take it back. The week runs Monday to Sunday.</p></section>';
}

async function change(k, by) {
  const p = C.piano(state.settings.piano);
  const n = Math.max(0, Math.min(96, (p[k] || 0) + by));
  if (n) p[k] = n; else delete p[k];
  await saveSetting('piano', p);
  renderProgress();
  const wk = C.pianoWeek(p, today());
  toast(by < 0 ? 'Took back 15 minutes of piano.' : wk.met ? 'Piano done for the week! Weekend screen time is unlocked.' : '+15 minutes of piano. ' + (wk.goal - wk.minutes) + ' to go this week.');
}

export const actions = {
  'piano-add': el => { const k = el.dataset.day; asGrownup(() => change(k, 1)); },
  'piano-undo': el => { const k = el.dataset.day; asGrownup(() => change(k, -1)); }
};
