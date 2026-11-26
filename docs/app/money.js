/* Book money and screen time: the jar and the screen-time card on the Progress tab, the grown-up settings on the More
 * tab, and her school AR total. */

import { C, $, esc, today, fmtNum, plural, fmtDay, DUDE, fill, dayOfYear } from './util.js';
import { icon } from './icons.js';
import { BOOKS, BY_ID } from './books.js';
import { state, saveSetting } from './state.js';
import { confirmBox, toast, celebrate, showBox, showConfirm } from './page.js';
import { renderProgress } from './progress.js';
import { renderMore } from './more.js';
import { asGrownup, isOpen, keepOpen, codePanelHtml } from './grownup.js';
import { findLink, syncSchool } from './school.js';
import { refreshBubble } from './dude-talk.js';
import { hoursText } from './cobol.js';
import { post } from './dude-ai.js';
import { party } from './meters.js';
import { cashIn } from './timer.js';

// "A trip to the bookstore" reads as "earned a trip to the bookstore" mid-sentence.
const prizeText = prize => String(prize).replace(/^(A|An|The)\b/, w => w.toLowerCase());
const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const money = n => { const s = moneyFormat.format(n); return s.endsWith('.00') ? s.slice(0, -3) : s; };
// One payout in a sentence: "$100 for your Barnes & Noble account", or the non-money prize.
export const rewardLabel = cfg => (cfg.perPoint > 0 ? money(cfg.every * cfg.perPoint) + ' for ' + cfg.where : prizeText(cfg.prize));

// The points that count for book money and screen time: her school total above the starting
// line once a grown-up has typed it in, otherwise the quiz results entered in this app; plus Book Dude's own tests.
export function rewardPoints() {
  return C.rewardPoints(C.metrics(BOOKS, state.records, '').earned, state.settings.reward, C.examPoints(state.records) + C.homePoints(state.records) + C.spellPoints(state.settings.spelling).total);
}

// Screen time: what she has earned, and the extra a book earns when she finishes it (0 for books she added).
export const screenStatus = total => C.screenTime(total, state.records, BOOKS, state.settings.reward);
export function bookExtra(b) {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.screen || !b || b._custom) return 0;
  return Object.prototype.hasOwnProperty.call(cfg.special, b.book_id) ? cfg.special[b.book_id] : cfg.bonus;
}

// Home points (for books with no AR quiz) in a sentence: " Plus 12 home points from 3 books." or ''.
function homeText() {
  const books = Object.keys(state.records).filter(id => !C.isExam(id) && state.records[id].homePoints);
  if (!books.length) return '';
  return ' Plus ' + plural(C.homePoints(state.records), 'home point') + ' from ' + plural(books.length, 'book') + ' with no AR quiz.';
}

// The quizzes from school emails counted on top of the last typed school total: ", plus 4 points from 2 new quizzes".
function schoolNewText(cfg) {
  const ids = Object.keys(cfg.schoolNew);
  if (!ids.length) return '';
  const pts = ids.reduce((sum, id) => sum + cfg.schoolNew[id], 0);
  return ', plus ' + plural(pts, 'point') + ' from ' + plural(ids.length, 'new quiz', 'new quizzes');
}

// Tells her parents (through the Google script, which emails them) about each book-money payout she has earned and
// they haven't heard about: the money to add to her account. A payout she earned while offline is told the next time
// the app can reach the script. The first time this runs on a device, payouts already earned count as told.
export async function tellPayouts() {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.on || !(cfg.perPoint > 0)) return;
  const st = C.rewardStatus(C.choices(rewardPoints(), cfg).jarPoints, cfg);
  if (typeof state.settings.payoutTold !== 'number') { await saveSetting('payoutTold', st.earned); return; }
  if (st.earned <= state.settings.payoutTold || st.owed < 1) return;
  const r = await post({ action: 'payout', n: st.earned, amount: st.payout, where: cfg.where, waiting: st.owedMoney });
  if (r && r.ok) await saveSetting('payoutTold', st.earned);
}

// One choice for 10 points, the jar side: "$10 in the jar", or "10 points in the jar" for a reward that isn't money.
const jarChoiceLabel = cfg => (cfg.perPoint > 0 ? money(10 * cfg.perPoint) : '10 points') + ' in the jar';

// What new points earned her, in one sentence for a toast (points to spend, book money, screen time), or ''.
export function pointsNews(before, after) {
  const cfg = C.reward(state.settings.reward);
  const was = C.choices(before, cfg), now = C.choices(after, cfg);
  const news = [];
  if (now.open > was.open) news.push('You have ' + fmtNum(now.open * 10) + ' points to spend on the Progress tab: ' + jarChoiceLabel(cfg) + ' or ' + cfg.minutes + ' minutes for every 10.');
  if (cfg.on && C.rewardStatus(now.jarPoints, cfg).earned > C.rewardStatus(was.jarPoints, cfg).earned) news.push('Book money is waiting: ' + rewardLabel(cfg) + '!');
  if (now.toMinutes > was.toMinutes) news.push('+' + (now.toMinutes - was.toMinutes) * cfg.minutes + ' minutes of screen time.');
  return news.join(' ');
}

