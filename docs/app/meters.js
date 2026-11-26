/* The pets' meters on the Progress tab, for laughs:
 *   Maple's Zoomies-o-Meter: her AR points this quarter, against her quarter goal (arReport, docs/core.js). Each Library
 *   test she passes this quarter is a squeak of Duck Duck, Maple's squeaky duck: more Duck Ducks around the gauge.
 *   Fig's Litter-Robot: the waste drawer starts full and gross, and every point (AR, Library tests, home points)
 *   scoops some out; at 10 it's sparkling clean and she can spend the 10 points on money or screen time. Spending
 *   fills it right back up (Fig is reliable like that). The spend buttons live here, and spending sets off a party
 *   (party below): Fig dances for money, Maple chases Duck Duck for screen time.
 * No sounds. */

import { C, esc, today, fmtNum, reducedMotion } from './util.js';
import { state } from './state.js';

const MAPLE = [
  [0, 'Napping', 'Maple is asleep with Duck Duck under her chin. Read a book and wake her up.'],
  [20, 'Sniffing Around', 'Maple is looking for Duck Duck. Duck Duck is under the couch. Again.'],
  [40, 'Tail Going', 'The tail is wagging so hard the whole back half of Maple is wagging.'],
  [60, 'Running Laps', 'Maple did three laps of the living room with Duck Duck. Squeak. Squeak. SQUEAK.'],
  [80, 'FULL ZOOMIES', 'Fig has left the room. Maple has not slowed down. Duck Duck is holding on for dear life.'],
  [100, 'SOUND BARRIER', 'Quarter goal smashed! Maple ran so fast she broke the sound barrier. Duck Duck squeaked the whole way.']
];
const SQUEAKS = ['No squeaks yet. Pass a Library test and Maple squeaks Duck Duck.', 'One squeak. Maple’s ears perk up.', 'Two squeaks. Maple is doing the play bow.',
  'Three squeaks. Fig is covering her ears.', 'Four squeaks. Duck Duck is getting a sore throat.', 'Five squeaks. Duck Duck has squeaked more than any duck in history.'];
// Duck Duck, Maple's squeaky toy duck, drawn around her gauge: one more for each level and each squeak (up to 8).
const DUCK_SPOTS = [[22, 104], [178, 104], [10, 76], [190, 76], [30, 46], [170, 46], [62, 14], [138, 14]];
function ducks(n) {
  return DUCK_SPOTS.slice(0, n).map(([x, y], i) => '<g class="meter-duck d' + i + '">' +
    '<ellipse cx="' + x + '" cy="' + y + '" rx="7" ry="5" fill="#F7D046"/><circle cx="' + (x + 5) + '" cy="' + (y - 5) + '" r="3.6" fill="#F7D046"/>' +
    '<path d="M ' + (x + 8) + ' ' + (y - 6) + ' l 4 1.2 l -4 1.4 z" fill="#F08A24"/><circle cx="' + (x + 6) + '" cy="' + (y - 6) + '" r=".9" fill="#1E1A18"/>' +
    '<path d="M ' + (x - 3) + ' ' + (y - 1) + ' q 3 -3 6 0" stroke="#E0B030" stroke-width="1.2" fill="none"/></g>').join('');
}
// Fig's drawer as she scoops it out, from overflowing to spotless: [clean from, status, line].
const DRAWER = [
  [0, 'DRAWER FULL', 'Fig is filing a complaint with management. Earn points to scoop it out!'],
  [0.2, 'Code Brown', 'Fig is giving everyone The Look. Keep scooping.'],
  [0.5, 'Smelly Cat', 'Halfway there. The flies are packing their bags.'],
  [0.8, 'Almost Fresh', 'Fig is cautiously optimistic. One more book should do it.'],
  [1, 'Sparkling Clean!', 'Fig approves. Spend your 10 points before she makes another one.']
];

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

// Stink clouds around a picture: up to 8, at the spots given.
function clouds(n, spots) {
  return spots.slice(0, n).map(([x, y], i) => '<g class="meter-cloud d' + i + '">' +
    '<path d="M ' + (x - 7) + ' ' + y + ' q 3 -6 7 0 t 7 0" /><path d="M ' + (x - 5) + ' ' + (y - 7) + ' q 3 -5 6 0 t 6 0" /></g>').join('');
}
const ROBOT_SPOTS = [[40, 140], [162, 140], [34, 118], [168, 118], [44, 96], [158, 96], [30, 160], [172, 160]];

