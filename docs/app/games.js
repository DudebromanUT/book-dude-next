/* The Games tab: the arcade's list of games, and keeping a signed-in reader's scores in her family's account.
 *
 * Each game is a page of its own in docs/games/<its name>/, with one line in GAMES below. A game keeps its scores on
 * the device through docs/games/arcade.js (which explains the few things a game needs to know). When a reader is
 * signed in, mirrorArcade() puts her scores from this device together with the ones in her account, best of each
 * level, and writes the result both ways, so every device she plays on shows her best. */

import { C, BASE, esc, plural } from './util.js';
import { state, saveSetting } from './state.js';
import { main } from './page.js';
import { greeting } from './cards.js';
import { activeKid, activeKidName } from './cloud.js';

export const GAMES = [
  { id: 'maple-madness', title: 'Maple’s Big Day', blurb: 'Poop Patrol, Catch Fig, Garden Duty and Tug of War, starring Maple and Fig. In English and Spanish.', levels: 4, href: 'games/maple-madness/' }
];

const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
const prefix = () => 'book-dude:arcade:' + BASE + (activeKid() ? 'kid:' + activeKid() : 'device') + ':';

/** With a reader signed in: her scores here and in her account become one set, the best of each level, in both places. */
export async function mirrorArcade() {
  const name = activeKidName();
  if (!activeKid() || !name) return;
  const here = {};
  for (const g of GAMES) {
    const saved = read(prefix() + g.id + ':records');
    if (saved && typeof saved === 'object' && saved[name]) here[g.id] = saved[name];
  }
  const best = C.arcadeBest(state.settings.arcade, here);
  if (JSON.stringify(best) !== JSON.stringify(state.settings.arcade)) await saveSetting('arcade', best);
  for (const g of GAMES) {
    try { localStorage.setItem(prefix() + g.id + ':records', JSON.stringify({ [name]: best[g.id] || {} })); } catch (e) { /* the game will show what it has */ }
  }
}

// Stars earned in a game: the signed-in reader's, or on a device that isn't signed in, the best anyone here has on each level.
function stars(game) {
  let levels = {};
  if (activeKid()) levels = state.settings.arcade[game.id] || {};
  else {
    const saved = read(prefix() + game.id + ':records');
    const everyone = Object.keys(saved && typeof saved === 'object' ? saved : {}).map(n => ({ [game.id]: saved[n] }));
    levels = everyone.reduce((best, one) => C.arcadeBest(best, one), {})[game.id] || {};
  }
  return Object.keys(levels).reduce((sum, id) => sum + levels[id].stars, 0);
}

export function renderGames() {
  const reader = activeKid() ? activeKidName() : '';
  main.innerHTML =
    '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>Games</h1></div></header>' +
    '<div class="game-list">' + GAMES.map(g => {
      const got = stars(g), of = g.levels * 3;
      return '<section class="panel game-card"><div><h2>' + esc(g.title) + '</h2><p class="lead">' + esc(g.blurb) + '</p>' +
        '<p class="hint">' + (got ? plural(got, 'star') + ' of ' + of + ' so far.' : 'No stars yet. ' + plural(g.levels, 'level') + ' to play.') + '</p></div>' +
        '<div class="row-actions"><a class="btn primary" href="' + esc(g.href) + '">Play</a></div></section>';
    }).join('') + '</div>' +
    '<p class="hint game-note">' + (reader ? esc(reader) + '’s scores are saved to the family account, so they are on every device ' + esc(reader) + ' plays on.'
      : 'Scores are kept on this device. Sign in under Farty Pants Central to keep a reader’s scores in the family account.') + '</p>';
}