// A number of AR points as typed (47 or 47.5), or null.
function pointsTyped(value) {
  const raw = String(value).trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(raw) && Number(raw) <= 100000 ? Number(raw) : null;
}

const JAR_SVG = '<svg viewBox="0 0 120 150" aria-hidden="true" focusable="false"><defs><clipPath id="jar-clip"><path d="M34 30h52v10c12 6 18 17 18 32v50c0 13-9 22-22 22H38c-13 0-22-9-22-22V72c0-15 6-26 18-32z"/></clipPath><linearGradient id="jar-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7D774"/><stop offset="1" stop-color="#D49A2A"/></linearGradient></defs><path class="jar-back" d="M34 30h52v10c12 6 18 17 18 32v50c0 13-9 22-22 22H38c-13 0-22-9-22-22V72c0-15 6-26 18-32z"/><g clip-path="url(#jar-clip)"><g class="jar-fill" data-fill="__FILL__"><path fill="url(#jar-gold)" d="M0 40q15-5 30 0t30 0 30 0 30 0V150H0z"/><g class="jar-coins"><circle cx="34" cy="132" r="8"/><circle cx="56" cy="138" r="8"/><circle cx="80" cy="131" r="8"/><circle cx="96" cy="139" r="7"/><circle cx="45" cy="116" r="8"/><circle cx="69" cy="118" r="8"/><circle cx="88" cy="112" r="7"/><circle cx="28" cy="100" r="7"/><circle cx="56" cy="98" r="8"/><circle cx="80" cy="95" r="7"/><circle cx="40" cy="80" r="7"/><circle cx="66" cy="78" r="8"/><circle cx="90" cy="76" r="6"/><circle cx="52" cy="60" r="7"/><circle cx="76" cy="58" r="7"/></g></g></g><path class="jar-glass" d="M34 30h52v10c12 6 18 17 18 32v50c0 13-9 22-22 22H38c-13 0-22-9-22-22V72c0-15 6-26 18-32z"/><path class="jar-shine" d="M26 74c-3 12-3 32 0 46"/><rect class="jar-lid" x="29" y="17" width="62" height="15" rx="4"/><rect class="jar-label" x="32" y="84" width="56" height="30" rx="4"/><text class="jar-label-text" x="60" y="97" text-anchor="middle">BOOK</text><text class="jar-label-text" x="60" y="108" text-anchor="middle">MONEY</text></svg>';

function factLine(total) {
  if (!total || !DUDE.facts.length) return 'Earn your first points and the Dude will do some very serious math about them.';
  const vars = { points: fmtNum(total), pages: fmtNum(Math.round(total * 25)), nuggets: (n => fmtNum(n) + (n === 1 ? ' pea-sized nugget' : ' pea-sized nuggets'))(Math.max(1, Math.floor(total / 10))) };
  return fill(DUDE.facts[dayOfYear() % DUDE.facts.length], vars);
}

