/* Sending the screen-time alerts to ntfy (ntfy.sh): what they say, the pictures and buttons they carry, and the
 * heads-up and time's up handed to ntfy to deliver later. Nothing else in Book Dude is needed here, so the Fig-o-Clock
 * page (docs/timer) uses this too when a grown-up taps Pause or Resume on an alert.
 *
 * `to` is { grown, kid, key }: the grown-ups' topic, her iPad's topic, and the pause code. Only the grown-ups' alerts
 * carry the pause code (in their Pause and Resume buttons, and the Fig-o-Clock link); her iPad's never do. `page` is
 * the Fig-o-Clock's address. */

export const NTFY = 'https://ntfy.sh';
export const WARN = 5;   // the heads-up comes this many minutes before the end
const PICTURE = { start: 'awake', add: 'awake', resume: 'awake', pause: 'paused', warn: 'yawn', up: 'asleep', stop: 'asleep', test: 'awake' };
const PRIORITY = { warn: 4, up: 5 };   // the rest are normal (3); 5 comes through even on a quiet phone
const mins = n => n + ' min';
const pick = list => list[Math.floor(Math.random() * list.length)];
export const timeText = ms => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// ---------------------------------------------------------------------------------------------------------------------
// What the alerts say. `c` is { id, name, minutes, added, back, bank, leftMs, ends, s ('r' running, 'p' paused,
// 'x' stopped) }, plus left (whole minutes) and endsText, filled in by sendClock.

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
// The grown-ups' links also carry the pause code (pk), and their buttons what to do (do=pause or do=resume).
function figLink(c, topic, page, key, todo) {
  const parts = [ 's=' + c.s, 'm=' + c.minutes ];
  if (c.s === 'r') parts.push('e=' + Math.round(c.ends / 1000));
  else parts.push('l=' + Math.round(c.leftMs / 1000));
  if (c.bank >= 0) parts.push('b=' + c.bank);
  if (c.name !== 'Maddy') parts.push('n=' + encodeURIComponent(c.name));
  parts.push('k=' + topic);
  if (key) parts.push('pk=' + key);
  if (todo) parts.push('do=' + todo);
  return page + '#' + parts.join('&');
}

async function publish(to, kid, event, c, page, extra) {
  const topic = kid ? to.kid : to.grown;
  const [ title, message ] = kid ? kidAlert(event, c) : grownupAlert(event, c);
  const key = kid ? '' : to.key || '';
  const click = c.minutes ? figLink(c, topic, page, key) : page;
  const actions = [];
  // The grown-ups' Pause and Resume buttons: a tap opens the Fig-o-Clock, which pauses or resumes the clock right away.
  if (key && c.minutes && event !== 'up' && event !== 'stop') {
    if (c.s === 'r') actions.push({ action: 'view', label: 'Pause', url: figLink(c, topic, page, key, 'pause'), clear: true });
    if (c.s === 'p') actions.push({ action: 'view', label: 'Resume', url: figLink(c, topic, page, key, 'resume'), clear: true });
  }
  actions.push({ action: 'view', label: 'Fig-o-Clock', url: click });
  try {
    const res = await fetch(NTFY + '/', { method: 'POST', body: JSON.stringify(Object.assign({
      topic, title, message, priority: PRIORITY[event] || 3, click,
      attach: page + 'img/fig-' + PICTURE[event] + '.png', filename: 'fig.png', actions
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
const seqId = (c, which) => 'bookdude-' + c.id + '-' + which;

/**
 * Sends the alerts for a change to the clock ('start', 'add', 'pause', 'resume' or 'stop') to both topics, and sets,
 * moves or cancels the heads-up and time's up. Returns true if the grown-ups' alert went (false: offline, most likely).
 */
export async function sendClock(event, clock, to, page) {
  const now = Date.now();
  const c = Object.assign({ added: 0, back: 0, bank: -1 }, clock);
  c.left = Math.ceil(c.leftMs / 60000);
  c.endsText = c.ends ? timeText(c.ends) : '';
  const one = async kid => {
    const topic = kid ? to.kid : to.grown;
    if (!topic) return true;
    // The heads-up and time's up for this clock: cleared first, then set again if it's running.
    if (event !== 'start') await Promise.all([ cancel(topic, seqId(c, 'warn')), cancel(topic, seqId(c, 'up')) ]);
    const sent = await publish(to, kid, event, c, page);
    if (c.s === 'r' && c.ends > now + 15000) {
      const later = [];
      if (c.ends - WARN * 60000 > now + 30000) later.push(publish(to, kid, 'warn', c, page, { delay: String(Math.round((c.ends - WARN * 60000) / 1000)), sequence_id: seqId(c, 'warn') }));
      later.push(publish(to, kid, 'up', c, page, { delay: String(Math.round(c.ends / 1000)), sequence_id: seqId(c, 'up') }));
      await Promise.all(later);
    }
    return sent;
  };
  const [ grown ] = await Promise.all([ one(false), one(true) ]);
  return grown;
}

// A test alert to each topic. Returns true if every one went.
export async function sendTest(to, page, name) {
  const c = { name, minutes: 0 };
  const [ a, b ] = await Promise.all([ to.grown ? publish(to, false, 'test', c, page) : true, to.kid ? publish(to, true, 'test', c, page) : true ]);
  return a && b;
}
