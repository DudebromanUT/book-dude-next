/* "How Book Dude works": a plain-language guide for grown-ups, opened from the top of Settings. It explains the rules
 * (where points come from, what 10 points buy, screen time and piano) and the grown-up to-do list, using this family's
 * own numbers from the reward settings, the AR goals and the piano goal, so it stays right when those change. */

import { C, esc, fmtNum } from './util.js';
import { state } from './state.js';
import { sheet, sheetBar } from './page.js';

const money = n => '$' + fmtNum(n);

export function guideButtonHtml() {
  return '<section class="panel guide-card"><h2>New here? Start with this</h2>' +
    '<p class="lead">How points, book money, screen time and piano work, and what a grown-up needs to do, in plain words.</p>' +
    '<div class="row-actions"><button type="button" class="btn primary" data-act="guide">How Book Dude works</button></div></section>';
}

function guideHtml() {
  const cfg = C.reward(state.settings.reward), ar = C.arTrack(state.settings.arTrack);
  const name = (state.settings.readerName || '').trim() || 'She';
  const her = name === 'She' ? 'her' : name + '’s';
  // The setting is written to her ("your Greenlight account"); the guide talks about her.
  const where = (cfg.where || '').replace(/^your\b/i, 'her');
  const tenMoney = cfg.perPoint > 0 ? money(10 * cfg.perPoint) + (where ? ' in ' + where : '') : '10 points toward ' + cfg.prize;
  const both = cfg.on && cfg.screen;
  const sec = (title, body) => '<section class="guide-sec"><h2>' + title + '</h2>' + body + '</section>';
  const ul = items => '<ul>' + items.map(t => '<li>' + t + '</li>').join('') + '</ul>';
  return sheetBar('How Book Dude works') + '<div class="sheet-body guide">' +
    '<div><p class="kicker">For grown-ups</p><h1>How Book Dude works</h1></div>' +

    sec('The short version', '<p>' + esc(name) + ' reads, takes quizzes, and earns points. ' +
      (both ? 'Every 10 points, she picks one: <b>' + esc(tenMoney) + '</b> or <b>' + cfg.minutes + ' minutes of screen time</b>.'
        : cfg.on ? 'Every ' + cfg.every + ' points earns <b>' + esc(tenMoney) + '</b>.' : cfg.screen ? 'Every 10 points earns <b>' + cfg.minutes + ' minutes of screen time</b>.' : 'Rewards are switched off for now.') +
      ' Most of it runs by itself. Grown-ups mostly approve things.</p>') +

    sec('Where points come from', ul([
      '<b>AR quizzes at school.</b> When the school emails a quiz result, it lands in Book Dude by itself, with its points. Nothing to type.',
      '<b>Library tests in the COBOL tab.</b> Articles with a short test. Passing one earns 2 points for a short article or 4 for a long one, plus 1 bonus point for answering the think-about-it question.',
      '<b>Home points.</b> For a book the school has no AR quiz for, a grown-up can give points on that book’s page (Home points box, passcode needed).',
      '<b>Spelling BB</b> (Games tab). Spelling a word right twice in a row makes it a gem. Every 10 gems earn 1 point on One Bee, 2 on Two Bee, 3 on Three Bee; finishing a list adds 5, 10 or 15; Bee-round streaks of 10, 25 and 50 add 1 each. A word she had missed before counts double. Each word pays once, and points are never taken back.',
      'All of these count the same toward money and screen time.'
    ]) + '<p class="hint">AR points are also tracked on their own on the Progress tab, against the school goal: ' + fmtNum(ar.goal.quarter) + ' a quarter, ' + fmtNum(ar.goal.year) + ' for the year. Library tests, home points and spelling never count as AR.</p>') +

    (both ? sec('Spending 10 points', ul([
      'On the Progress tab, Fig’s litter box gets cleaner with every point. At 10 it’s clean, and two buttons appear: <b>' + esc(tenMoney) + '</b> or <b>' + cfg.minutes + ' minutes</b>. It’s her choice; no passcode.',
      '<b>Money:</b> everyone on the Sunday email list (below) gets an email saying to add the money. Add it, then tap <b>Grown-up: mark as deposited</b> on the Book Money Jar.',
      '<b>Minutes:</b> they wait on the Screen time card until she cashes them in (below).',
      'Tapped the wrong one? Settings → Book money and screen time → Her choices fixes it.'
    ])) : '') +

    (cfg.screen ? sec('Screen time and piano', ul([
      '<b>One bank of minutes</b>, for any screen: iPad, Switch, laptop or TV. Each device keeps its own normal daily limit; these are extra.',
      cfg.bonus ? 'Finishing a book from the Book Dude list adds ' + cfg.bonus + ' extra minutes (a few special books earn more).' : '',
      '<b>Cashing in</b> opens Friday after school (3 pm) through Sunday, and only once she has practiced piano <b>' + C.PIANO_GOAL + ' minutes</b> that week (Monday to Sunday).',
      'She taps <b>Cash in</b>, a grown-up enters the passcode and picks how many minutes she’s using (15, 30, 60 or all). <b>The clock starts right away</b>: a countdown at the top of every tab, the same on every phone signed in to the family account. Cashing in more while it runs adds to it.',
      '<b>Pause</b> and <b>Stop</b> are on the countdown (passcode). Stopping early puts the unused minutes back in her bank. When it runs out, any phone with Book Dude open chimes and says so.',
      '<b>Alerts:</b> in the free <b>ntfy</b> app when the clock starts, changes, has 5 minutes left and runs out, even with Book Dude closed. Grown-ups get the facts and her bank; her iPad gets Fig talking to her. Each comes with a picture of Fig; tap it for the <b>Fig-o-Clock</b>, a live countdown where Fig gets sleepier as time runs out. Turn them on in <b>Settings → Screen-time alerts</b>.',
      'Sick week or a holiday? <b>Grown-up: cash in anyway</b> skips the rules.',
      '<b>Piano:</b> on the Piano practice card, tap <b>+</b> for each 15 minutes she practices (passcode). Piano doesn’t earn minutes; it unlocks cashing in.'
    ].filter(Boolean))) : '') +

    sec('The Sunday email', '<p>Every Sunday morning the grown-ups on the list get an email about ' + esc(her === 'her' ? 'her' : her.replace(/’s$/, '') + '’s') + ' week: quizzes and points, money and minutes waiting, books finished and being read, Library tests passed, a few dinner-table questions about each book, and a summary of her chats with COBOL (anything worrying is emailed right away, too). The same list gets the money emails.</p>' +
      '<p class="hint">The list is kept in the school-email Google script, not in Book Dude, so a Book Dude invite or sign-in doesn’t add anyone. The grown-up who set up the script adds each address there (Script Properties, DIGEST_TO, with commas between addresses).</p>') +

    sec('The grown-up passcode', '<p>A 4-digit passcode keeps the grown-up parts grown-up: entering points, approving screen time, checking off piano, marking money deposited, and changing settings. Once typed, it stays open for 5 minutes. Forgot it? <b>Forgot the passcode?</b> on the passcode box resets it.</p>') +

    sec('Your to-do list', ul([
      '<b>During the week:</b> tap + on Piano practice after she practices.',
      '<b>Friday to Sunday:</b> approve screen time when she cashes it in, and give it on the device.',
      '<b>Sunday:</b> read the weekly email, and ask her a dinner-table question or two.',
      '<b>When the money email comes:</b> add it to ' + esc(where || 'her account') + ', then mark it deposited.',
      '<b>Now and then:</b> give home points for a book with no AR quiz, and once a quarter, check the AR card against the school’s report (<b>Grown-up: match the school’s AR report</b>).'
    ])) +

    sec('Your own sign-in', '<p>Each grown-up signs in with their own email under Settings → Family account → Grown-up sign-in. Signed in, you see ' + esc(her) + ' books and points on your phone, everything you approve shows up on her devices, and games keep scores under your own name.</p>') +

    '<div class="row-actions"><button type="button" class="btn primary" data-act="close-sheet">Got it</button></div>' +
  '</div>';
}

function openGuide() {
  state.openId = null;
  sheet.innerHTML = guideHtml();
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
}

export const actions = { guide: openGuide };