export function jarHtml(total) {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.on) return '';
  const spent = C.choices(total, cfg);
  const jarPoints = spent.jarPoints;
  const st = C.rewardStatus(jarPoints, cfg);
  // She can move 10 points' worth out of the jar into screen time until it's deposited.
  const move = spent.jarToMove ? '<div class="row-actions move-row"><button type="button" class="btn small" data-act="move-to-minutes">Move ' +
    (cfg.perPoint > 0 ? money(10 * cfg.perPoint) : '10 points') + ' to screen time</button></div>' : '';
  const vars = { points: fmtNum(total), toGo: fmtNum(st.toGo), prize: rewardLabel(cfg) };
  let line = '';
  for (const [at, text] of DUDE.jar) if (st.frac >= at) line = text;
  const full = st.owed > 0;
  // A payout waiting with nothing yet toward the next one (the usual sight with $10 payouts) shows what's waiting.
  const waiting = full && !st.into;
  const school = cfg.school !== null;
  const counted = school ? ' points since the starting line' : ' points all time';
  return '<section class="jar-card' + (full ? ' full' : '') + '" aria-label="Book Money Jar">' +
    '<div class="jar" role="img" aria-label="' + esc(waiting ? (st.money ? money(st.owedMoney) : plural(st.owed, 'reward')) + ' waiting in the book money jar'
      : st.money ? money(st.jarMoney) + ' of ' + money(st.payout) + ' in the book money jar' : fmtNum(st.into) + ' of ' + st.every + ' points in the book money jar') + '">' +
      JAR_SVG.replace('__FILL__', (full ? 1 : st.frac).toFixed(3)) + '</div>' +
    '<div class="jar-info"><p class="jar-kicker">Book Money Jar</p>' +
      (waiting ? '<p class="jar-count"><span class="big">' + (st.money ? money(st.owedMoney) : fmtNum(st.owed)) + '</span> <span class="of">waiting</span></p>' : '') +
      (st.money
        ? (waiting ? '' : '<p class="jar-count"><span class="big">' + money(st.jarMoney) + '</span> <span class="of">of ' + money(st.payout) + '</span></p>') +
          '<p class="jar-goal">' + fmtNum(st.into) + ' of ' + st.every + ' points in the jar. At ' + st.every + ', ' + money(st.payout) + ' goes into ' + esc(cfg.where) + '.</p>'
        : (waiting ? '' : '<p class="jar-count"><span class="big">' + fmtNum(st.into) + '</span> <span class="of">of ' + st.every + ' points</span></p>') +
          '<p class="jar-goal">until ' + esc(prizeText(cfg.prize)) + '</p>') +
      '<p class="jar-line">' + esc(fill(full ? DUDE.jarFull : line, vars)) + '</p>' + move + '</div>' +
    (full ? '<div class="jar-owed"><b>' + (st.money ? money(st.owedMoney) + ' is waiting to go into ' + esc(cfg.where) : plural(st.owed, 'reward is', 'rewards are') + ' waiting for a grown-up') + '</b>' +
      '<button type="button" class="btn small" data-act="reward-given">' + (st.money ? 'Grown-up: mark as deposited' : 'Grown-up: mark one as given') + '</button></div>' : '') +
    '<div class="jar-foot">' +
      '<p class="jar-fact">' + esc(factLine(total)) + '</p>' +
      '<p class="jar-tally">' + fmtNum(total) + counted + (jarPoints !== total ? ' · ' + fmtNum(jarPoints) + ' in the jar' : '') + (st.money
        ? ' = ' + money(st.totalMoney) + ' · payouts earned: ' + st.earned + (cfg.paid ? ', deposited: ' + cfg.paid : '')
        : ' · rewards earned: ' + st.earned + (cfg.paid ? ', given: ' + cfg.paid : '')) + (school ? '' : homeText()) + '</p>' +
      (school ? '<p class="jar-tally">Points from the school’s AR report' + (cfg.schoolDate ? ', updated ' + esc(fmtDay(cfg.schoolDate)) : '') +
        schoolNewText(cfg) + '.' + homeText() + '</p>' +
        '<div class="row-actions"><button type="button" class="btn small" data-act="school-update">Grown-up: update school points</button></div>' : '') +
    '</div></section>';
}

// The screen-time card on the Progress tab: minutes waiting, progress to the next batch, and the books that earned extra.
export function screenHtml(total) {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.screen) return '';
  const st = screenStatus(total);
  const title = id => (BY_ID.get(id) || { title: id }).title;
  const rules = [cfg.minutes ? cfg.minutes + (cfg.on ? ' minutes for each 10 points you spend on it' : ' minutes for every 10 points') : '',
    cfg.bonus ? cfg.bonus + ' extra for each book from the list you finish' : '']
    .concat(Object.keys(cfg.special).filter(id => BY_ID.has(id)).map(id => title(id) + ': ' + cfg.special[id] + ' extra'))
    .filter(Boolean).join(' · ');
  return '<section class="screen-card" aria-label="Screen time">' +
    '<p class="jar-kicker">Screen time</p>' +
    '<p class="jar-count"><span class="big">' + fmtNum(st.owed) + '</span> <span class="of">' + (st.owed === 1 ? 'minute' : 'minutes') + ' waiting</span></p>' +
    (cfg.minutes && !cfg.on ? '<p class="jar-goal">' + fmtNum(st.into) + ' of 10 points toward the next ' + cfg.minutes + ' minutes.</p>' : '') +
    '<p class="screen-rules">' + esc(rules) + '</p>' +
    (st.books.length ? '<ul class="screen-books" aria-label="Books that earned extra minutes">' + st.books.slice(0, 3).map(x =>
      '<li><span>' + esc(title(x.id)) + '</span><b>+' + x.minutes + ' min</b></li>').join('') + '</ul>' : '') +
    (st.minutesToMove ? '<div class="row-actions move-row"><button type="button" class="btn small" data-act="move-to-jar">Move ' + cfg.minutes + ' minutes to the jar</button></div>' : '') +
    (st.owed ? cashInHtml() : '') +
    '<p class="jar-tally">' + fmtNum(st.earned) + ' minutes earned (' + fmtNum(st.fromPoints) + ' from points, ' + fmtNum(st.fromBooks) + ' from books)' +
      (st.given ? ' · given: ' + fmtNum(st.given) : '') + '</p>' +
  '</section>';
}

