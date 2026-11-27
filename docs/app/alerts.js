/* Screen-time alerts, sent by Book Dude itself to the free ntfy app (ntfy.sh), from the device a grown-up uses to
 * change the clock. Two private topics, kept in the family account so every device knows them: the grown-ups'
 * phones get the plain facts and her bank; her iPad gets Fig talking to her, in lines that change from one alert to the
 * next. Each alert carries a picture of Fig, and a tap opens the Fig-o-Clock (docs/timer).
 *
 * The 5-minute heads-up and time's up are handed to ntfy when the clock starts, to deliver at the right moment even
 * with every phone locked. Each has its own name (a sequence ID, per clock), so pausing or stopping cancels them and
 * more minutes move them.
 *
 * Why Book Dude and not the family Google script: ntfy.sh counts messages per internet address, and Google scripts
 * share a few addresses with everyone else's, so their daily allowance runs out. A family's own phone has its own. */

import { C, $, esc } from './util.js';
import { state, saveSetting } from './state.js';
import { toast, showBox, confirmBox } from './page.js';
import { asGrownup } from './grownup.js';
import { sendClock, sendTest, WARN } from './ntfy.js';

const figPage = () => new URL('timer/', document.baseURI).href;

export const topics = () => C.alerts(state.settings.alerts);

// The pause code in the grown-ups' alerts (their Pause and Resume buttons): long and random, made once.
const randomHex = n => {
  const a = new Uint8Array(n);
  window.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
};
const newKey = () => 'pk' + randomHex(20);
async function withKey(to) {
  if (to.key) return to;
  const next = Object.assign({}, to, { key: newKey() });
  await saveSetting('alerts', next);
  return next;
}

/**
 * Sends the alerts for a change to the clock `t` ('start', 'add', 'pause', 'resume' or 'stop'), and sets, moves or
 * cancels the heads-up and time's up. `info` is { name, added, back, bank }. Returns 'off' (no topics set up), 'ok',
 * or 'failed' (the grown-ups' alert didn't go: offline, most likely).
 */
export async function alertClock(event, t, info) {
  let to = topics();
  if (!to) return 'off';
  to = await withKey(to);
  const now = Date.now();
  const clock = { id: t.id, name: info.name, minutes: t.minutes, added: info.added || 0, back: info.back || 0, bank: info.bank,
    leftMs: C.timerLeft(t, now), ends: C.timerEnds(t), s: event === 'pause' ? 'p' : event === 'stop' ? 'x' : 'r' };
  return (await sendClock(event, clock, to, figPage())) ? 'ok' : 'failed';
}

// ---------------------------------------------------------------------------------------------------------------------
// Setting them up: Settings, behind the passcode.

const randomTopic = prefix => prefix + randomHex(10);

export function alertsPanelHtml() {
  const to = topics();
  return '<section class="panel" id="alerts-panel"><h2>Screen-time alerts <small class="for-grownups">for grown-ups</small></h2>' +
    '<p class="lead">' + (to
      ? 'On. Book Dude tells the free <b>ntfy</b> app when the screen-time clock starts, changes, has ' + WARN + ' minutes left and runs out: the facts to the grown-ups’ phones, Fig to her iPad.'
      : 'Get an alert in the free <b>ntfy</b> app when the screen-time clock starts, changes, has ' + WARN + ' minutes left and runs out, even with Book Dude closed. No account or phone numbers needed.') + '</p>' +
    '<div class="row-actions"><button type="button" class="btn small' + (to ? '' : ' primary') + '" data-act="alerts-open">' + (to ? 'Topics and test' : 'Set up alerts') + '</button></div></section>';
}

function boxHtml() {
  const to = topics() || { grown: '', kid: '' };
  const row = (id, label, value, hint) => '<label class="field"><span>' + label + '</span><input id="' + id + '" class="input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(value) + '"><span class="hint">' + hint + '</span></label>';
  return '<form class="stack" data-form="alerts" novalidate>' +
    '<p>In the <b>ntfy</b> app on each device, tap <b>+</b>, paste the name, and tap <b>Subscribe</b> (leave “Use another server” off).</p>' +
    row('alerts-grown', 'Grown-ups’ phones', to.grown, 'Your phone and your spouse’s.') +
    (to.grown ? '<div class="row-actions"><button type="button" class="btn small" data-act="alerts-copy" data-which="grown">Copy grown-ups’ name</button></div>' : '') +
    row('alerts-kid', 'Her iPad', to.kid, 'Fig talks to her here.') +
    (to.kid ? '<div class="row-actions"><button type="button" class="btn small" data-act="alerts-copy" data-which="kid">Copy her name</button></div>' : '') +
    '<p class="hint">Each name works like a password: anyone who knows it can see those alerts. Already made names in the family Google script? Paste them here (they’re in its Script Properties as NTFY_TOPIC and NTFY_KID_TOPIC).</p>' +
    '<p class="error" id="alerts-error" role="alert" hidden></p>' +
    '<div class="row-actions"><button type="submit" class="btn primary">Save</button>' +
      '<button type="button" class="btn" data-act="alerts-new">Make new names</button>' +
      (to.grown || to.kid ? '<button type="button" class="btn" data-act="alerts-test">Send a test alert</button>' : '') +
      '<button type="button" class="btn" data-act="close-confirm">Close</button></div>' +
  '</form>';
}

export const actions = {
  'alerts-open': () => asGrownup(() => showBox('Screen-time alerts', boxHtml())),
  'alerts-new': () => {
    const g = $('#alerts-grown', confirmBox), k = $('#alerts-kid', confirmBox);
    if (g) g.value = randomTopic('bookdude-');
    if (k) k.value = randomTopic('bookdude-kid-');
  },
  'alerts-copy': async el => {
    const to = topics();
    const name = to && to[el.dataset.which];
    if (!name) return;
    try { await navigator.clipboard.writeText(name); toast('Copied. Paste it into ntfy.'); } catch (e) { toast('Copy didn’t work here: press and hold the name to copy it.'); }
  },
  'alerts-test': async () => {
    const to = topics();
    if (!to) return;
    const ok = await sendTest(to, figPage(), (state.settings.readerName || '').trim() || 'Maddy');
    toast(ok ? 'Test alerts sent. Check the phones and her iPad.' : 'A test alert didn’t go out. Is the internet on?');
  }
};

export const submits = {
  alerts: async form => {
    const g = $('#alerts-grown', form).value.trim(), k = $('#alerts-kid', form).value.trim();
    const err = $('#alerts-error', form);
    const bad = [ g && !C.topicOk(g) ? 'the grown-ups’ name' : '', k && !C.topicOk(k) ? 'her name' : '' ].filter(Boolean);
    if (bad.length) { err.textContent = 'Check ' + bad.join(' and ') + ': 8 to 64 letters, numbers, - or _ (just the name, not ntfy.sh/).'; err.hidden = false; return; }
    if (g && g === k) { err.textContent = 'Use two different names, so her iPad doesn’t get the grown-ups’ alerts.'; err.hidden = false; return; }
    const was = topics();
    await saveSetting('alerts', g || k ? { grown: g, kid: k, key: (was && was.key) || newKey() } : null);
    showBox('Screen-time alerts', boxHtml());
    toast(g || k ? 'Saved on every device in the family account. Send a test alert to check.' : 'Alerts are off.');
    const panel = $('#alerts-panel');
    if (panel) panel.outerHTML = alertsPanelHtml();
  }
};

