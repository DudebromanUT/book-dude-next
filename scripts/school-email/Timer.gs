/**
 * The screen-time clock's texts, server side (Google Apps Script), for Book Dude.
 *
 * When a grown-up cashes in screen time in Book Dude, or pauses, resumes or stops the clock, the app tells this script
 * (through doPost in Code.gs, with the same key as everything else Book Dude sends), and it texts the grown-ups through
 * Twilio. While the clock runs, the script also sets itself an alarm for the end and texts "time's up" then, whether or
 * not anyone has Book Dude open. Each text says how many minutes are still in her bank, and ends with a link to the
 * Fig-o-Clock: a live countdown page where Fig the cat gets sleepier as time runs out. The page asks this script for the
 * clock with a view-only code (doGet in Code.gs, ?clock=...), which shows the clock and nothing else.
 *
 * SETUP: in the Book Dude Apps Script project, click + next to Files, choose Script, name it Timer, and paste in this
 * file. Code.gs hands the clock's requests to this file (doPost's 'timer' line and doGet's 'clock' line, both in the
 * current Code.gs).
 * Then, in Project Settings > Script Properties, add:
 *   TWILIO_SID    your Twilio Account SID (it starts with AC)
 *   TWILIO_TOKEN  your Twilio Auth Token. It is a secret: it goes here and nowhere else.
 *   TWILIO_FROM   your Twilio phone number, like +18885551234
 *   TEXT_TO       the phones to text, with commas between them, like +18015551234, +18015555678
 * Run timerTextTest() once from the editor: both phones should get a test text. Then Deploy > Manage deployments >
 * pencil > Version: New version > Deploy (the link stays the same).
 * Without those properties the clock still works in Book Dude; nothing is texted.
 */

var TEXT_DAILY_LIMIT = 40;   // texts a day at most (each one goes to every phone in TEXT_TO)

var FIG_PAGE = 'https://dudebromanut.github.io/book-dude-next/timer/';