// Cashing in: open Friday after school through Sunday, once she has practiced piano enough this week. A grown-up approves
// either way, and can let her cash in outside those rules (a sick week, a long weekend).
function cashInHtml() {
  const now = new Date(), open = C.cashWindow(now.getDay(), now.getHours());
  const week = C.pianoWeek(state.settings.piano, today());
  const ready = open && week.met;
  const why = [!week.met ? 'Piano first: ' + fmtNum(week.minutes) + ' of ' + week.goal + ' minutes this week. Maple is holding the remote hostage.' : '',
    !open ? 'Cash-in opens Friday after school.' : ''].filter(Boolean).join(' ');
  return '<div class="jar-owed cash-in' + (ready ? ' ready' : ' locked') + '"><b>' + (ready ? 'Cash-in is open! Any screen: iPad, Switch, laptop or TV.' : esc(why)) + '</b>' +
    '<button type="button" class="btn small' + (ready ? ' primary' : '') + '" data-act="minutes-given">' + (ready ? 'Cash in (a grown-up approves)' : 'Grown-up: cash in anyway') + '</button></div>';
}

export async function saveReward(patch) {
  const next = C.reward(Object.assign({}, state.settings.reward, patch, { updatedAt: new Date().toISOString() }));
  await saveSetting('reward', next);
  return next;
}

export function rewardPanelHtml() {
  const head = '<section class="panel"><h2>Book money and screen time <small class="for-grownups">for grown-ups</small></h2>';
  if (!isOpen()) {
    return head + '<p class="lead">Locked with the grown-up passcode.</p>' +
      '<div class="row-actions"><button type="button" class="btn primary" data-act="unlock-panel">' + icon('lock') + 'Unlock</button></div></section>';
  }
  const cfg = C.reward(state.settings.reward);
  const total = rewardPoints();
  const jarPoints = C.choices(total, cfg).jarPoints;
  const st = C.rewardStatus(jarPoints, cfg);
  const school = cfg.school !== null;
  return head +
    '<p class="lead">Turn AR points into real rewards. ' + (school
      ? 'The points come from her total on the school’s AR report, which you type in below.'
      : cfg.code ? 'The points come from the quiz results a grown-up enters in this app; you can check them against the school’s AR report.'
      : 'The points come from the quiz results entered in this app, so it runs on the honor system; you can check them against the school’s AR report.') + '</p>' +
    '<div class="stack">' +
      codePanelHtml() +
      '<h3 class="panel-sub">Book money</h3>' +
      '<label class="switch"><input type="checkbox" id="reward-on"' + (cfg.on ? ' checked' : '') + '> Show the Book Money Jar</label>' +
      '<div class="two"><label class="field"><span>Dollars per point</span><input id="reward-per" class="input" type="text" inputmode="decimal" autocomplete="off" value="' + cfg.perPoint + '"></label>' +
      '<label class="field"><span>Points per payout</span><input id="reward-every" class="input" type="text" inputmode="numeric" autocomplete="off" value="' + cfg.every + '"></label></div>' +
      (st.money
        ? '<label class="field"><span>Where the money goes</span><input id="reward-where" class="input" type="text" maxlength="60" autocomplete="off" value="' + esc(cfg.where) + '"></label>'
        : '<label class="field"><span>The reward</span><input id="reward-prize" class="input" type="text" maxlength="80" autocomplete="off" value="' + esc(cfg.prize) + '"></label>') +
      '<div class="stepper"><span class="label" id="paid-label">' + (st.money ? 'Payouts already deposited' : 'Rewards already given') + '</span><div class="seg" role="group" aria-labelledby="paid-label">' +
        '<button type="button" data-act="paid-minus" aria-label="One fewer">−</button><output id="reward-paid">' + cfg.paid + '</output>' +
        '<button type="button" data-act="paid-plus" aria-label="One more">+</button></div></div>' +
      '<p class="hint">' + (st.money
        ? money(cfg.perPoint) + ' a point × ' + cfg.every + ' points = ' + money(st.payout) + ' each payout. ' + fmtNum(jarPoints) + ' points in the jar · ' + plural(st.earned, 'payout') + ' earned · ' + money(st.owedMoney) + ' waiting to be deposited.'
        : fmtNum(jarPoints) + ' points in the jar · ' + plural(st.earned, 'reward') + ' earned · ' + st.owed + ' waiting to be given.') +
        ' Set dollars per point to 0 for a reward that isn’t money.</p>' +
      schoolFieldsHtml(cfg, total) +
      screenFieldsHtml(cfg, total) +
      choiceFieldsHtml(cfg, total) +
    '</div></section>';
}

