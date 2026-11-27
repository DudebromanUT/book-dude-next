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

const NTFY = 'https://ntfy.sh';
const WARN = 5;   // the heads-up comes this many minutes before the end
const figPage = () => new URL('timer/', document.baseURI).href;
const PICTURE = { start: 'awake', add: 'awake', resume: 'awake', pause: 'paused', warn: 'yawn', up: 'asleep', stop: 'asleep', test: 'awake' };
const PRIORITY = { warn: 4, up: 5 };   // the rest are normal (3); 5 comes through even on a quiet phone
const mins = n => n + ' min';
const pick = list => list[Math.floor(Math.random() * list.length)];
const timeText = ms => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const topics = () => C.alerts(state.settings.alerts);

// ---------------------------------------------------------------------------------------------------------------------
// What the alerts say. `c` is { name, minutes, added, left, endsText, back, bank }.

function grownupAlert(event, c) {
  const ends = c.endsText ? ', ends ' + c.endsText : '';
  const bank = c.bank >= 0 ? ' Bank: ' + mins(c.bank) + '.' : '';
  if (event === 'start') return [ 'Screen time started', c.name + ': ' + mins(c.minutes) + ends + '.' + bank ];
  if (event === 'add') return [ 'More screen time', mins(c.added) + ' added for ' + c.name + '. ' + mins(c.left) + ' left' + ends + '.' + bank ];
  if (event === 'pause') return [ 'Screen time paused', c.name + ' has ' + mins(c.left) + ' left.' + bank ];
  if (event === 'resume') return [ 'Screen time is back on', c.name + ': ' + mins(c.left) + ' left' + ends + '.' + bank ];
  if (event === 'warn') return [ WARN + ' minutes left', c.name + '’s screen time ends at ' + c.endsText + '.' + bank ];
  if (event === 'up') return [ 'Screen time is up!', c.name + '’s screen time is over (' + c.endsText + '). Time to hand over the remote.' + bank ];
  if (event === 'test') return [ 'Book Dude alerts are on', 'Grown-ups: you’ll get the facts here when screen time starts, changes and ends.' ];
  return [ 'Screen time stopped early', c.name + '’s clock was stopped.' + (c.back ? ' ' + mins(c.back) + ' went back to her bank.' : '') + bank ];
}

function kidAlert(event, c) {
  const ends = c.endsText ? ' It ends at ' + c.endsText + '.' : '';
  const bank = c.bank > 0 ? ' You have ' + mins(c.bank) + ' saved in your bank.' : '';
  const lines = {
    start: [
      [ 'Screen time! Fig is wide awake', 'Meow! You have ' + mins(c.minutes) + '. Fig is watching the clock so you don’t have to.' + ends + bank ],
      [ 'Fig says: go!', mins(c.minutes) + ' of screen time, starting now. Fig had three breakfasts and is ready.' + ends + bank ],
      [ 'Screen time is on', 'Fig is wide awake and guarding your ' + mins(c.minutes) + '. Enjoy!' + ends + bank ]
    ],
    add: [
      [ 'More screen time!', mins(c.added) + ' more! Fig had a snack and woke right back up. ' + mins(c.left) + ' left.' + ends ],
      [ 'Bonus minutes', 'Fig found ' + mins(c.added) + ' more under the couch. ' + mins(c.left) + ' left.' + ends ]
    ],
    pause: [
      [ 'Paused', 'Fig is frozen like a statue. Your ' + mins(c.left) + ' are safe until a grown-up starts the clock again.' ],
      [ 'Screen time on hold', 'Fig is holding perfectly still. ' + mins(c.left) + ' left for later.' ]
    ],
    resume: [
      [ 'Back on!', 'Fig stretched and is awake again. ' + mins(c.left) + ' left.' + ends ],
      [ 'Screen time is back', 'Fig is back on duty. ' + mins(c.left) + ' to go.' + ends ]
    ],
    warn: [
      [ WARN + ' minutes left', 'Fig is yawning. Finish your level or your episode.' ],
      [ 'Almost time', 'Fig’s eyes are getting heavy. ' + WARN + ' more minutes, then nap time for the screen.' ],
      [ 'Heads up from Fig', WARN + ' minutes left. Find a good stopping place.' ]
    ],
    up: [
      [ 'Time’s up!', 'Fig is asleep, and so is the screen. Time to hand over the remote.' + bank ],
      [ 'Screen time is over', 'Shhh. Fig is napping in her nightcap. Screen off, please.' + bank ],
      [ 'Fig is asleep', 'Screen time is all done. Fig says goodnight to the screen.' + bank ]
    ],
    stop: [
      [ 'Screen time stopped', 'A grown-up stopped the clock. Fig went back to sleep.' + bank ],
      [ 'All done for now', 'The clock stopped early. Fig curled up for a nap.' + bank ]
    ],
    test: [ [ 'Hi from Fig!', 'Meow! I’ll tell you here when screen time starts, when ' + WARN + ' minutes are left, and when it’s over.' ] ]
  };
  return pick(lines[event]);
}

