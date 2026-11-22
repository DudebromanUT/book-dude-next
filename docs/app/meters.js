/* The pets' progress meters on the Progress tab, for laughs:
 *   Maple's Fart-o-Meter: her AR points this quarter, against her quarter goal.
 *   Fig's Hairball Meter: all her points this quarter (AR, Book Dude tests and home points), against the same goal.
 * Each Library test she passes this quarter is a can of beans for Maple (more stink clouds), and each think-about-it
 * bonus is a cleaning session for Fig (more fur tufts). The numbers come from arReport (docs/core.js); this file only
 * draws them. No sounds. */

import { C, esc, today, fmtNum } from './util.js';
import { state } from './state.js';

const MAPLE = [
  [0, 'Barely a Squeak', 'Maple is suspiciously quiet. Read a book and wake her up.'],
  [20, 'Silent but Deadly', 'Nobody heard it. Everybody smelled it.'],
  [40, 'Squeaky Toy', 'Maple says it was the couch. It was not the couch.'],
  [60, 'Window Rattler', 'The Dude opened a window. Then he opened another window.'],
  [80, 'Clear the Room!!', 'Fig has left the building. Bobby Joe is wearing a gas mask.'],
  [100, 'LEGENDARY TOOT', 'Quarter goal smashed! Maple is very proud and only a little sorry.']
];
const FIG = [
  [0, 'Perfectly Fluffy', 'Fig is napping. Fig is always napping.'],
  [20, 'A Little Gaggy', 'Fig made a weird noise. Everyone pretended not to notice.'],
  [40, 'Hack Hack', 'Fig is warming up. Stand back.'],
  [60, 'Hairball Incoming', 'The Dude moved his slippers. Just in case.'],
  [80, 'HAIRBALL!!!', 'Right on the rug. Of course it was the rug.'],
  [100, 'Hairball the Size of a Hamster', 'Quarter goal smashed! Fig is very proud. Nobody else is.']
];
const BEANS = ['No beans yet. Pass a Library test to feed Maple a can.', 'One can of beans. Maple is interested.', 'Two cans. Maple is making plans.',
  'Three cans. Maple’s farts now have farts.', 'Four cans. The neighbors have questions.', 'Five cans. Scientists want to study Maple.'];
const BATHS = ['No cleaning sessions yet. Answer a think-about-it question to give Fig one.', 'One cleaning session. Fig licked her whole leg. Twice.',
  'Two cleaning sessions. Fig is very shiny and slightly damp.', 'Three cleaning sessions. That fur has to go somewhere.',
  'Four cleaning sessions. Fig swallowed enough fur to knit a sweater.', 'Five cleaning sessions. Fig is basically a fur factory.'];

const level = (list, pct) => list.reduce((got, row) => (pct >= row[0] ? row : got), list[0]);

// A half-circle gauge: colored zones, a needle at `pct` (0 to 100), and the pet's photo where the needle turns.
function gauge(id, pct, zones, photo, alt, extras) {
  const arc = (from, to) => {
    const a = Math.PI * (1 - from / 100), b = Math.PI * (1 - to / 100);
    const p = t => [100 + 80 * Math.cos(t), 100 - 80 * Math.sin(t)].map(v => v.toFixed(1)).join(' ');
    return 'M ' + p(a) + ' A 80 80 0 0 1 ' + p(b);
  };
  const turn = (Math.min(100, Math.max(0, pct)) * 1.8 - 90).toFixed(1);
  return '<svg class="meter-gauge" viewBox="0 0 200 118" role="img" aria-label="' + esc(alt) + '">' +
    '<defs><clipPath id="' + id + '-clip"><circle cx="100" cy="100" r="25"/></clipPath></defs>' +
    zones.map((c, i) => '<path d="' + arc(i * 20, i * 20 + 20) + '" stroke="' + c + '" stroke-width="16" fill="none"/>').join('') +
    extras +
    '<g class="meter-needle" transform="rotate(' + turn + ' 100 100)"><path d="M 97 100 L 100 30 L 103 100 Z"/></g>' +
    '<image href="' + photo + '" x="75" y="75" width="50" height="50" clip-path="url(#' + id + '-clip)" preserveAspectRatio="xMidYMid slice"/>' +
    '<circle cx="100" cy="100" r="25" class="meter-ring"/></svg>';
}