// The choices she has made, so a grown-up can fix a mistaken tap.
function choiceFieldsHtml(cfg, total) {
  if (!cfg.on || !cfg.screen) return '';
  const ch = C.choices(total, cfg);
  const stepper = (id, label, value) => '<div class="stepper"><span class="label" id="' + id + '-label">' + label + '</span>' +
    '<div class="seg" role="group" aria-labelledby="' + id + '-label"><button type="button" data-act="' + id + '-minus" aria-label="One fewer">−</button>' +
    '<output id="' + id + '">' + value + '</output><button type="button" data-act="' + id + '-plus" aria-label="One more">+</button></div></div>';
  return '<h3 class="panel-sub">Her choices</h3>' +
    stepper('to-jar', '10 points into the jar', ch.toJar) + stepper('to-minutes', '10 points into screen time', ch.toMinutes) +
    '<p class="hint">Every 10 points she earns is one choice she makes on the Progress tab: ' + esc(jarChoiceLabel(cfg)) + ' or ' + cfg.minutes + ' minutes. ' +
      plural(ch.batches, 'choice') + ' earned · ' + ch.open + ' waiting. Fix a mistaken tap here.</p>';
}

// A grown-up's fix to her choices; they can't add up to more than the points she has earned.
async function fixChoices(jar, minutes) {
  const ch = C.choices(rewardPoints(), state.settings.reward);
  const toJar = Math.max(0, ch.toJar + jar), toMinutes = Math.max(0, ch.toMinutes + minutes);
  if (toJar + toMinutes > ch.batches) { toast('Every 10 points she has earned already has a choice.'); return; }
  await saveReward({ toJar, toMinutes });
  renderMore();
}

// Her total from the school's AR report, so a quiz she forgets to enter in the app still counts.
function schoolFieldsHtml(cfg, total) {
  const on = cfg.school !== null;
  const link = state.settings.schoolLink || '';
  return '<h3 class="panel-sub">Quiz emails from school</h3>' +
    '<label class="field"><span>School quiz link</span><input id="school-link" class="input" type="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec?key=…" value="' + esc(link) + '"></label>' +
    '<p class="error" id="school-link-error" role="alert" hidden></p>' +
    '<p class="hint">' + (link
      ? 'Each time Book Dude opens online, new quiz results from her Renaissance emails land on her shelf with their points and % score. ' + plural((state.settings.schoolSeen || []).length, 'quiz', 'quizzes') + ' added so far.'
      : 'Paste the link from the Google script that reads her Renaissance quiz emails, and new quizzes add themselves. Setup steps are in the Book Dude repository, scripts/school-email.') + '</p>' +
    (link ? '<div class="row-actions"><button type="button" class="btn small" data-act="school-sync">Check for new quizzes now</button></div>' : '') +
    (link && state.ai && state.ai.on
      ? '<label class="switch"><input type="checkbox" id="dude-chat-on"' + (state.settings.dudeChat !== false ? ' checked' : '') + '> Let her chat with COBOL</label>' +
        '<p class="hint">Claude is on in the Google script: new quizzes come with a Dude joke, you get a weekly email, and she can ask what to read next' +
        (state.ai.chat && state.ai.chat.on ? ' and chat with COBOL (its own tab), a kid-safe AI helper on a mainframe-terminal screen, following your instructions in the script (' + esc(hoursText(state.ai.chat.hours)) + ', a limited number of messages a day). Every chat is saved in a Google Sheet you can read, and the weekly email has a summary, anything flagged and the whole week’s chat; anything worrying, and every tap of Talk to a grown-up, is emailed to you right away' : '; the chat is switched off in the script') + '.</p>'
      : '') +
    '<h3 class="panel-sub">Points from school</h3>' +
    '<label class="switch"><input type="checkbox" id="school-on"' + (on ? ' checked' : '') + '> Count her total from the school’s AR report</label>' +
    (on
      ? '<div class="two"><label class="field"><span>Her school total now</span><input id="school-total" class="input" type="text" inputmode="decimal" autocomplete="off" value="' + cfg.school + '"></label>' +
        '<label class="field"><span>Starting line</span><input id="school-start" class="input" type="text" inputmode="decimal" autocomplete="off" value="' + cfg.schoolStart + '"></label></div>' +
        '<p class="hint">Copy her total from the school’s AR report' + (cfg.schoolDate ? ' (last updated ' + esc(fmtDay(cfg.schoolDate)) + ')' : '') +
          '. Only points above the starting line count: use her total from the day the deal started, or 0 to count the whole school year. Quizzes from the school’s emails count right away, on top of this total, until you type a new one. Points from Book Dude’s own tests are added on top too. ' +
          plural(total, 'point counts', 'points count') + ' right now.</p>'
      : '<p class="hint">Turn this on to type in her total from the school’s report each week instead, so a quiz she forgets to enter here still counts.</p>');
}

