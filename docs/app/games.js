/* The Games tab: the arcade's list of games, the family scoreboard, and keeping a signed-in player's scores in the
 * family's account.
 *
 * Each game is a page of its own in docs/games/<its name>/, with one line in GAMES below. A game keeps its scores on
 * the device through docs/games/arcade.js (which explains the few things a game needs to know). The player is whoever
 * is signed in: a reader on her own device, or a grown-up playing as themselves (whichever reader's books they have
 * open). On a device that isn't signed in, the game asks for a name and the scores stay on the device.
 *
 * Scores only ever get better. Two sets are always put together, the best of each level:
 *   a reader's scores also travel with her other settings ("arcade"), so they are there offline on every device;
 *   everyone's go to the family's scoreboard (save_scores in supabase/002_scores.sql), which answers with that
 *   player's best from all their devices, and scoreboard() lists the family's best by first name. */

import { C, BASE, esc, plural, fmtNum } from './util.js';
import { state, saveSetting } from './state.js';
import { main } from './page.js';
import { greeting } from './cards.js';
import { account, activeKidName, saveScores, scoreboard } from './cloud.js';

export const GAMES = [
  { id: 'maple-madness', title: 'Maple’s Big Day', blurb: 'Poop Patrol, Catch Fig, Garden Duty and Tug of War, starring Maple and Fig. In English and Spanish.', href: 'games/maple-madness/',
    levels: [['poop', 'Poop Patrol'], ['chase', 'Catch Fig'], ['water', 'Garden Duty'], ['tug', 'Tug of War']] },
  { id: 'millcreek-trail', title: 'The Millcreek Trail', blurb: 'It’s 1862. Get the family’s ancestors, a terrier, a cat and a blanket that seems to be alive from San Francisco to Millcreek. Hunt, ford rivers, and try not to die of dysentery.', href: 'games/millcreek-trail/',
    levels: [['trip', 'The trip to Millcreek']] }
];

const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

// Who is playing on this device, the same way docs/games/arcade.js works it out.
function player() {
  const a = account();
  if (a && a.me && a.role === 'grownup' && a.me.grownup && a.session && a.session.user) return { kind: 'grownup', name: String(a.me.grownup.name || '') || 'Grown-up', key: 'grownup:' + a.session.user };
  if (a && a.me && a.role === 'reader' && a.me.kid && a.me.kid.id === a.kid) return { kind: 'reader', name: activeKidName(), key: 'kid:' + a.kid };
  return { kind: 'device', name: '', key: 'device' };
}
const store = (who, game) => 'book-dude:arcade:' + BASE + who.key + ':' + game + ':records';
// This player's scores as the games on this device have them: { game: { level: { stars, score } } }.
function local(who) {
  const out = {};
  for (const g of GAMES) {
    const saved = read(store(who, g.id));
    if (saved && typeof saved === 'object' && saved[who.name]) out[g.id] = saved[who.name];
  }
  return C.arcadeBest(out, {});
}
// Hands a player's best back to the games on this device.
function give(who, best) {
  for (const g of GAMES) {
    try { localStorage.setItem(store(who, g.id), JSON.stringify({ [who.name]: best[g.id] || {} })); } catch (e) { /* the game will show what it has */ }
  }
}

let board = {};        // game id -> the family's rows, or null when it couldn't be fetched
let boardFor = '';     // which player the board was fetched for

/**
 * Puts the signed-in player's scores together, the best of each level, and writes the result everywhere it lives.
 * The part on this device happens first and needs no internet (called before the first screen is drawn); the
 * scoreboard is told afterwards, and the Games tab is redrawn if it is showing.
 */
export async function mirrorArcade() {
  const who = player();
  if (who.kind === 'device') return;
  let best = local(who);
  if (who.kind === 'reader') {
    best = C.arcadeBest(state.settings.arcade, best);
    if (!same(best, state.settings.arcade)) await saveSetting('arcade', best);
    give(who, best);
  }
  share(who, best);
}