// Book Dude's request: { action: 'timer', event: 'start'|'add'|'pause'|'resume'|'stop', id, name, minutes, added,
// back, left, leftMs, ends (ms), endsText ('4:35 PM'), bank (minutes still in her bank), page (the Fig-o-Clock's
// address) }. Answers { ok, texted } or { ok, off } (texts not set up) or { error }.
function timerAction(r) {
  var event = String(r.event);
  if (['start', 'add', 'pause', 'resume', 'stop'].indexOf(event) < 0) return { error: 'bad' };
  var t = {
    id: clip(r.id, 24),
    name: clip(r.name, 30).replace(/[^A-Za-z .'-]/g, '') || 'Maddy',
    minutes: timerNum(r.minutes), added: timerNum(r.added), back: timerNum(r.back), left: timerNum(r.left),
    ends: Number(r.ends) > 0 ? Number(r.ends) : 0,
    endsText: /^\d{1,2}:\d\d\s?[AP]M$/.test(clip(r.endsText, 12)) ? clip(r.endsText, 12) : '',
    leftMs: Number(r.leftMs) >= 0 && Number(r.leftMs) <= 1440 * 60000 ? Math.round(Number(r.leftMs)) : 0, bank: r.bank === undefined || r.bank === null ? -1 : timerNum(r.bank),
    page: /^https:\/\/[\w.-]+\/[\w\/.-]*$/.test(clip(r.page, 200)) ? clip(r.page, 200) : FIG_PAGE
  };
  t.state = event === 'pause' ? 'paused' : event === 'stop' ? 'stopped' : 'running';
  // The clock as it is now, for the Fig-o-Clock page.
  PropertiesService.getScriptProperties().setProperty('TIMER_NOW', JSON.stringify({
    id: t.id, state: t.state, minutes: t.minutes, ends: t.state === 'running' ? t.ends : 0, left: t.state === 'running' ? 0 : t.leftMs, bank: t.bank, at: Date.now() }));
  if (!textsOn()) return { ok: true, off: true };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // One alarm at a time: for the clock that is running now, if it is.
    clearTimerAlarm();
    var running = event === 'start' || event === 'add' || event === 'resume';
    if (running && t.ends > Date.now() && t.ends - Date.now() < 25 * 3600e3) {
      ScriptApp.newTrigger('timerUp').timeBased().at(new Date(t.ends)).create();
      PropertiesService.getScriptProperties().setProperty('TIMER_UP', JSON.stringify({ id: t.id, name: t.name, ends: t.ends, endsText: t.endsText, minutes: t.minutes, bank: t.bank, page: t.page }));
    }
  } finally {
    lock.releaseLock();
  }
  if (!countToday('text', TEXT_DAILY_LIMIT)) return { ok: true, later: true };
  var n = sendText(timerMessage(event, t) + bankLine(t.bank) + '\nFig-o-Clock: ' + figLink(t));
  return n ? { ok: true, texted: n } : { error: 'text' };
}

function timerNum(v) {
  var n = Math.floor(Number(v));
  return n >= 0 && n <= 100000 ? n : 0;
}
function mins(n) { return n + ' min'; }
function bankLine(bank) { return bank >= 0 ? ' Bank: ' + mins(bank) + '.' : ''; }

// The view-only code in the Fig-o-Clock links: made once, kept in Script Properties.
function figCode() {
  var props = PropertiesService.getScriptProperties();
  var code = props.getProperty('TIMER_VIEW');
  if (!code) { code = Utilities.getUuid().replace(/-/g, '').slice(0, 16); props.setProperty('TIMER_VIEW', code); }
  return code;
}
// The link: the clock as of this text (after #), the view-only code, and this script's id so the page can ask for updates.
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

function timerMessage(event, t) {
  var who = t.name + '\'s screen time';
  var ends = t.endsText ? ', ends ' + t.endsText : '';
  if (event === 'start') return 'Book Dude: ' + who + ' started: ' + mins(t.minutes) + ends + '.';
  if (event === 'add') return 'Book Dude: ' + mins(t.added) + ' added to ' + who + '. ' + mins(t.left) + ' left' + ends + '.';
  if (event === 'pause') return 'Book Dude: ' + who + ' is paused with ' + mins(t.left) + ' left.';
  if (event === 'resume') return 'Book Dude: ' + who + ' is back on: ' + mins(t.left) + ' left' + ends + '.';
  return 'Book Dude: ' + who + ' was stopped early.' + (t.back ? ' ' + mins(t.back) + ' went back to her bank.' : '');
}

// The alarm at the end of the clock: "time's up", to every phone.
function timerUp() {
  var props = PropertiesService.getScriptProperties();
  var t = null;
  try { t = JSON.parse(props.getProperty('TIMER_UP') || 'null'); } catch (e) { t = null; }
  clearTimerAlarm();
  if (!t || !(t.ends > 0)) return;
  // Google woke this up early: set it again for the real end.
  if (Date.now() < t.ends - 90000) {
    ScriptApp.newTrigger('timerUp').timeBased().at(new Date(t.ends)).create();
    props.setProperty('TIMER_UP', JSON.stringify(t));
    return;
  }
  if (Date.now() - t.ends > 30 * 60000 || !textsOn()) return;   // long past: say nothing
  sendText('Book Dude: ' + t.name + '\'s screen time is up' + (t.endsText ? ' (' + t.endsText + ')' : '') + '. Time to hand over the remote.' +
    bankLine(t.bank >= 0 ? t.bank : -1) + '\nFig-o-Clock: ' + figLink({ state: 'running', minutes: t.minutes || 0, ends: t.ends, bank: t.bank >= 0 ? t.bank : -1, name: t.name, page: t.page }));
}

function clearTimerAlarm() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'timerUp') ScriptApp.deleteTrigger(tr);
  });
  PropertiesService.getScriptProperties().deleteProperty('TIMER_UP');
}

// ---------------------------------------------------------------------------------------------------------------------
// Twilio

function textPhone(s) {
  var raw = String(s || '').replace(/[^\d+]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  var d = raw.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}
function textNumbers() {
  var seen = {};
  return String(setting('TEXT_TO') || '').split(/[,;]+/).map(textPhone).filter(function (p) {
    if (!p || seen[p]) return false;
    seen[p] = true;
    return true;
  }).slice(0, 5);
}
function textsOn() {
  return !!(setting('TWILIO_SID') && setting('TWILIO_TOKEN') && textPhone(setting('TWILIO_FROM')) && textNumbers().length);
}

// Sends `body` to every phone in TEXT_TO. Returns how many went out.
function sendText(body) {
  var sid = setting('TWILIO_SID'), token = setting('TWILIO_TOKEN'), from = textPhone(setting('TWILIO_FROM'));
  var sent = 0;
  textNumbers().forEach(function (to) {
    var res = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Messages.json', {
      method: 'post',
      payload: { To: to, From: from, Body: String(body).slice(0, 600) },
      headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + token) },
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) sent++;
    else Logger.log('Twilio did not send to ' + to.slice(0, -4) + '****: ' + code + ' ' + String(res.getContentText()).slice(0, 300));
  });
  return sent;
}

// Run this from the editor after adding the Script Properties: every phone in TEXT_TO should get a test text.
function timerTextTest() {
  if (!textsOn()) {
    Logger.log('Texts are not set up yet: add TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM and TEXT_TO in Project Settings, Script Properties.');
    return;
  }
  var n = sendText('Book Dude: texts work. You\'ll hear from me when screen time starts, changes and ends.');
  Logger.log(n + ' of ' + textNumbers().length + ' test texts went out.' + (n < textNumbers().length ? ' The log above says what Twilio answered.' : ''));
}
