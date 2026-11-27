/**
 * The screen-time clock's alerts, server side (Google Apps Script), for Book Dude.
 *
 * When a grown-up cashes in screen time in Book Dude, or pauses, resumes or stops the clock, the app tells this script
 * (through doPost in Code.gs, with the same key as everything else Book Dude sends), and it sends alerts through the
 * free ntfy app (ntfy.sh) to two private topics:
 *   - the grown-ups' topic (your iPhones): the plain facts, with Fig's picture;
 *   - Maddy's topic (her iPad): Fig talking to her, in lines that change from one alert to the next.
 * While the clock runs, the script also sets itself two alarms: a warning when 5 minutes are left, and "time's up" at
 * the end (urgent), whether or not anyone has Book Dude open. Each alert says how many minutes are still in her bank,
 * carries a picture of Fig (wide awake, yawning, paused mid-yawn, or asleep in her nightcap), and tapping it opens the
 * Fig-o-Clock: a live countdown where Fig gets sleepier as time runs out. The page asks this script for the clock
 * with a view-only code (doGet in Code.gs, ?clock=...), which shows the clock and nothing else.
 *
 * SETUP: in the Book Dude Apps Script project, click + next to Files, choose Script, name it Timer, and paste in this
 * file. Code.gs hands the clock's requests to this file (doPost's 'timer' line and doGet's 'clock' line, both in the
 * current Code.gs). Then pick timerSetup in the function menu and click Run: it makes the two topics, sends a test
 * alert to each, and prints their names. In the ntfy app, tap +, type the name exactly, and Subscribe: the grown-ups'
 * topic on your phones, Maddy's on her iPad. Then Deploy > Manage deployments > pencil > Version: New version > Deploy.
 *
 * A topic's name works like a password: anyone who knows it can see its alerts, so share them only with the family.
 *
 * NTFY_TOKEN (Script Property): an access token from a free ntfy.sh account (ntfy.sh > Sign up > Account > Access
 * tokens > Create). Without one, ntfy.sh counts this script together with every other Google script sharing Google's
 * internet addresses, and their messages can use up the daily allowance (error 429). With one, the allowance is yours.
 * Optional Script Property: NTFY_SERVER, for your own ntfy server instead of https://ntfy.sh.
 */

var ALERT_DAILY_LIMIT = 60;   // clock changes a day that send alerts, at most
var WARN_MINUTES = 5;         // the heads-up comes this many minutes before the end
var FIG_PAGE = 'https://dudebromanut.github.io/book-dude-next/timer/';

