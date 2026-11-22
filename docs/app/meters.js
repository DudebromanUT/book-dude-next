/* The pets' meters on the Progress tab, for laughs:
 *   Maple's Fart-o-Meter: her AR points this quarter, against her quarter goal (arReport, docs/core.js). Each Library
 *   test she passes this quarter is a can of beans for Maple: more stink clouds.
 *   Fig's Litter-Robot: every point (AR, Library tests, home points) fills the waste drawer toward her next 10. A full
 *   drawer stays full, and stinky, until she spends the 10 points on money or screen time; that cleans it out. The
 *   spend buttons live here, and spending sets off a party (party below): Fig dances for money, Maple chases a ball
 *   for screen time.
 * No sounds. */

import { C, esc, today, fmtNum, reducedMotion } from './util.js';
import { state } from './state.js';

const MAPLE = [
  [0, 'Barely a Squeak', 'Maple is suspiciously quiet. Read a book and wake her up.'],
  [20, 'Silent but Deadly', 'Nobody heard it. Everybody smelled it.'],
  [40, 'Squeaky Toy', 'Maple says it was the couch. It was not the couch.'],
  [60, 'Window Rattler', 'The Dude opened a window. Then he opened another window.'],
  [80, 'Clear the Room!!', 'Fig has left the building. Bobby Joe is wearing a gas mask.'],
  [100, 'LEGENDARY TOOT', 'Quarter goal smashed! Maple is very proud and only a little sorry.']
];
const BEANS = ['No beans yet. Pass a Library test to feed Maple a can.', 'One can of beans. Maple is interested.', 'Two cans. Maple is making plans.',
  'Three cans. Maple’s farts now have farts.', 'Four cans. The neighbors have questions.', 'Five cans. Scientists want to study Maple.'];