function screenFieldsHtml(cfg, total) {
  const st = C.screenTime(total, state.records, BOOKS, cfg);
  const specials = Object.keys(cfg.special).filter(id => BY_ID.has(id));
  return '<h3 class="panel-sub">Screen time</h3>' +
    '<label class="switch"><input type="checkbox" id="screen-on"' + (cfg.screen ? ' checked' : '') + '> Show screen time</label>' +
    (cfg.screen
      ? '<div class="two"><label class="field"><span>Minutes for every 10 points</span><input id="screen-minutes" class="input" type="text" inputmode="numeric" autocomplete="off" value="' + cfg.minutes + '"></label>' +
        '<label class="field"><span>Extra minutes for each book from the list</span><input id="screen-bonus" class="input" type="text" inputmode="numeric" autocomplete="off" value="' + cfg.bonus + '"></label></div>' +
        (specials.length ? '<p class="hint">' + specials.map(id => esc(BY_ID.get(id).title) + ' earns ' + cfg.special[id] + ' extra minutes instead.').join(' ') + ' Books she adds herself earn no extra.</p>' : '') +
        '<label class="field"><span>Extra minutes count for books finished on or after</span><input id="screen-since" class="input" type="date" value="' + esc(cfg.since) + '" max="' + today() + '"></label>' +
        '<div class="stepper"><span class="label" id="given-label">Minutes already given</span><div class="seg" role="group" aria-labelledby="given-label">' +
          '<button type="button" data-act="given-minus" aria-label="30 minutes fewer">−</button><output id="screen-given">' + cfg.given + '</output>' +
          '<button type="button" data-act="given-plus" aria-label="30 minutes more">+</button></div></div>' +
        '<p class="hint">' + fmtNum(st.earned) + ' minutes earned · ' + fmtNum(st.given) + ' given · ' + fmtNum(st.owed) + ' waiting. The buttons change minutes given by 30.</p>'
      : '');
}

// A settings change only goes through while the grown-up passcode is open (or there is none).
const guard = fn => (...args) => {
  if (!isOpen()) { renderMore(); toast('Locked again. Tap Unlock to keep changing these.'); return undefined; }
  keepOpen();
  return fn(...args);
};
const guardAll = handlers => Object.fromEntries(Object.entries(handlers).map(([name, fn]) => [name, guard(fn)]));