// Book Dude's request: { action: 'timer', event: 'start'|'add'|'pause'|'resume'|'stop', id, name, minutes, added,
// back, left, leftMs, ends (ms), endsText ('4:35 PM'), bank (minutes still in her bank), page (the Fig-o-Clock's
// address) }. Answers { ok, sent: true } or { error }.
function timerAction(r) {
  var event = String(r.event);
  if (['start', 'add', 'pause', 'resume', 'stop'].indexOf(event) < 0) return { error: 'bad' };
  var t = {
    id: clip(r.id, 24),
    name: clip(r.name, 30).replace(/[^A-Za-z .'-]/g, '') || 'Maddy',
    minutes: timerNum(r.minutes), added: timerNum(r.added), back: timerNum(r.back), left: timerNum(r.left),
    ends: Number(r.ends) > 0 ? Number(r.ends) : 0,
    endsText: /^\d{1,2}:\d\d\s?[AP]M$/.test(clip(r.endsText, 12)) ? clip(r.endsText, 12) : '',
    leftMs: Number(r.leftMs) >= 0 && Number(r.leftMs) <= 1440 * 60000 ? Math.round(Number(r.leftMs)) : 0,
    bank: r.bank === undefined || r.bank === null ? -1 : timerNum(r.bank),
    page: /^https:\/\/[\w.-]+\/[\w\/.-]*$/.test(clip(r.page, 200)) ? clip(r.page, 200) : FIG_PAGE
  };
  t.state = event === 'pause' ? 'paused' : event === 'stop' ? 'stopped' : 'running';
  var props = PropertiesService.getScriptProperties();
  // The clock as it is now, for the Fig-o-Clock page.
  props.setProperty('TIMER_NOW', JSON.stringify({
    id: t.id, state: t.state, minutes: t.minutes, ends: t.state === 'running' ? t.ends : 0, left: t.state === 'running' ? 0 : t.leftMs, bank: t.bank, at: Date.now() }));
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // The alarms are for the clock that is running now, if it is: a 5-minute warning (when there's time for one) and
    // time's up.
    clearTimerAlarm();
    var now = Date.now();
    if (t.state === 'running' && t.ends > now && t.ends - now < 25 * 3600e3) {
      ScriptApp.newTrigger('timerUp').timeBased().at(new Date(t.ends)).create();
      var warnAt = t.ends - WARN_MINUTES * 60000;
      if (warnAt - now > 60000) ScriptApp.newTrigger('timerWarn').timeBased().at(new Date(warnAt)).create();
      props.setProperty('TIMER_UP', JSON.stringify({ id: t.id, name: t.name, ends: t.ends, endsText: t.endsText, minutes: t.minutes, bank: t.bank, page: t.page, warnAt: warnAt }));
    }
  } finally {
    lock.releaseLock();
  }
  if (!countToday('alert', ALERT_DAILY_LIMIT)) return { ok: true, later: true };
  return alertBoth(event, t, figLink(t)) ? { ok: true, sent: true } : { error: 'alert' };
}

function timerNum(v) {
  var n = Math.floor(Number(v));
  return n >= 0 && n <= 100000 ? n : 0;
}
function mins(n) { return n + ' min'; }
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

// ---------------------------------------------------------------------------------------------------------------------
// What the alerts say. The grown-ups get the facts; Maddy gets Fig, in a different line most times.

var PICTURE = { start: 'awake', add: 'awake', resume: 'awake', pause: 'paused', warn: 'yawn', up: 'asleep', stop: 'asleep' };
var PRIORITY = { warn: 4, up: 5 };   // the rest are normal (3); 5 comes through even on a quiet phone

function grownupAlert(event, t) {
  var ends = t.endsText ? ', ends ' + t.endsText : '';
  var bank = t.bank >= 0 ? ' Bank: ' + mins(t.bank) + '.' : '';
  if (event === 'start') return { title: 'Screen time started', body: t.name + ': ' + mins(t.minutes) + ends + '.' + bank };
  if (event === 'add') return { title: 'More screen time', body: mins(t.added) + ' added for ' + t.name + '. ' + mins(t.left) + ' left' + ends + '.' + bank };
  if (event === 'pause') return { title: 'Screen time paused', body: t.name + ' has ' + mins(t.left) + ' left.' + bank };
  if (event === 'resume') return { title: 'Screen time is back on', body: t.name + ': ' + mins(t.left) + ' left' + ends + '.' + bank };
  if (event === 'warn') return { title: WARN_MINUTES + ' minutes left', body: t.name + '\'s screen time' + (t.endsText ? ' ends at ' + t.endsText : ' ends soon') + '.' + bank };
  if (event === 'up') return { title: 'Screen time is up!', body: t.name + '\'s screen time is over' + (t.endsText ? ' (' + t.endsText + ')' : '') + '. Time to hand over the remote.' + bank };
  return { title: 'Screen time stopped early', body: t.name + '\'s clock was stopped.' + (t.back ? ' ' + mins(t.back) + ' went back to her bank.' : '') + bank };
}

function kidAlert(event, t) {
  var bank = t.bank > 0 ? ' You have ' + mins(t.bank) + ' saved in your bank.' : '';
  var ends = t.endsText ? ' It ends at ' + t.endsText + '.' : '';
  var lines = {
    start: [
      ['Screen time! Fig is wide awake', 'Meow! You have ' + mins(t.minutes) + '. Fig is watching the clock so you don\'t have to.' + ends],
      ['Fig says: go!', mins(t.minutes) + ' of screen time, starting now. Fig had three breakfasts and is ready.' + ends],
      ['Screen time is on', 'Fig is wide awake and guarding your ' + mins(t.minutes) + '. Enjoy!' + ends]
    ],
    add: [
      ['More screen time!', mins(t.added) + ' more! Fig had a snack and woke right back up. ' + mins(t.left) + ' left.' + ends],
      ['Bonus minutes', 'Fig found ' + mins(t.added) + ' more under the couch. ' + mins(t.left) + ' left.' + ends]
    ],
    pause: [
      ['Paused', 'Fig is frozen like a statue. Your ' + mins(t.left) + ' are safe until a grown-up starts the clock again.'],
      ['Screen time on hold', 'Fig is holding perfectly still. ' + mins(t.left) + ' left for later.']
    ],
    resume: [
      ['Back on!', 'Fig stretched and is awake again. ' + mins(t.left) + ' left.' + ends],
      ['Screen time is back', 'Fig is back on duty. ' + mins(t.left) + ' to go.' + ends]
    ],
    warn: [
      [WARN_MINUTES + ' minutes left', 'Fig is yawning. Finish your level or your episode.'],
      ['Almost time', 'Fig\'s eyes are getting heavy. ' + WARN_MINUTES + ' more minutes, then nap time for the screen.'],
      ['Heads up from Fig', WARN_MINUTES + ' minutes left. Find a good stopping place.']
    ],
    up: [
      ['Time\'s up!', 'Fig is asleep, and so is the screen. Time to hand over the remote.'],
      ['Screen time is over', 'Shhh. Fig is napping in her nightcap. Screen off, please.'],
      ['Fig is asleep', 'Screen time is all done. Fig says goodnight to the screen.']
    ],
    stop: [
      ['Screen time stopped', 'A grown-up stopped the clock. Fig went back to sleep.'],
      ['All done for now', 'The clock stopped early. Fig curled up for a nap.']
    ]
  };
  var l = pick(lines[event]);
  return { title: l[0], body: l[1] + (event === 'start' || event === 'stop' || event === 'up' ? bank : '') };
}

// Sends one alert to each topic. true if the grown-ups' went (Maddy's iPad is a bonus).
function alertBoth(event, t, link) {
  var pic = (t.page || FIG_PAGE) + 'img/fig-' + PICTURE[event] + '.png';
  var g = grownupAlert(event, t), k = kidAlert(event, t);
  var ok = sendAlert(ntfyTopic('NTFY_TOPIC'), g.title, g.body, link, PRIORITY[event] || 3, pic);
  sendAlert(ntfyTopic('NTFY_KID_TOPIC'), k.title, k.body, link, PRIORITY[event] || 3, pic);
  return ok;
}

// ---------------------------------------------------------------------------------------------------------------------
// The Fig-o-Clock link

// The view-only code in the Fig-o-Clock links: made once, kept in Script Properties.
function figCode() {
  var props = PropertiesService.getScriptProperties();
  var code = props.getProperty('TIMER_VIEW');
  if (!code) { code = Utilities.getUuid().replace(/-/g, '').slice(0, 16); props.setProperty('TIMER_VIEW', code); }
  return code;
}
// The link: the clock as of this alert (after #), the view-only code, and this script's id so the page can ask for updates.
function figLink(t) {
  var id = (/\/s\/([\w-]+)\/exec/.exec(ScriptApp.getService().getUrl() || '') || [])[1] || '';
  var parts = ['s=' + { running: 'r', paused: 'p', stopped: 'x' }[t.state], 'm=' + t.minutes];
  if (t.state === 'running') parts.push('e=' + Math.round(t.ends / 1000));
  else parts.push('l=' + Math.round(t.leftMs / 1000));
  if (t.bank >= 0) parts.push('b=' + t.bank);
  if (t.name !== 'Maddy') parts.push('n=' + encodeURIComponent(t.name));
  if (id) parts.push('t=' + figCode(), 'u=' + id);
  return (t.page || FIG_PAGE) + '#' + parts.join('&');
}
// What the Fig-o-Clock page gets for its view-only code: the clock, nothing else.
function timerView(code) {
  var props = PropertiesService.getScriptProperties();
  if (!code || code !== props.getProperty('TIMER_VIEW')) return { error: 'bad' };
  var now = null;
  try { now = JSON.parse(props.getProperty('TIMER_NOW') || 'null'); } catch (e) { now = null; }
  if (!now) return { state: 'none' };
  return { id: now.id, state: now.state, minutes: now.minutes, ends: now.ends, left: now.left, bank: now.bank >= 0 ? now.bank : null };
}

// ---------------------------------------------------------------------------------------------------------------------
// The alarms

function savedClock() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TIMER_UP') || 'null'); } catch (e) { return null; }
}
function asClock(c) {
  return { state: 'running', name: c.name, minutes: c.minutes || 0, ends: c.ends, endsText: c.endsText, bank: c.bank >= 0 ? c.bank : -1, page: c.page };
}

