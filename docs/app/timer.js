/* The screen-time clock, one for the family. A grown-up cashing in minutes starts it; every device signed in to her
 * account shows the same countdown in a strip at the top of every tab; grown-ups can pause or stop it (stopping puts
 * the unused minutes back in her bank); and when it runs out, any device with Book Dude open chimes and says so. The
 * family Google script sends alerts to the ntfy app when it starts, changes and runs out (Timer.gs). */

import { C, $, esc, plural } from './util.js';
import { state, saveSetting } from './state.js';
import { confirmBox, toast, showConfirm } from './page.js';
import { asGrownup } from './grownup.js';
import { post } from './dude-ai.js';
import { saveReward, screenStatus, rewardPoints } from './money.js';
import { renderProgress } from './progress.js';

const UP_SEEN = 'book-dude:timer-up-seen';
const newId = () => (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
const timeText = ms => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const herName = () => (state.settings.readerName || '').trim() || 'Maddy';
const current = () => C.timer(state.settings.timer);

function seen(id) {
  try { return localStorage.getItem(UP_SEEN) === id; } catch (e) { return upShown === id; }
}
function markSeen(id) {
  upShown = id;
  try { localStorage.setItem(UP_SEEN, id); } catch (e) { /* this device just may chime again after a reload */ }
}
let upShown = '';
let dismissed = '';

// ---------------------------------------------------------------------------------------------------------------------
// The strip at the top of every tab. It is built again only when the clock's state changes, and otherwise just has its
// time updated, so a button being tapped is never redrawn out from under a finger.

let built = '';
let lastState = '';
let lastId = '';

function stripHtml(t, st, now) {
  const left = '<span class="timer-time" id="timer-left">' + C.clock(C.timerLeft(t, now)) + '</span>';
  if (st === 'running') {
    return '<span class="timer-text">Screen time: ' + left + ' left <small>ends ' + esc(timeText(C.timerEnds(t))) + '</small></span>' +
      '<span class="timer-btns"><button type="button" class="btn small" data-act="timer-pause">Pause</button>' +
      '<button type="button" class="btn small" data-act="timer-stop">Stop</button></span>';
  }
  if (st === 'paused') {
    return '<span class="timer-text">Screen time paused: ' + left + ' left</span>' +
      '<span class="timer-btns"><button type="button" class="btn small" data-act="timer-resume">Resume</button>' +
      '<button type="button" class="btn small" data-act="timer-stop">Stop</button></span>';
  }
  return '<span class="timer-text">Screen time is up! It ended at ' + esc(timeText(C.timerEnds(t))) + '.</span>' +
    '<span class="timer-btns"><button type="button" class="btn small" data-act="timer-ok">OK</button></span>';
}

export function paintTimer() {
  const box = $('#screen-timer');
  if (!box) return;
  const t = current(), now = Date.now();
  let st = C.timerState(t, now);
  // Running out while she watched (or within two minutes of it, on a device just opened): the chime and the big box.
  if (st === 'up' && !seen(t.id)) {
    markSeen(t.id);
    if ((lastState === 'running' && lastId === t.id) || now - C.timerEnds(t) < 2 * 60000) timeUp(t);
  }
  lastState = st;
  lastId = t ? t.id : '';
  if (st === 'up' && dismissed === t.id) st = 'none';
  if (st === 'none') {
    if (!box.hidden) { box.hidden = true; box.innerHTML = ''; built = ''; }
    return;
  }
  const key = st + '|' + t.id + '|' + t.minutes + '|' + t.start;
  if (key !== built) {
    box.className = 'banner timer ' + st;
    box.innerHTML = stripHtml(t, st, now);
    box.hidden = false;
    built = key;
  } else {
    const el = $('#timer-left', box);
    if (el) el.textContent = C.clock(C.timerLeft(t, now));
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Time's up: three rising notes (made here, no sound file), and a box that says so.

let audio = null;
function unlockAudio() {
  try {
    if (!audio) { const A = window.AudioContext || window.webkitAudioContext; if (A) audio = new A(); }
    if (audio && audio.state === 'suspended') audio.resume();
  } catch (e) { audio = null; }
}
function chime() {
  try {
    unlockAudio();
    if (!audio) return;
    const t0 = audio.currentTime + .05;
    [660, 880, 1175, 660, 880, 1175].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), at = t0 + i * .22 + (i > 2 ? .35 : 0);
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.35, at + .02); g.gain.exponentialRampToValueAtTime(.001, at + .5);
      o.connect(g).connect(audio.destination); o.start(at); o.stop(at + .55);
    });
  } catch (e) { /* no sound on this device: the box still shows */ }
}