export const actions = {
  'school-sync': () => syncSchool(false),
  'unlock-panel': () => asGrownup(renderMore),
  // Her pick for the next 10 points: the jar or screen time. No passcode: it's her choice.
  choose: async el => {
    const cfg = C.reward(state.settings.reward);
    const total = rewardPoints();
    const ch = C.choices(total, cfg);
    if (!ch.open) return;
    const jar = el.dataset.to === 'jar';
    const before = C.rewardStatus(ch.jarPoints, cfg).earned;
    await saveReward({ toJar: ch.toJar + (jar ? 1 : 0), toMinutes: ch.toMinutes + (jar ? 0 : 1) });
    const payout = jar && C.rewardStatus(C.choices(total, state.settings.reward).jarPoints, cfg).earned > before;
    renderProgress();
    party(jar ? 'jar' : 'minutes');
    if (payout) tellPayouts();
    toast(payout ? fill(DUDE.jarFull, { prize: rewardLabel(cfg) })
      : jar ? (cfg.perPoint > 0 ? money(10 * cfg.perPoint) : '10 points') + ' went into the jar. ' + DUDE.dog + ' heard it clink.'
      : cfg.minutes + ' minutes of screen time saved. Cash them in on the weekend.');
  },
  // Moving 10 points' worth between the jar and screen time, any time until it's deposited or given. Her call.
  'move-to-minutes': async () => {
    const cfg = C.reward(state.settings.reward);
    const ch = C.choices(rewardPoints(), cfg);
    if (!ch.jarToMove) return;
    await saveReward({ toJar: ch.toJar - 1, toMinutes: ch.toMinutes + 1 });
    renderProgress();
    toast((cfg.perPoint > 0 ? money(10 * cfg.perPoint) : '10 points') + ' moved out of the jar: ' + cfg.minutes + ' more minutes of screen time.');
  },
  'move-to-jar': async () => {
    const cfg = C.reward(state.settings.reward);
    const total = rewardPoints();
    const ch = C.choices(total, cfg);
    if (!screenStatus(total).minutesToMove) return;
    const before = C.rewardStatus(ch.jarPoints, cfg).earned;
    await saveReward({ toJar: ch.toJar + 1, toMinutes: ch.toMinutes - 1 });
    const payout = C.rewardStatus(C.choices(total, state.settings.reward).jarPoints, cfg).earned > before;
    renderProgress();
    if (payout) { celebrate(); tellPayouts(); }
    toast(payout ? fill(DUDE.jarFull, { prize: rewardLabel(cfg) })
      : cfg.minutes + ' minutes moved into the jar: ' + (cfg.perPoint > 0 ? money(10 * cfg.perPoint) : '10 points') + '. ' + DUDE.dog + ' heard it clink.');
  },
  'to-jar-minus': guard(() => fixChoices(-1, 0)),
  'to-jar-plus': guard(() => fixChoices(1, 0)),
  'to-minutes-minus': guard(() => fixChoices(0, -1)),
  'to-minutes-plus': guard(() => fixChoices(0, 1)),
  // Everything waiting at once: with small payouts, several can pile up between check-ins.
  'reward-given': () => asGrownup(() => {
    const cfg = C.reward(state.settings.reward);
    const st = C.rewardStatus(C.choices(rewardPoints(), cfg).jarPoints, cfg);
    if (!st.owed) return;
    const cash = cfg.perPoint > 0;
    const amount = money(st.owedMoney);
    const prize = st.owed === 1 ? prizeText(cfg.prize) : st.owed + ' × ' + prizeText(cfg.prize);
    showConfirm(cash ? 'Mark ' + amount + ' as deposited?' : st.owed === 1 ? 'Mark book money as given?' : 'Mark ' + st.owed + ' rewards as given?',
      cash ? '<p>Tap this after ' + esc(amount) + ' goes into ' + esc(cfg.where) + '. The jar keeps counting toward the next ' + esc(money(st.payout)) + '.</p>'
        : '<p>Tap this after a grown-up hands over ' + esc(prize) + '. The jar keeps counting toward the next one.</p>',
      cash ? 'Mark as deposited' : 'Mark as given', async () => {
        await saveReward({ paid: cfg.paid + st.owed });
        renderProgress();
        toast(cash ? amount + ' deposited! Enjoy the bookstore. (Socks required.)' : 'Marked as given. Enjoy the bookstore! (Socks optional. Kidding. Socks required.)');
      });
  }),
  'paid-minus': guard(async () => { const cfg = C.reward(state.settings.reward); await saveReward({ paid: Math.max(0, cfg.paid - 1) }); renderMore(); }),
  'paid-plus': guard(async () => { const cfg = C.reward(state.settings.reward); await saveReward({ paid: cfg.paid + 1 }); renderMore(); }),
  // She may use some minutes now and save the rest, so the grown-up picks how many.
  'minutes-given': () => asGrownup(() => {
    const owed = screenStatus(rewardPoints()).owed;
    if (!owed) return;
    showBox('Cash in screen time',
      '<p>' + plural(owed, 'minute is', 'minutes are') + ' waiting. Tap how many she’s using now, on any screen. The clock starts right away, on every phone signed in; the rest stays saved for later.</p>' +
      '<div class="row-actions">' + [15, 30, 60].filter(n => n < owed).map(n => '<button type="button" class="btn" data-act="minutes-give" data-min="' + n + '">' + n + ' minutes</button>').join('') +
        '<button type="button" class="btn primary" data-act="minutes-give" data-min="' + owed + '">All ' + fmtNum(owed) + '</button>' +
        '<button type="button" class="btn" data-act="close-confirm">Cancel</button></div>');
  }),
  'minutes-give': async el => {
    const n = Number(el.dataset.min);
    confirmBox.close();
    if (!(n > 0)) return;
    await saveReward({ given: C.reward(state.settings.reward).given + n });
    const clock = await cashIn(n);
    renderProgress();
    toast(plural(n, 'minute') + ' of screen time cashed in. ' + (clock || 'The Dude recommends stretching first.'));
  },
  'given-minus': guard(async () => { const cfg = C.reward(state.settings.reward); await saveReward({ given: Math.max(0, cfg.given - 30) }); renderMore(); }),
  'given-plus': guard(async () => { const cfg = C.reward(state.settings.reward); await saveReward({ given: cfg.given + 30 }); renderMore(); }),
  // The weekly check-in: her new total from the school's AR report, typed in on the Progress tab.
  'school-update': () => asGrownup(() => {
    const cfg = C.reward(state.settings.reward);
    showBox('Update school points',
      '<form class="stack" data-form="school" novalidate>' +
        '<label class="field"><span>Her total on the school’s AR report</span><input id="school-quick" class="input" type="text" inputmode="decimal" autocomplete="off" value="' + (cfg.school !== null ? cfg.school : '') + '"></label>' +
        '<p class="error" id="school-error" role="alert" hidden></p>' +
        '<p class="hint">Points above ' + fmtNum(cfg.schoolStart) + ', the starting line, count for book money and screen time.' +
          (Object.keys(cfg.schoolNew).length ? ' Quizzes from school emails since your last update are counted until you save: the new total already includes them.' : '') + '</p>' +
        '<div class="row-actions"><button type="submit" class="btn primary">Save</button><button type="button" class="btn" data-act="close-confirm">Cancel</button></div>' +
      '</form>');
  })
};