// Five minutes left.
function timerWarn() {
  ScriptApp.getProjectTriggers().forEach(function (tr) { if (tr.getHandlerFunction() === 'timerWarn') ScriptApp.deleteTrigger(tr); });
  var c = savedClock();
  if (!c || !(c.warnAt > 0)) return;
  // Google woke this up early: set it again for the real time.
  if (Date.now() < c.warnAt - 90000) { ScriptApp.newTrigger('timerWarn').timeBased().at(new Date(c.warnAt)).create(); return; }
  if (Date.now() > c.ends - 60000) return;   // too late for a warning: time's up comes next
  var t = asClock(c);
  alertBoth('warn', t, figLink(t));
}

// Time's up: urgent, so it comes through with a long buzz even when the phone is quiet.
function timerUp() {
  var c = savedClock();
  clearTimerAlarm();
  if (!c || !(c.ends > 0)) return;
  // Google woke this up early: set it again for the real end.
  if (Date.now() < c.ends - 90000) {
    ScriptApp.newTrigger('timerUp').timeBased().at(new Date(c.ends)).create();
    PropertiesService.getScriptProperties().setProperty('TIMER_UP', JSON.stringify(c));
    return;
  }
  if (Date.now() - c.ends > 30 * 60000) return;   // long past: say nothing
  var t = asClock(c);
  alertBoth('up', t, figLink(t));
}