// A cartoon Litter-Robot: the globe with Fig's face in the doorway, and the waste drawer filling up below.
function robot(frac, flies) {
  const h = Math.round(44 * Math.min(1, frac));
  const color = frac >= 1 ? '#6B4A22' : frac >= 0.8 ? '#8A6A2E' : frac >= 0.5 ? '#A8A04A' : '#8FCBA8';
  const sparkles = frac <= 0 ? '<g class="robot-sparkle">' + [[40, 124], [162, 118], [48, 92], [154, 88], [100, 6]].map(([x, y], i) =>
    '<path class="d' + i + '" d="M ' + x + ' ' + (y - 8) + ' L ' + (x + 2.5) + ' ' + (y - 2.5) + ' L ' + (x + 8) + ' ' + y + ' L ' + (x + 2.5) + ' ' + (y + 2.5) + ' L ' + x + ' ' + (y + 8) +
    ' L ' + (x - 2.5) + ' ' + (y + 2.5) + ' L ' + (x - 8) + ' ' + y + ' L ' + (x - 2.5) + ' ' + (y - 2.5) + ' Z"/>').join('') + '</g>' : '';
  const top = 156 - h;
  const fly = i => '<g class="robot-fly f' + i + '"><circle r="2.4"/><ellipse class="wing" cx="-2" cy="-2.4" rx="2" ry="1.2"/><ellipse class="wing" cx="2" cy="-2.4" rx="2" ry="1.2"/></g>';
  return '<svg class="robot' + (frac >= 1 ? ' full' : '') + '" viewBox="0 0 200 172" role="img" aria-label="' + esc('Fig’s Litter-Robot: waste drawer ' + Math.round(Math.min(1, frac) * 100) + '% full') + '">' +
    '<defs><clipPath id="robot-door"><circle cx="100" cy="58" r="30"/></clipPath><clipPath id="robot-drawer"><rect x="56" y="112" width="88" height="44" rx="8"/></clipPath></defs>' +
    '<path class="robot-body" d="M 56 104 Q 48 24 100 14 Q 152 24 144 104 L 150 162 Q 150 168 144 168 L 56 168 Q 50 168 50 162 Z"/>' +
    '<circle class="robot-hole" cx="100" cy="58" r="34"/>' +
    '<image href="img/cat.jpg" x="70" y="28" width="60" height="60" clip-path="url(#robot-door)" preserveAspectRatio="xMidYMid slice"/>' +
    '<path class="robot-lip" d="M 66 76 Q 100 98 134 76 L 136 84 Q 100 106 64 84 Z"/>' +
    '<rect class="robot-drawer" x="56" y="112" width="88" height="44" rx="8"/>' +
    '<g clip-path="url(#robot-drawer)"><rect x="56" y="' + top + '" width="88" height="' + h + '" fill="' + color + '"/>' +
      (frac >= 0.5 ? '<g class="robot-lumps"><ellipse cx="74" cy="' + (top + 2) + '" rx="6" ry="3.5"/><ellipse cx="116" cy="' + (top + 3) + '" rx="7" ry="4"/>' +
        (frac >= 0.8 ? '<ellipse cx="96" cy="' + (top + 1) + '" rx="5" ry="3"/><ellipse cx="134" cy="' + (top + 4) + '" rx="4" ry="2.5"/>' : '') + '</g>' : '') + '</g>' +
    '<path class="robot-handle" d="M 86 120 L 114 120"/>' +
    (frac >= 1 ? '<text class="robot-full" x="100" y="146" text-anchor="middle">FULL!</text>' : '') +
    (frac <= 0 ? '<text class="robot-clean" x="100" y="142" text-anchor="middle">CLEAN!</text>' : '') + sparkles +
    (frac >= 0.2 ? clouds(Math.min(8, Math.floor(frac * 8)), ROBOT_SPOTS) : '') +
    Array.from({ length: flies }, (_, i) => fly(i)).join('') +
    '</svg>';
}