function timeUp(t) {
  chime();
  if (window.__timerUp) window.__timerUp(t.id);
  if (confirmBox.open) return;   // a passcode or other box is open: the red strip says it instead
  showConfirm('Time’s up!', '<p class="timer-up-msg">' + esc(herName()) + '’s screen time is over. Maple has already hidden the remote.</p>');
}

// ---------------------------------------------------------------------------------------------------------------------
// Changing the clock: here, in her account (so every device shows it), in her bank when minutes go back, and as an alert.

async function change(what, minutes) {
  const now = Date.now(), before = current();
  const was = C.timerState(before, now, 0);
  const r = C.timerDo(before, what, now, minutes, newId());
  if (!r.timer || r.timer.at !== new Date(now).toISOString()) return null;   // nothing to change (it already ran out)
  await saveSetting('timer', r.timer);
  if (r.back) {
    const cfg = C.reward(state.settings.reward);
    await saveReward({ given: Math.max(0, cfg.given - r.back) });
    if (state.tab === 'progress') renderProgress();
  }
  dismissed = '';
  paintTimer();
  const event = what === 'cash' ? (was === 'running' || was === 'paused' ? 'add' : 'start') : what;
  alertFamily(event, r.timer, what === 'cash' ? Math.floor(minutes) : 0, r.back);
  return r;
}

// The Fig-o-Clock page the alerts open: Fig gets sleepier as the clock runs down (docs/timer).
const figPage = () => new URL('timer/', document.baseURI).href;

function alertFamily(event, t, added, back) {
  const ends = C.timerEnds(t), leftMs = C.timerLeft(t, Date.now());
  post({ action: 'timer', event, id: t.id, name: herName(), minutes: t.minutes, added, back,
    left: event === 'stop' ? 0 : Math.ceil(leftMs / 60000), leftMs: Math.round(leftMs), ends, endsText: ends ? timeText(ends) : '',
    bank: screenStatus(rewardPoints()).owed, page: figPage() }).then(r => {
    if (r && r.error && state.settings.schoolLink) toast('The clock is set, but the alerts didn’t go out. (Is the internet on?)');
  });
}

/** A grown-up cashed in `n` minutes: the clock starts (or gets `n` more). Returns a sentence for the toast. */
export async function cashIn(n) {
  const r = await change('cash', n);
  if (!r) return '';
  const ends = timeText(C.timerEnds(r.timer));
  if (!r.timer.start) return 'Added ' + plural(n, 'minute') + ' to the paused clock.';
  return C.timerLeft(r.timer, Date.now()) > n * 60000 + 1000
    ? 'Added ' + plural(n, 'minute') + ' to the clock. It now ends at ' + ends + '.'
    : 'The clock is running: it ends at ' + ends + '.';
}

export const actions = {
  'timer-pause': () => asGrownup(async () => { if (await change('pause')) toast('Screen time paused. The clock is holding still on every device.'); }),
  'timer-resume': () => asGrownup(async () => { const r = await change('resume'); if (r) toast('Screen time is going again: it ends at ' + timeText(C.timerEnds(r.timer)) + '.'); }),
  'timer-stop': () => asGrownup(() => {
    const left = Math.floor(C.timerLeft(current(), Date.now()) / 60000);
    showConfirm('Stop screen time?', '<p>' + (left ? 'The ' + plural(left, 'minute') + ' not used yet go back to her bank for later.' : 'There’s less than a minute left anyway.') + '</p>',
      'Stop the clock', async () => {
        const r = await change('stop');
        if (r) toast(r.back ? 'Stopped. ' + plural(r.back, 'minute') + ' went back to her bank.' : 'Stopped.');
      });
  }),
  'timer-ok': () => { const t = current(); dismissed = t ? t.id : ''; paintTimer(); }
};

/** Starts the strip: it ticks every second, and right away when the app comes back to the front. */
export function startTimer() {
  // iPhones and iPads only make sound after a tap: the first tap anywhere gets the chime ready.
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  const t = current();
  if (t && C.timerState(t, Date.now()) === 'up' && Date.now() - C.timerEnds(t) >= 2 * 60000) markSeen(t.id);
  paintTimer();
  setInterval(paintTimer, 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') paintTimer(); });
}