function clearTimerAlarm() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    var h = tr.getHandlerFunction();
    if (h === 'timerUp' || h === 'timerWarn') ScriptApp.deleteTrigger(tr);
  });
  PropertiesService.getScriptProperties().deleteProperty('TIMER_UP');
}

// ---------------------------------------------------------------------------------------------------------------------
// ntfy

// A private topic, made once from random letters and numbers and kept in Script Properties: NTFY_TOPIC for the
// grown-ups, NTFY_KID_TOPIC for Maddy's iPad.
function ntfyTopic(name) {
  var props = PropertiesService.getScriptProperties();
  var topic = props.getProperty(name);
  if (!topic) {
    topic = (name === 'NTFY_KID_TOPIC' ? 'bookdude-kid-' : 'bookdude-') + Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    props.setProperty(name, topic);
  }
  return topic;
}
function ntfyServer() { return (setting('NTFY_SERVER') || 'https://ntfy.sh').replace(/\/+$/, ''); }

// One alert. `click` is the page a tap opens and a button's too; `picture` is shown with it; priority 3 is normal,
// 5 is urgent. true if it went.
function sendAlert(topic, title, body, click, priority, picture) {
  var token = setting('NTFY_TOKEN'), res;
  // Google sometimes can't reach ntfy at all ("Address unavailable"): say so, instead of stopping the whole run.
  try {
    res = UrlFetchApp.fetch(ntfyServer() + '/', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    payload: JSON.stringify({
      topic: topic, title: String(title).slice(0, 80), message: String(body).slice(0, 400), priority: priority || 3,
      click: click || undefined, attach: picture || undefined, filename: picture ? 'fig.png' : undefined,
      actions: click ? [{ action: 'view', label: 'Fig-o-Clock', url: click }] : undefined
    })
    });
  } catch (e) {
    Logger.log('Google could not reach ntfy: ' + String(e && e.message || e).slice(0, 200) + '. Try again in a few minutes.');
    return false;
  }
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) return true;
  Logger.log('ntfy did not take the alert: ' + code + ' ' + String(res.getContentText()).slice(0, 300));
  if (code === 429 && !token) Logger.log('That is the shared allowance for Google scripts running out. Add NTFY_TOKEN (a free ntfy.sh account\'s access token) in Project Settings, Script Properties, and run timerSetup again.');
  if (code === 401 || code === 403) Logger.log('ntfy did not accept NTFY_TOKEN. Check it in Project Settings, Script Properties (it starts with tk_).');
  return false;
}

// Run this once from the editor: it makes both topics, sends a test alert to each, and prints their names.
function timerSetup() {
  var grown = ntfyTopic('NTFY_TOPIC'), kid = ntfyTopic('NTFY_KID_TOPIC');
  // The names first, so they're in the log even if ntfy can't be reached right now.
  Logger.log('In the ntfy app: tap +, paste the whole name, and tap Subscribe (leave "Use another server" off).\n\n' +
    '    Grown-ups (your phones):   ' + grown + '\n' +
    '    Maddy (her iPad):          ' + kid + '\n\n' +
    'Each name works like a password: share them only with the family. They are also in Project Settings, Script Properties (NTFY_TOPIC and NTFY_KID_TOPIC).');
  if (!setting('NTFY_TOKEN')) Logger.log('No NTFY_TOKEN yet: without one, alerts can fail with error 429 (see the top of this file).');
  var a = sendAlert(grown, 'Book Dude alerts are on', 'Grown-ups: you\'ll get the facts here when screen time starts, changes and ends.', FIG_PAGE, 3, FIG_PAGE + 'img/fig-awake.png');
  var b = sendAlert(kid, 'Hi from Fig!', 'Meow! I\'ll tell you here when screen time starts, when 5 minutes are left, and when it\'s over.', FIG_PAGE, 3, FIG_PAGE + 'img/fig-awake.png');
  Logger.log(a && b ? 'Test alerts went to both topics. Check your phone and her iPad.' : 'A test alert did not go out (see above).');
}
