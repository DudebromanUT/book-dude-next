/* AR points on the Progress tab, kept apart from her other points: this quarter and this school year against her goals,
 * every quarter, and all time, with Book Dude tests and home points shown separately beside them. Both kinds still
 * count toward book money and screen time (money.js); this card only shows where the points came from.
 *
 * AR points are counted from her AR quizzes by date (docs/core.js arReport). Book Dude only has points for quizzes
 * from the school emails or typed in, so a grown-up matches the card to the school's AR report once ("Match the
 * school's report"): the points Book Dude has no quiz for are kept per quarter, and her earlier years as one number. */

import { C, $, esc, today, fmtNum, fmtDay } from './util.js';
import { state, saveSetting } from './state.js';
import { confirmBox, toast, showBox } from './page.js';
import { asGrownup } from './grownup.js';
import { renderProgress } from './progress.js';

const track = () => C.arTrack(state.settings.arTrack);
const n = x => fmtNum(Math.round(x * 100) / 100);
const pct = (x, of) => (of > 0 ? Math.min(100, x / of * 100) : 0).toFixed(1);
const NAMES = ['', 'Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];

export function arHtml() {
  const day = today(), year = C.schoolYear(day), r = C.arReport(state.records, state.settings.arTrack, year, state.settings.spelling);
  const q = C.quarterOf(day, track()), now = r.quarters[q - 1];
  const left = Math.max(0, r.goal.quarter - now.ar);
  const bar = (x, of, cls) => '<span class="bar' + (cls ? ' ' + cls : '') + '"><i data-w="' + pct(x, of) + '"></i></span>';
  // The last day of quarter i (0 to 3): the day before the next one starts, or July 31 for the last.
  const ends = i => (r.starts[i + 1] ? new Date(Date.parse(r.starts[i + 1] + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10) : (Number(year.slice(0, 4)) + 1) + '-07-31');
  return '<section class="panel ar-card" id="ar-points"><h2 class="section-title">AR points <small>school year ' + esc(year) + '</small></h2>' +
    '<div class="ar-goal"><p><b>' + NAMES[q] + '</b> <span class="hint">' + esc(fmtDay(r.starts[q - 1])) + ' to ' + esc(fmtDay(ends(q - 1))) + '</span></p>' +
      '<p class="ar-big"><span class="big">' + n(now.ar) + '</span> of ' + n(r.goal.quarter) + '</p>' + bar(now.ar, r.goal.quarter, 'gold') +
      '<p class="hint">' + (left ? n(left) + ' to go for the quarter goal.' : 'Quarter goal reached!') + '</p></div>' +
    '<div class="ar-goal"><p><b>School year</b></p><p class="ar-big"><span class="big">' + n(r.yearAr) + '</span> of ' + n(r.goal.year) + '</p>' + bar(r.yearAr, r.goal.year) + '</div>' +
    (r.lifetime !== null ? '<p class="ar-all">All time: <b>' + n(r.lifetime) + ' AR points</b></p>' : '') +
    '<table class="ar-table"><thead><tr><th></th><th>AR</th><th>Other</th></tr></thead><tbody>' + r.quarters.map((x, i) =>
      '<tr' + (x.q === q ? ' class="now"' : '') + '><th>' + NAMES[x.q] + '<span class="hint">' + esc(fmtDay(r.starts[i])) + '</span></th><td>' + n(x.ar) +
      (x.missed ? '<span class="hint">' + n(x.counted) + ' from quizzes here + ' + n(x.missed) + ' from the school’s report</span>' : '') + '</td><td>' + n(x.other) + '</td></tr>').join('') +
    '<tr class="total"><th>Year</th><td>' + n(r.yearAr) + '</td><td>' + n(r.yearOther) + '</td></tr></tbody></table>' +
    '<p class="hint">AR is points from AR quizzes. Other is Book Dude’s own tests, home points and spelling. Both count for book money and screen time.</p>' +
    '<div class="row-actions"><button type="button" class="btn small" data-act="ar-match">Grown-up: match the school’s AR report</button></div></section>';
}

function matchForm() {
  const day = today(), year = C.schoolYear(day), t = track(), r = C.arReport(state.records, t, year);
  const q = C.quarterOf(day, t);
  const field = (id, label, value) => '<label class="field"><span>' + label + '</span><input id="' + id + '" class="input" type="text" inputmode="decimal" autocomplete="off" value="' + esc(value) + '"></label>';
  showBox('Match the school’s AR report', '<form class="stack" data-form="ar-match" novalidate>' +
    '<p class="hint">Copy her AR points from the school’s report. Book Dude keeps the difference from the quizzes it has, so new quizzes keep adding on top.</p>' +
    r.quarters.slice(0, q).map(x => field('ar-q' + x.q, NAMES[x.q] + ' AR points' + (x.q === q ? ' (so far)' : ''), x.ar ? n(x.ar) : '')).join('') +
    field('ar-all', 'All-time AR points (every year)', r.lifetime !== null ? n(r.lifetime) : '') +
    '<div class="two">' + field('ar-goal-q', 'Goal for each quarter', n(t.goal.quarter)) + field('ar-goal-y', 'Goal for the school year', n(t.goal.year)) + '</div>' +
    '<p class="error" id="ar-error" role="alert" hidden></p>' +
    '<div class="row-actions"><button type="submit" class="btn primary">Save</button><button type="button" class="btn" data-act="close-confirm">Cancel</button></div></form>');
}

async function saveMatch(form) {
  const day = today(), year = C.schoolYear(day), t = track(), q = C.quarterOf(day, t);
  const err = $('#ar-error', form);
  const read = id => { const raw = $('#' + id, form).value.trim().replace(/,/g, ''); return raw === '' ? null : /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN; };
  const fail = text => { err.textContent = text; err.hidden = false; };
  const before = C.arReport(state.records, t, year);
  const missed = Object.assign({}, t.missed[year] || {});
  for (let i = 1; i <= q; i++) {
    const v = read('ar-q' + i);
    if (Number.isNaN(v)) return fail(NAMES[i] + ' must be a number, like 51.7.');
    if (v === null) continue;
    const counted = before.quarters[i - 1].counted;
    if (v < counted) return fail(NAMES[i] + ': Book Dude already has ' + n(counted) + ' AR points from quizzes. Check the report, or the quizzes in “Where your points came from”.');
    missed[i] = Math.round((v - counted) * 100) / 100;
  }
  const goalQ = read('ar-goal-q'), goalY = read('ar-goal-y'), all = read('ar-all');
  if ([goalQ, goalY, all].some(Number.isNaN) || goalQ === 0 || goalY === 0) return fail('Goals and the all-time total must be numbers, like 62.5.');
  const next = { quarters: t.quarters, goal: { quarter: goalQ || t.goal.quarter, year: goalY || t.goal.year }, missed: Object.assign({}, t.missed, { [year]: missed }), before: null };
  if (all !== null) {
    // Her earlier years: the all-time total less everything Book Dude counts from this year on.
    const base = C.arReport(state.records, Object.assign({}, next, { before: { year, points: 0 } }), year).lifetime;
    if (all < base) return fail('All time can’t be less than the ' + n(base) + ' AR points Book Dude already counts.');
    next.before = { year, points: Math.round((all - base) * 100) / 100 };
  } else next.before = t.before;
  await saveSetting('arTrack', C.arTrack(next));
  confirmBox.close();
  renderProgress();
  toast('AR points now match the school’s report.');
}

export const actions = { 'ar-match': () => asGrownup(matchForm) };
export const submits = { 'ar-match': form => asGrownup(() => saveMatch(form)) };
