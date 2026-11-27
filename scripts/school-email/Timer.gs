/**
 * The screen-time clock's alerts, server side (Google Apps Script), for Book Dude.
 *
 * When a grown-up cashes in screen time in Book Dude, or pauses, resumes or stops the clock, the app tells this script
 * (through doPost in Code.gs, with the same key as everything else Book Dude sends), and it sends a notification to
 * everyone subscribed in the free ntfy app (ntfy.sh): the grown-ups' iPhones and Maddy's iPad. While the clock runs,
 * the script also sets itself an alarm for the end and sends "time's up" then, as an urgent alert, whether or not
 * anyone has Book Dude open. Each alert says how many minutes are still in her bank, and tapping it opens the
 * Fig-o-Clock: a live countdown page where Fig the cat gets sleepier as time runs out. The page asks this script for
 * the clock with a view-only code (doGet in Code.gs, ?clock=...), which shows the clock and nothing else.
 *
 * SETUP: in the Book Dude Apps Script project, click + next to Files, choose Script, name it Timer, and paste in this
 * file. Code.gs hands the clock's requests to this file (doPost's 'timer' line and doGet's 'clock' line, both in the
 * current Code.gs). Then pick timerSetup in the function menu and click Run: it makes the family's private ntfy topic,
 * sends a test alert to it, and prints the topic's name. In the ntfy app on each device, tap +, type that name exactly,
 * and Subscribe. Then Deploy > Manage deployments > pencil > Version: New version > Deploy (the link stays the same).
 *
 * The topic's name works like a password: anyone who knows it can see these alerts, so share it only with the family.
 * Optional Script Property: NTFY_SERVER, for your own ntfy server instead of https://ntfy.sh.
 */

var ALERT_DAILY_LIMIT = 60;   // alerts a day at most

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
    leftMs: Number(r.leftMs) >= 0 && Number(r.leftMs) <= 1440 * 60000 ? Math.round(Number(r.leftMs)) : 0, bank: r.bank === undefined || r.bank === null ? -1 : timerNum(r.bank),
    page: /^https:\/\/[\w.-]+\/[\w\/.-]*$/.test(clip(r.page, 200)) ? clip(r.page, 200) : FIG_PAGE
  };
  t.state = event === 'pause' ? 'paused' : event === 'stop' ? 'stopped' : 'running';
  // The clock as it is now, for the Fig-o-Clock page.
  PropertiesService.getScriptProperties().setProperty('TIMER_NOW', JSON.stringify({
    id: t.id, state: t.state, minutes: t.minutes, ends: t.state === 'running' ? t.ends : 0, left: t.state === 'running' ? 0 : t.leftMs, bank: t.bank, at: Date.now() }));
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
  if (!countToday('alert', ALERT_DAILY_LIMIT)) return { ok: true, later: true };
  var m = timerMessage(event, t);
  return sendAlert(m.title, m.body + bankLine(t.bank), figLink(t), 3) ? { ok: true, sent: true } : { error: 'alert' };
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

// Each alert's title and first line.
function timerMessage(event, t) {
  var ends = t.endsText ? ', ends ' + t.endsText : '';
  if (event === 'start') return { title: 'Screen time started', body: t.name + ': ' + mins(t.minutes) + ends + '.' };
  if (event === 'add') return { title: 'More screen time', body: mins(t.added) + ' added for ' + t.name + '. ' + mins(t.left) + ' left' + ends + '.' };
  if (event === 'pause') return { title: 'Screen time paused', body: t.name + ' has ' + mins(t.left) + ' left.' };
  if (event === 'resume') return { title: 'Screen time is back on', body: t.name + ': ' + mins(t.left) + ' left' + ends + '.' };
  return { title: 'Screen time stopped early', body: t.name + '\'s clock was stopped.' + (t.back ? ' ' + mins(t.back) + ' went back to her bank.' : '') };
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
  if (Date.now() - t.ends > 30 * 60000) return;   // long past: say nothing
  // Urgent, so it comes through with a long buzz even when the phone is quiet.
  sendAlert('Screen time is up!', t.name + '\'s screen time is over' + (t.endsText ? ' (' + t.endsText + ')' : '') + '. Time to hand over the remote.' +
    bankLine(t.bank >= 0 ? t.bank : -1), figLink({ state: 'running', minutes: t.minutes || 0, ends: t.ends, bank: t.bank >= 0 ? t.bank : -1, name: t.name, page: t.page }), 5);
}

function clearTimerAlarm() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'timerUp') ScriptApp.deleteTrigger(tr);
  });
  PropertiesService.getScriptProperties().deleteProperty('TIMER_UP');
}

// ---------------------------------------------------------------------------------------------------------------------
// ntfy

// The family's private topic: made once, from random letters and numbers, and kept in Script Properties.
function ntfyTopic() {
  var props = PropertiesService.getScriptProperties();
  var topic = props.getProperty('NTFY_TOPIC');
  if (!topic) { topic = 'bookdude-' + Utilities.getUuid().replace(/-/g, '').slice(0, 20); props.setProperty('NTFY_TOPIC', topic); }
  return topic;
}
function ntfyServer() { return (setting('NTFY_SERVER') || 'https://ntfy.sh').replace(/\/+$/, ''); }

// One alert to everyone subscribed. `click` is the page a tap opens; priority 3 is normal, 5 is urgent. true if it went.
function sendAlert(title, body, click, priority) {
  var res = UrlFetchApp.fetch(ntfyServer() + '/', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ topic: ntfyTopic(), title: String(title).slice(0, 80), message: String(body).slice(0, 400),
      click: click || undefined, priority: priority || 3, actions: click ? [{ action: 'view', label: 'Fig-o-Clock', url: click }] : undefined })
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) return true;
  Logger.log('ntfy did not take the alert: ' + code + ' ' + String(res.getContentText()).slice(0, 300));
  return false;
}

// Run this once from the editor: it makes the family's topic, sends a test alert, and prints the name to subscribe to.
function timerSetup() {
  var topic = ntfyTopic();
  var ok = sendAlert('Book Dude alerts are on', 'You\'ll get an alert here when screen time starts, changes and ends.', FIG_PAGE, 3);
  Logger.log((ok ? 'A test alert went to the topic.' : 'The test alert did not go out (see above).') +
    ' In the ntfy app on each family device: tap +, type this topic name exactly, and tap Subscribe:\n\n    ' + topic +
    '\n\nThe name works like a password: share it only with the family.');
}