async function share(who, mine) {
  const everywhere = await saveScores(mine);
  if (!everywhere) return;
  const best = C.arcadeBest(mine, everywhere);
  if (!same(best, mine)) {
    give(who, best);
    if (who.kind === 'reader' && !same(best, state.settings.arcade)) await saveSetting('arcade', C.arcadeBest(state.settings.arcade, best));
  }
  if (state.tab === 'games') { await loadBoard(who); renderGames(); }
}

async function loadBoard(who) {
  for (const g of GAMES) board[g.id] = await scoreboard(g.id);
  boardFor = who.key;
}

// Stars earned in a game: the signed-in player's, or on a device that isn't signed in, the best anyone here has on each level.
function stars(game, who) {
  let levels = {};
  if (who.kind === 'reader') levels = state.settings.arcade[game.id] || {};
  else if (who.kind === 'grownup') levels = local(who)[game.id] || {};
  else {
    const saved = read(store(who, game.id));
    const everyone = Object.keys(saved && typeof saved === 'object' ? saved : {}).map(n => ({ [game.id]: saved[n] }));
    levels = everyone.reduce((best, one) => C.arcadeBest(best, one), {})[game.id] || {};
  }
  return Object.keys(levels).reduce((sum, id) => sum + levels[id].stars, 0);
}

function boardHtml(who) {
  if (who.kind === 'device') return '';
  const head = '<section class="panel" id="scoreboard"><h2>Family scoreboard</h2>';
  if (boardFor !== who.key) return head + '<p class="hint">Getting the family’s scores…</p></section>';
  return head + GAMES.map(g => {
    const rows = board[g.id];
    if (!rows) return '<h3 class="panel-sub">' + esc(g.title) + '</h3><p class="hint">The scoreboard can’t be reached right now. Scores are still saved on this device.</p>';
    if (!rows.length) return '<h3 class="panel-sub">' + esc(g.title) + '</h3><p class="hint">Nobody in the family has a score yet. Be the first.</p>';
    return '<h3 class="panel-sub">' + esc(g.title) + '</h3><div class="board">' + g.levels.map(([id, name]) => {
      const level = rows.filter(r => r.level === id);
      return '<div class="board-level"><h4>' + esc(name) + '</h4>' + (level.length
        ? '<ol>' + level.map(r => '<li' + (r.me ? ' class="me"' : '') + '><span class="b-who">' + esc(r.name) + (r.me ? ' (you)' : '') + '</span><span class="b-stars" aria-label="' + plural(r.stars, 'star') + '">' +
            '★'.repeat(r.stars) + '<i>' + '★'.repeat(3 - r.stars) + '</i></span><span class="b-pts">' + fmtNum(r.score) + '</span></li>').join('') + '</ol>'
        : '<p class="hint">No scores yet.</p>') + '</div>';
    }).join('') + '</div>';
  }).join('') + '<p class="hint">Everyone in your family who is signed in is on the board, by first name: more stars first, then the higher score.</p></section>';
}

export function renderGames() {
  const who = player();
  main.innerHTML =
    '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>Games</h1></div></header>' +
    '<div class="game-list">' + GAMES.map(g => {
      const got = stars(g, who), of = g.levels.length * 3;
      return '<section class="panel game-card"><div><h2>' + esc(g.title) + '</h2><p class="lead">' + esc(g.blurb) + '</p>' +
        '<p class="hint">' + (who.name ? 'Playing as ' + esc(who.name) + '. ' : '') + (got ? plural(got, 'star') + ' of ' + of + ' so far.' : 'No stars yet. ' + plural(g.levels.length, 'level') + ' to play.') + '</p></div>' +
        '<div class="row-actions"><a class="btn primary" href="' + esc(g.href) + '">Play</a></div></section>';
    }).join('') + '</div>' + boardHtml(who) +
    '<p class="hint game-note">' + (who.kind === 'device' ? 'Scores are kept on this device. Sign in under Farty Pants Central to keep scores in the family account and play against your family.'
      : esc(who.name) + '’s scores are saved to the family account, so they are on every device ' + esc(who.name) + ' plays on.') + '</p>';
  if (who.kind !== 'device' && boardFor !== who.key) loadBoard(who).then(() => { if (state.tab === 'games') renderGames(); });
}