function figCard(total) {
  const cfg = C.reward(state.settings.reward), ch = C.choices(total, cfg);
  const both = cfg.on && cfg.screen;
  const clean = ch.open ? 1 : ch.into / 10, frac = 1 - clean;
  const lvl = level(DRAWER, clean);
  const flies = frac >= 1 ? 4 : frac >= 0.8 ? 3 : frac >= 0.5 ? 2 : frac >= 0.35 ? 1 : 0;
  const jarLabel = cfg.perPoint > 0 ? '$' + fmtNum(10 * cfg.perPoint) : '10 points in the jar';
  return '<div class="meter fig"><h3>Fig’s Litter-Robot</h3>' + robot(frac, flies) +
    '<p class="robot-status"><i class="dot' + (frac >= 0.8 ? ' warn' : '') + '"></i>' + esc(lvl[1]) + '</p>' +
    '<p class="meter-line">' + esc(lvl[2]) + '</p>' +
    '<p class="meter-num">' + (ch.open
      ? '<b>' + fmtNum(ch.open * 10) + '</b> points to spend' + (ch.into ? ' · ' + fmtNum(ch.into) + ' already in the next drawer' : '')
      : 'Clean: <b>' + Math.round(clean * 100) + '%</b> · ' + fmtNum(ch.into) + ' of 10 points scooped') + '</p>' +
    (ch.open && both
      ? '<p class="meter-bonus">Every 10 points: ' + esc(jarLabel) + ' or ' + cfg.minutes + ' minutes of screen time.</p>' +
        '<div class="row-actions robot-spend"><button type="button" class="btn primary" data-act="choose" data-to="jar">' + esc(jarLabel) + '</button>' +
        '<button type="button" class="btn primary" data-act="choose" data-to="minutes">' + cfg.minutes + ' minutes</button></div>'
      : '<p class="meter-bonus">Every point scoops some out. At 10 it’s clean, and you get ' + (both ? 'money or screen time' : 'your reward') + '.</p>') +
    '<p class="robot-scoops"><span>Scoops Saved</span><b>' + fmtNum(ch.toJar + ch.toMinutes) + '</b></p></div>';
}

function mapleCard(lvl, gaugeSvg, points, goal, squeaks) {
  return '<div class="meter maple"><h3>Maple’s Zoomies-o-Meter</h3>' + gaugeSvg +
    '<p class="meter-level">' + esc(lvl[1]) + '</p><p class="meter-line">' + esc(lvl[2]) + '</p>' +
    '<p class="meter-num"><b>' + fmtNum(points) + '</b> of ' + fmtNum(goal) + ' AR points this quarter</p>' +
    '<p class="meter-bonus">' + esc(SQUEAKS[Math.min(squeaks, SQUEAKS.length - 1)] + (squeaks > 5 ? ' (' + squeaks + ' squeaks!)' : '')) + '</p></div>';
}

// Bobby Joe's Spell-o-Meter: her Spelling Bee gems on each list, her rank, her spelling points and the next one, and
// the days to the school spelling bee. When she has earned a point since she last looked, Bobby Joe does his stomp.
const BEE_DAY = '2027-01-10';
const RANKS = [[0, 'Egg', 'Bobby Joe is still in his shell. Spell a word twice to crack it.'], [10, 'Hatchling', 'Peep! Bobby Joe has hatched and is already stomping typos.'],
  [50, 'Fledgling', 'Bobby Joe is flapping. Not flying yet. Lots of flapping.'], [125, 'Typo Stomper', 'No typo is safe. Bobby Joe has stomped them all flat.'],
  [225, 'Word Wrangler', 'Bobby Joe lassos long words and makes them behave.'], [350, 'Spelling Hawk', 'Bobby Joe can spot a missing letter from a mile up.'],
  [450, 'Spelling Bee Champion', 'Every word on the list. Bobby Joe is doing his victory stomp, and he may never stop.']];
const SEEN_KEY = 'book-dude:spell-points-seen';
function bobbyCard() {
  const r = C.spellPoints(state.settings.spelling), L = r.levels, lvs = Object.keys(L);
  const gems = lvs.reduce((s, k) => s + r.gems[k], 0), rank = RANKS.reduce((got, x) => (gems >= x[0] ? x : got), RANKS[0]);
  const lv = lvs.find(k => r.gems[k] < L[k].size);
  let seen = 0;
  try { seen = Number(localStorage.getItem(SEEN_KEY)) || 0; localStorage.setItem(SEEN_KEY, String(r.total)); } catch (e) { /* no stomp, then */ }
  const stomp = r.total > seen && !reducedMotion();
  const art = window.BookPets && window.BookPets.art && window.BookPets.art.bobby;
  const days = Math.round((Date.parse(BEE_DAY + 'T12:00:00Z') - Date.parse(today() + 'T12:00:00Z')) / 864e5);
  const bar = k => '<li class="spell-' + k + '"><span>' + esc(L[k].name) + '</span><span class="bar"><i data-w="' + (r.gems[k] / L[k].size * 100).toFixed(1) + '"></i></span><b>' + r.gems[k] + '/' + L[k].size + '</b></li>';
  return '<div class="meter bobby"><h3>Bobby Joe’s Spell-o-Meter</h3>' +
    '<div class="bobby-art' + (stomp ? ' stomp' : '') + '">' + (art || '') + '</div>' +
    '<p class="meter-level">' + esc(rank[1]) + '</p><p class="meter-line">' + esc(rank[2]) + '</p>' +
    '<ul class="spell-bars">' + lvs.map(bar).join('') + '</ul>' +
    '<p class="meter-num"><b>' + fmtNum(r.total) + '</b> spelling ' + (r.total === 1 ? 'point' : 'points') + '</p>' +
    '<p class="meter-bonus">' + (lv ? esc(r.next[lv] + ' more ' + (r.next[lv] === 1 ? 'gem' : 'gems') + ' on ' + L[lv].name + ' for ' + L[lv].rate + ' more ' + (L[lv].rate === 1 ? 'point' : 'points') + '. Finishing it is worth ' + L[lv].bonus + ' more.') : 'Every list is done!') + '</p>' +
    (days >= 0 ? '<p class="bee-day">' + (days > 1 ? 'School spelling bee: January 10. <b>' + days + ' days</b> to go.' : days === 1 ? 'The spelling bee is <b>tomorrow</b>!' : '<b>Spelling bee day!</b>') + '</p>' : '') +
    '<div class="row-actions"><a class="btn small primary" href="games/spelling-bee/">Practice with Bobby Joe</a></div></div>';
}

