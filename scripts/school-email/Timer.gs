/**
 * The screen-time clock's texts, server side (Google Apps Script), for Book Dude.
 *
 * When a grown-up cashes in screen time in Book Dude, or pauses, resumes or stops the clock, the app tells this script
 * (through doPost in Code.gs, with the same key as everything else Book Dude sends), and it texts the grown-ups through
 * Twilio. While the clock runs, the script also sets itself an alarm for the end and texts "time's up" then, whether or
 * not anyone has Book Dude open.
 *
 * SETUP: in the Book Dude Apps Script project, click + next to Files, choose Script, name it Timer, and paste in this
 * file. In Code.gs, doPost needs this line (it is in the current Code.gs):
 *   if (r.action === 'timer') return json(typeof timerAction === 'function' ? timerAction(r) : { ok: true, off: true });
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

// Book Dude's request: { action: 'timer', event: 'start'|'add'|'pause'|'resume'|'stop', id, name, minutes, added,
// back, left, ends (ms), endsText ('4:35 PM') }. Answers { ok, texted } or { ok, off } (texts not set up) or { error }.
function timerAction(r) {
  var event = String(r.event);
  if (['start', 'add', 'pause', 'resume', 'stop'].indexOf(event) < 0) return { error: 'bad' };
  var t = {
    id: clip(r.id, 24),
    name: clip(r.name, 30).replace(/[^A-Za-z .'-]/g, '') || 'Maddy',
    minutes: timerNum(r.minutes), added: timerNum(r.added), back: timerNum(r.back), left: timerNum(r.left),
    ends: Number(r.ends) > 0 ? Number(r.ends) : 0,
    endsText: /^\d{1,2}:\d\d\s?[AP]M$/.test(clip(r.endsText, 12)) ? clip(r.endsText, 12) : ''
  };
  if (!textsOn()) return { ok: true, off: true };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // One alarm at a time: for the clock that is running now, if it is.
    clearTimerAlarm();
    var running = event === 'start' || event === 'add' || event === 'resume';
    if (running && t.ends > Date.now() && t.ends - Date.now() < 25 * 3600e3) {
      ScriptApp.newTrigger('timerUp').timeBased().at(new Date(t.ends)).create();
      PropertiesService.getScriptProperties().setProperty('TIMER_UP', JSON.stringify({ id: t.id, name: t.name, ends: t.ends, endsText: t.endsText }));
    }
  } finally {
    lock.releaseLock();
  }
  if (!countToday('text', TEXT_DAILY_LIMIT)) return { ok: true, later: true };
  var n = sendText(timerMessage(event, t));
  return n ? { ok: true, texted: n } : { error: 'text' };
}

function timerNum(v) {
  var n = Math.floor(Number(v));
  return n >= 0 && n <= 100000 ? n : 0;
}
function mins(n) { return n + ' min'; }

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
  sendText('Book Dude: ' + t.name + '\'s screen time is up' + (t.endsText ? ' (' + t.endsText + ')' : '') + '. Time to hand over the remote.');
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
      payload: { To: to, From: from, Body: String(body).slice(0, 320) },
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