// Fig's drawer, from empty to overflowing: [fill from, status, line].
const DRAWER = [
  [0, 'Ready', 'Fresh. Suspiciously fresh. Fig approves.'],
  [0.2, 'Getting Ripe', 'Fig is pretending not to notice. Fig noticed.'],
  [0.5, 'Smelly Cat', 'The flies have started a book club.'],
  [0.8, 'Code Brown', 'Fig is giving everyone The Look.'],
  [1, 'DRAWER FULL', 'Fig is filing a complaint with management. Spend your points to clean it out!']
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
const GAUGE_SPOTS = [[22, 108], [178, 108], [10, 80], [190, 80], [30, 50], [170, 50], [60, 18], [140, 18]];
const ROBOT_SPOTS = [[40, 140], [162, 140], [34, 118], [168, 118], [44, 96], [158, 96], [30, 160], [172, 160]];

// A cartoon Litter-Robot: the globe with Fig's face in the doorway, and the waste drawer filling up below.
function robot(frac, flies) {
  const h = Math.round(44 * Math.min(1, frac));
  const color = frac >= 1 ? '#6B4A22' : frac >= 0.8 ? '#8A6A2E' : frac >= 0.5 ? '#A8A04A' : '#8FCBA8';
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
    (frac >= 0.2 ? clouds(Math.min(8, Math.floor(frac * 8)), ROBOT_SPOTS) : '') +
    Array.from({ length: flies }, (_, i) => fly(i)).join('') +
    '</svg>';
}

function figCard(total) {
  const cfg = C.reward(state.settings.reward), ch = C.choices(total, cfg);
  const both = cfg.on && cfg.screen;
  const frac = ch.open ? 1 : ch.into / 10;
  const lvl = level(DRAWER, frac);
  const flies = frac >= 1 ? 4 : frac >= 0.8 ? 3 : frac >= 0.5 ? 2 : frac >= 0.35 ? 1 : 0;
  const jarLabel = cfg.perPoint > 0 ? '$' + fmtNum(10 * cfg.perPoint) : '10 points in the jar';
  return '<div class="meter fig"><h3>Fig’s Litter-Robot</h3>' + robot(frac, flies) +
    '<p class="robot-status"><i class="dot' + (frac >= 0.8 ? ' warn' : '') + '"></i>' + esc(lvl[1]) + '</p>' +
    '<p class="meter-line">' + esc(lvl[2]) + '</p>' +
    '<p class="meter-num">' + (ch.open
      ? '<b>' + fmtNum(ch.open * 10) + '</b> points to spend' + (ch.into ? ' · ' + fmtNum(ch.into) + ' already in the next drawer' : '')
      : 'Waste: <b>' + Math.round(frac * 100) + '%</b> · ' + fmtNum(ch.into) + ' of 10 points') + '</p>' +
    (ch.open && both
      ? '<p class="meter-bonus">Clean it out! Every 10 points: ' + esc(jarLabel) + ' or ' + cfg.minutes + ' minutes of screen time.</p>' +
        '<div class="row-actions robot-spend"><button type="button" class="btn primary" data-act="choose" data-to="jar">' + esc(jarLabel) + '</button>' +
        '<button type="button" class="btn primary" data-act="choose" data-to="minutes">' + cfg.minutes + ' minutes</button></div>'
      : '<p class="meter-bonus">Every point fills the drawer. At 10, you clean it out for ' + (both ? 'money or screen time' : 'your reward') + '.</p>') +
    '<p class="robot-scoops"><span>Scoops Saved</span><b>' + fmtNum(ch.toJar + ch.toMinutes) + '</b></p></div>';
}

function mapleCard(lvl, gaugeSvg, points, goal, beans) {
  return '<div class="meter maple"><h3>Maple’s Fart-o-Meter</h3>' + gaugeSvg +
    '<p class="meter-level">' + esc(lvl[1]) + '</p><p class="meter-line">' + esc(lvl[2]) + '</p>' +
    '<p class="meter-num"><b>' + fmtNum(points) + '</b> of ' + fmtNum(goal) + ' AR points this quarter</p>' +
    '<p class="meter-bonus">' + esc(BEANS[Math.min(beans, BEANS.length - 1)] + (beans > 5 ? ' (' + beans + ' cans!)' : '')) + '</p></div>';
}

export function metersHtml(total) {
  const day = today(), year = C.schoolYear(day), t = C.arTrack(state.settings.arTrack);
  const q = C.quarterOf(day, t), r = C.arReport(state.records, state.settings.arTrack, year), now = r.quarters[q - 1];
  // Book Dude tests passed this quarter (not the think-about-it bonuses).
  let beans = 0;
  for (const id of Object.keys(state.records)) {
    const rec = state.records[id];
    if (!C.isExam(id) || /:think$/.test(id) || typeof rec.earnedPoints !== 'number' || C.schoolYear(rec.quizDate) !== year || C.quarterOf(rec.quizDate, t) !== q) continue;
    beans++;
  }
  const goal = r.goal.quarter;
  const ar = Math.round(now.ar * 100) / 100;
  const pa = goal ? ar / goal * 100 : 0;
  const ml = level(MAPLE, pa);
  return '<section class="panel meters" id="pet-meters"><h2 class="section-title">Pet-o-Meters <small>Quarter ' + q + '</small></h2><div class="meter-row">' +
    mapleCard(ml, gauge('maple', pa, ['#B9D98C', '#D9D46A', '#D9A74A', '#B8743A', '#7A4B2A'], 'img/dog.jpg', 'Maple’s Fart-o-Meter: ' + ml[1],
      clouds(Math.min(8, MAPLE.indexOf(ml) + beans), GAUGE_SPOTS)), ar, goal, beans) +
    figCard(total) +
    '</div><p class="hint">Maple’s meter is AR points this quarter, and every Library test you pass feeds her a can of beans. Fig’s drawer fills with every point: AR, Library tests and home points.</p></section>';
}

/* The party when she spends 10 points (no sound, tap to skip, about 4 seconds):
 *   'jar': Fig dances across the screen while dollar bills float down.
 *   'minutes': Maple bounces across the screen chasing a ball. */
export function party(kind) {
  const art = window.BookPets && window.BookPets.art;
  if (!art) return;
  const fig = kind === 'jar';
  const el = document.createElement('div');
  el.className = 'party ' + (fig ? 'party-fig' : 'party-maple') + (reducedMotion() ? ' still' : '');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = (fig ? Array.from({ length: 14 }, (_, i) => '<i class="bill b' + (i % 7) + '">$</i>').join('') : '<i class="ball"></i>') +
    '<span class="critter walking here critter-' + (fig ? 'fig' : 'maple') + ' party-pet"><span class="critter-body">' + art[fig ? 'fig' : 'maple'] + '</span></span>' +
    '<p class="party-say">' + (fig ? 'Drawer clean! Fig is doing her happy dance.' : 'Screen time! Maple wants the ball.') + '</p>';
  const host = document.querySelector('dialog[open]') || document.body;
  host.appendChild(el);
  const done = () => el.remove();
  el.addEventListener('click', done);
  setTimeout(done, 4200);
}