export function metersHtml(total) {
  const day = today(), year = C.schoolYear(day), t = C.arTrack(state.settings.arTrack);
  const q = C.quarterOf(day, t), r = C.arReport(state.records, state.settings.arTrack, year), now = r.quarters[q - 1];
  // Book Dude tests passed this quarter (not the think-about-it bonuses): squeaks of Duck Duck.
  let squeaks = 0;
  for (const id of Object.keys(state.records)) {
    const rec = state.records[id];
    if (!C.isExam(id) || /:think$/.test(id) || typeof rec.earnedPoints !== 'number' || C.schoolYear(rec.quizDate) !== year || C.quarterOf(rec.quizDate, t) !== q) continue;
    squeaks++;
  }
  const goal = r.goal.quarter;
  const ar = Math.round(now.ar * 100) / 100;
  const pa = goal ? ar / goal * 100 : 0;
  const ml = level(MAPLE, pa);
  return '<section class="panel meters" id="pet-meters"><h2 class="section-title">Pet-o-Meters <small>Quarter ' + q + '</small></h2><div class="meter-row">' +
    mapleCard(ml, gauge('maple', pa, ['#9FD3F0', '#9DD08A', '#F2D26A', '#F2A048', '#E2603C'], 'img/dog.jpg', 'Maple’s Zoomies-o-Meter: ' + ml[1],
      ducks(Math.min(8, MAPLE.indexOf(ml) + squeaks))), ar, goal, squeaks) +
    figCard(total) +
    bobbyCard() +
    '</div><p class="hint">Maple’s meter is AR points this quarter, and every Library test you pass is a squeak of Duck Duck. Every point scoops Fig’s drawer: AR, Library tests, home points and spelling. Every 10 spelling gems earn points: 1 on One Bee, 2 on Two Bee, 3 on Three Bee.</p></section>';
}

/* The party when she spends 10 points (no sound, tap to skip, about 4 seconds):
 *   'jar': Fig dances across the screen while dollar bills float down.
 *   'minutes': Maple bounces across the screen chasing Duck Duck. */
export function party(kind) {
  const art = window.BookPets && window.BookPets.art;
  if (!art) return;
  const fig = kind === 'jar';
  const el = document.createElement('div');
  el.className = 'party ' + (fig ? 'party-fig' : 'party-maple') + (reducedMotion() ? ' still' : '');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = (fig ? Array.from({ length: 14 }, (_, i) => '<i class="bill b' + (i % 7) + '">$</i>').join('') : '<i class="ball"><svg viewBox="0 0 30 26" aria-hidden="true"><ellipse cx="13" cy="17" rx="12" ry="8" fill="#F7D046"/><circle cx="21" cy="8" r="6" fill="#F7D046"/><path d="M 26 7 l 4 1.5 l -4 1.8 z" fill="#F08A24"/><circle cx="22.5" cy="6.5" r="1.2" fill="#1E1A18"/><path d="M 6 15 q 6 -5 12 0" stroke="#E0B030" stroke-width="1.6" fill="none"/></svg></i>') +
    '<span class="critter walking here critter-' + (fig ? 'fig' : 'maple') + ' party-pet"><span class="critter-body">' + art[fig ? 'fig' : 'maple'] + '</span></span>' +
    '<p class="party-say">' + (fig ? 'Ka-ching! Fig is doing her happy dance.' : 'Screen time! Maple wants Duck Duck. Squeak!') + '<span class="party-sub">' + (fig ? 'Fig celebrated by making a fresh one.' : 'Fig made a fresh one while you weren’t looking.') + '</span></p>';
  const host = document.querySelector('dialog[open]') || document.body;
  host.appendChild(el);
  const done = () => el.remove();
  el.addEventListener('click', done);
  setTimeout(done, 4200);
}