// Stink clouds around the gauge: one more for each level and each can of beans (up to 8).
function clouds(n) {
  const spots = [[22, 108], [178, 108], [10, 80], [190, 80], [30, 50], [170, 50], [60, 18], [140, 18]];
  return spots.slice(0, n).map(([x, y], i) => '<g class="meter-cloud d' + i + '">' +
    '<path d="M ' + (x - 7) + ' ' + y + ' q 3 -6 7 0 t 7 0" /><path d="M ' + (x - 5) + ' ' + (y - 7) + ' q 3 -5 6 0 t 6 0" /></g>').join('');
}
// Scribbly hairballs around Fig's gauge: one more for each level and each cleaning session (up to 8).
function tufts(n) {
  const spots = [[22, 108], [178, 108], [10, 80], [190, 80], [30, 50], [170, 50], [60, 18], [140, 18]];
  return spots.slice(0, n).map(([x, y], i) => '<g class="meter-tuft d' + i + '"><path d="M ' + (x - 6) + ' ' + y +
    ' c 0 -8 12 -8 12 0 c 0 7 -10 7 -10 1 c 0 -5 8 -5 8 0 c 0 4 -6 4 -6 0 M ' + (x + 6) + ' ' + y + ' q 4 2 3 6 M ' + (x - 6) + ' ' + y + ' q -4 -1 -5 3"/></g>').join('');
}

function card(cls, title, gaugeSvg, lvl, points, goal, unit, bonusLine) {
  return '<div class="meter ' + cls + '"><h3>' + title + '</h3>' + gaugeSvg +
    '<p class="meter-level">' + esc(lvl[1]) + '</p><p class="meter-line">' + esc(lvl[2]) + '</p>' +
    '<p class="meter-num"><b>' + fmtNum(points) + '</b> of ' + fmtNum(goal) + ' ' + unit + ' this quarter</p>' +
    '<p class="meter-bonus">' + esc(bonusLine) + '</p></div>';
}

export function metersHtml() {
  const day = today(), year = C.schoolYear(day), t = C.arTrack(state.settings.arTrack);
  const q = C.quarterOf(day, t), r = C.arReport(state.records, state.settings.arTrack, year), now = r.quarters[q - 1];
  // Book Dude tests passed, and think-about-it bonuses answered, this quarter.
  let beans = 0, baths = 0;
  for (const id of Object.keys(state.records)) {
    const rec = state.records[id];
    if (!C.isExam(id) || typeof rec.earnedPoints !== 'number' || C.schoolYear(rec.quizDate) !== year || C.quarterOf(rec.quizDate, t) !== q) continue;
    if (/:think$/.test(id)) baths++; else beans++;
  }
  const goal = r.goal.quarter;
  const ar = Math.round(now.ar * 100) / 100, all = Math.round((now.ar + now.other) * 100) / 100;
  const pa = goal ? ar / goal * 100 : 0, pt = goal ? all / goal * 100 : 0;
  const ml = level(MAPLE, pa), fl = level(FIG, pt);
  const mStep = MAPLE.indexOf(ml), fStep = FIG.indexOf(fl);
  return '<section class="panel meters" id="pet-meters"><h2 class="section-title">Pet-o-Meters <small>Quarter ' + q + '</small></h2><div class="meter-row">' +
    card('maple', 'Maple’s Fart-o-Meter', gauge('maple', pa, ['#B9D98C', '#D9D46A', '#D9A74A', '#B8743A', '#7A4B2A'], 'img/dog.jpg', 'Maple’s Fart-o-Meter: ' + ml[1], clouds(Math.min(8, mStep + beans))),
      ml, ar, goal, 'AR points', BEANS[Math.min(beans, BEANS.length - 1)] + (beans > 5 ? ' (' + beans + ' cans!)' : '')) +
    card('fig', 'Fig’s Hairball Meter', gauge('fig', pt, ['#D8DEE3', '#BFC7CD', '#A3ACB3', '#8A8F86', '#6B6A5C'], 'img/cat.jpg', 'Fig’s Hairball Meter: ' + fl[1], tufts(Math.min(8, fStep + baths))),
      fl, all, goal, 'points', BATHS[Math.min(baths, BATHS.length - 1)] + (baths > 5 ? ' (' + baths + ' sessions!)' : '')) +
    '</div><p class="hint">Maple’s meter is AR points only. Fig’s counts every point: AR, Library tests and home points. Pass a Library test for a can of beans, and answer its think-about-it question for one of Fig’s cleaning sessions.</p></section>';
}
