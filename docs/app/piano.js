/* Piano practice on the Progress tab: a grown-up checks off each 15 minutes she practices, and each check is 15 minutes
 * of screen time, added to the minutes waiting on the screen-time card (docs/core.js screenTime). The checks are the
 * synced setting "piano": { 'YYYY-MM-DD': checks }. The last seven days show, so a forgotten day can still be checked. */

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
  'The Dude can play one song on the piano. It is Chopsticks. Badly.', 'Every 15 minutes is 15 minutes of screen time. That’s a deal.'];

export function pianoHtml() {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.screen) return '';
  const p = C.piano(state.settings.piano), d = today();
  const week = Array.from({ length: 7 }, (_, i) => back(d, i));
  const weekMin = week.reduce((sum, k) => sum + (p[k] || 0) * STEP, 0);
  const all = C.pianoMinutes(p);
  const row = k => {
    const n = p[k] || 0;
    const label = k === d ? 'Today' : k === back(d, 1) ? 'Yesterday' : dayFmt.format(new Date(k + 'T00:00:00Z'));
    return '<li class="piano-day' + (k === d ? ' today' : '') + '"><span class="piano-when">' + esc(label) + '</span><span class="piano-checks">' +
      Array.from({ length: n }, (_, i) => '<button type="button" class="piano-check done" data-act="piano-undo" data-day="' + k + '" aria-label="' +
        esc(label + ': ' + minutes((i + 1) * STEP) + ' checked. Grown-up: take one back') + '"><span aria-hidden="true">✓</span></button>').join('') +
      '<button type="button" class="piano-check add" data-act="piano-add" data-day="' + k + '" aria-label="' + esc('Grown-up: check 15 more minutes for ' + label) + '"><span aria-hidden="true">+</span></button>' +
      '</span><b class="piano-min">' + (n ? minutes(n * STEP) : '') + '</b></li>';
  };
  return '<section class="panel piano-card" id="piano"><h2 class="section-title">Piano practice <small>15 min = 15 min of screen time</small></h2>' +
    '<p class="hint">' + esc(NOTES[new Date(d + 'T12:00:00Z').getUTCDate() % NOTES.length]) + '</p>' +
    '<ul class="piano-week">' + week.map(row).join('') + '</ul>' +
    '<p class="jar-tally">This week: <b>' + minutes(weekMin) + '</b> of practice · All time: ' + minutes(all) + ' of screen time from piano</p>' +
    '<p class="hint">Grown-ups: tap + for each 15 minutes she practices (passcode needed). Tap a check to take it back.</p></section>';
}

async function change(k, by) {
  const p = C.piano(state.settings.piano);
  const n = Math.max(0, Math.min(96, (p[k] || 0) + by));
  if (n) p[k] = n; else delete p[k];
  await saveSetting('piano', p);
  renderProgress();
  toast(by > 0 ? '+15 minutes of screen time for piano. Maple is howling along.' : 'Took back 15 minutes of piano.');
}

export const actions = {
  'piano-add': el => { const k = el.dataset.day; asGrownup(() => change(k, 1)); },
  'piano-undo': el => { const k = el.dataset.day; asGrownup(() => change(k, -1)); }
};