export const submits = {
  school: async form => {
    const n = pointsTyped($('#school-quick', form).value);
    const err = $('#school-error', form);
    if (n === null) { err.textContent = 'Type her total from the report, like 47 or 47.5.'; err.hidden = false; return; }
    const before = rewardPoints();
    await saveReward({ school: n, schoolDate: today(), schoolNew: {} });
    confirmBox.close();
    renderProgress();
    const news = pointsNews(before, rewardPoints());
    if (news) celebrate();
    toast('School points updated: ' + fmtNum(n) + '.' + (news ? ' ' + news : ''));
  }
};

// Every field in the grown-up settings.
export const changes = guardAll({
  'dude-chat-on': async t => {
    await saveSetting('dudeChat', t.checked);
    refreshBubble();
    toast(t.checked ? 'COBOL’s chat is on.' : 'COBOL’s chat is off on this device. Its history file and test still work.');
  },
  'school-link': async t => {
    const typed = t.value.trim();
    const url = findLink(typed);
    if (typed && !url) {
      const err = $('#school-link-error');
      err.textContent = 'That isn’t the whole school quiz link. It starts with https://script.google.com/macros/s/ and ends with /exec?key= and the code from the script’s log. Nothing was saved.';
      err.hidden = false;
      return;
    }
    await saveSetting('schoolLink', url);
    renderMore();
    if (url) { toast('School quiz link saved. Checking for quizzes…'); syncSchool(false); } else toast('School quiz link removed.');
  },
  'reward-on': async t => {
    await saveReward({ on: t.checked });
    toast(t.checked ? 'The Book Money Jar is on the Progress tab.' : 'The Book Money Jar is hidden.');
  },
  'reward-every': async t => {
    const n = Number(t.value.trim());
    if (!Number.isInteger(n) || n < 1 || n > 10000) { toast('Points for each reward must be a whole number, like 10.'); t.value = C.reward(state.settings.reward).every; return; }
    await saveReward({ every: n });
    renderMore();
  },
  'reward-per': async t => {
    const raw = t.value.trim().replace('$', '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > 1000) { toast('Dollars per point must be a number, like 1 or 0.50.'); t.value = C.reward(state.settings.reward).perPoint; return; }
    await saveReward({ perPoint: Number(raw) });
    renderMore();
  },
  'reward-where': async t => {
    await saveReward({ where: t.value });
    t.value = state.settings.reward.where;
  },
  'reward-prize': async t => {
    await saveReward({ prize: t.value });
    t.value = state.settings.reward.prize;
  },
  // Turning school points on starts from the points she has now, so nothing jumps until a grown-up types her totals.
  'school-on': async t => {
    const cfg = C.reward(state.settings.reward);
    await saveReward(t.checked ? { school: rewardPoints(), schoolStart: 0, schoolDate: '', schoolNew: {} } : { school: null, schoolNew: {} });
    renderMore();
    toast(t.checked ? 'Type her total from the school’s AR report.' : 'Points come from the quiz results entered in this app again.');
    if (t.checked && cfg.school === null) { const input = $('#school-total'); if (input) input.focus(); }
  },
  'school-total': async t => {
    const n = pointsTyped(t.value);
    if (n === null) { toast('Type her total from the report, like 47 or 47.5.'); t.value = C.reward(state.settings.reward).school; return; }
    await saveReward({ school: n, schoolDate: today(), schoolNew: {} });
    renderMore();
  },
  'school-start': async t => {
    const n = pointsTyped(t.value);
    if (n === null) { toast('The starting line must be a number of points, like 40 or 0.'); t.value = C.reward(state.settings.reward).schoolStart; return; }
    await saveReward({ schoolStart: n });
    renderMore();
  },
  'screen-on': async t => {
    await saveReward({ screen: t.checked });
    renderMore();
    toast(t.checked ? 'Screen time is on the Progress tab.' : 'Screen time is hidden.');
  },
  'screen-minutes': async t => {
    const n = Number(t.value.trim());
    if (!/^\d+$/.test(t.value.trim()) || n > 1000) { toast('Minutes must be a whole number, like 60.'); t.value = C.reward(state.settings.reward).minutes; return; }
    await saveReward({ minutes: n });
    renderMore();
  },
  'screen-bonus': async t => {
    const n = Number(t.value.trim());
    if (!/^\d+$/.test(t.value.trim()) || n > 1000) { toast('Minutes must be a whole number, like 30.'); t.value = C.reward(state.settings.reward).bonus; return; }
    await saveReward({ bonus: n });
    renderMore();
  },
  'screen-since': async t => {
    if (!C.day(t.value)) { toast('Pick the first day extra minutes count.'); t.value = C.reward(state.settings.reward).since; return; }
    await saveReward({ since: t.value });
    renderMore();
  }
});