// The Fig-o-Clock link: the clock as of this alert (after #), and the topic, so the page can follow the clock live.
function figLink(c, topic) {
  const parts = [ 's=' + c.s, 'm=' + c.minutes ];
  if (c.s === 'r') parts.push('e=' + Math.round(c.ends / 1000));
  else parts.push('l=' + Math.round(c.leftMs / 1000));
  if (c.bank >= 0) parts.push('b=' + c.bank);
  if (c.name !== 'Maddy') parts.push('n=' + encodeURIComponent(c.name));
  parts.push('k=' + topic);
  return figPage() + '#' + parts.join('&');
}

// ---------------------------------------------------------------------------------------------------------------------
// ntfy

async function publish(topic, event, kid, c, extra) {
  const [ title, message ] = kid ? kidAlert(event, c) : grownupAlert(event, c);
  const click = c.minutes ? figLink(c, topic) : figPage();
  try {
    const res = await fetch(NTFY + '/', { method: 'POST', body: JSON.stringify(Object.assign({
      topic, title, message, priority: PRIORITY[event] || 3, click,
      attach: figPage() + 'img/fig-' + PICTURE[event] + '.png', filename: 'fig.png',
      actions: [ { action: 'view', label: 'Fig-o-Clock', url: click } ]
    }, extra || {})) });
    return res.ok;
  } catch (e) {
    return false;
  }
}
// Cancels a scheduled alert (or takes back a delivered one). Nothing there to cancel is fine.
async function cancel(topic, seq) {
  try { await fetch(NTFY + '/' + topic + '/' + seq, { method: 'DELETE' }); } catch (e) { /* offline: it may still come */ }
}
const seqId = (t, which) => 'bookdude-' + t.id + '-' + which;

/**
 * Sends the alerts for a change to the clock `t` ('start', 'add', 'pause', 'resume' or 'stop'), and sets, moves or
 * cancels the heads-up and time's up. `info` is { name, added, back, bank }. Returns 'off' (no topics set up), 'ok',
 * or 'failed' (the grown-ups' alert didn't go: offline, most likely).
 */
export async function alertClock(event, t, info) {
  const to = topics();
  if (!to) return 'off';
  const now = Date.now(), ends = C.timerEnds(t), leftMs = C.timerLeft(t, now);
  const s = event === 'pause' ? 'p' : event === 'stop' ? 'x' : 'r';
  const c = { name: info.name, minutes: t.minutes, added: info.added || 0, back: info.back || 0, bank: info.bank,
    left: Math.ceil(leftMs / 60000), leftMs, ends, endsText: ends ? timeText(ends) : '', s };
  const one = async (topic, kid) => {
    if (!topic) return true;
    // The heads-up and time's up for this clock: cleared first, then set again if it's running.
    if (event !== 'start') await Promise.all([ cancel(topic, seqId(t, 'warn')), cancel(topic, seqId(t, 'up')) ]);
    const sent = await publish(topic, event, kid, c);
    if (s === 'r' && ends > now + 15000) {
      const later = [];
      if (ends - WARN * 60000 > now + 30000) later.push(publish(topic, 'warn', kid, c, { delay: String(Math.round((ends - WARN * 60000) / 1000)), sequence_id: seqId(t, 'warn') }));
      later.push(publish(topic, 'up', kid, c, { delay: String(Math.round(ends / 1000)), sequence_id: seqId(t, 'up') }));
      await Promise.all(later);
    }
    return sent;
  };
  const [ grown ] = await Promise.all([ one(to.grown, false), one(to.kid, true) ]);
  return grown ? 'ok' : 'failed';
}

// ---------------------------------------------------------------------------------------------------------------------
// Setting them up: Settings, behind the passcode.

const randomTopic = prefix => {
  const a = new Uint8Array(10);
  window.crypto.getRandomValues(a);
  return prefix + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
};

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
    const c = { name: (state.settings.readerName || '').trim() || 'Maddy', minutes: 0 };
    const [ a, b ] = await Promise.all([ to.grown ? publish(to.grown, 'test', false, c) : true, to.kid ? publish(to.kid, 'test', true, c) : true ]);
    toast(a && b ? 'Test alerts sent. Check the phones and her iPad.' : 'A test alert didn’t go out. Is the internet on?');
  }
};

export const submits = {
  alerts: async form => {
    const g = $('#alerts-grown', form).value.trim(), k = $('#alerts-kid', form).value.trim();
    const err = $('#alerts-error', form);
    const bad = [ g && !C.topicOk(g) ? 'the grown-ups’ name' : '', k && !C.topicOk(k) ? 'her name' : '' ].filter(Boolean);
    if (bad.length) { err.textContent = 'Check ' + bad.join(' and ') + ': 8 to 64 letters, numbers, - or _ (just the name, not ntfy.sh/).'; err.hidden = false; return; }
    if (g && g === k) { err.textContent = 'Use two different names, so her iPad doesn’t get the grown-ups’ alerts.'; err.hidden = false; return; }
    await saveSetting('alerts', g || k ? { grown: g, kid: k } : null);
    showBox('Screen-time alerts', boxHtml());
    toast(g || k ? 'Saved on every device in the family account. Send a test alert to check.' : 'Alerts are off.');
    const panel = $('#alerts-panel');
    if (panel) panel.outerHTML = alertsPanelHtml();
  }
};

