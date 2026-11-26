/* The Book Dude arcade, as a game sees it. Every game page loads this before its own code and asks for its place to
 * keep things:
 *     const ARCADE = window.BookDudeArcade.open('maple-madness');
 *     ARCADE.player          the first name of whoever is signed in (a reader, or a grown-up playing as themselves),
 *                            or '' on a device that isn't signed in
 *     ARCADE.kind            'reader', 'grownup' or 'device' (not signed in)
 *     ARCADE.get('records')  something this game saved earlier (null if nothing)
 *     ARCADE.set('records', value)
 * What a game saves is kept on the device, apart for each player and for the device itself. When someone is signed
 * in, Book Dude (docs/app/games.js) copies their best scores to the family's account, brings back the ones from their
 * other devices, and shows the family's scoreboard; for that, a game keeps its scores under 'records' as
 * { playerName: { levelId: { stars, score } } }.
 * A game never talks to the account itself, and needs nothing else from Book Dude. */
(function () {
  'use strict';
  // The app's address on this site, e.g. /book-dude-next/ (a game lives two folders down, in games/<its name>/).
  var BASE = new URL('../../', location.href).pathname;
  var read = function (key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
  var write = function (key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked: scores last until the game closes */ } };

  // Who is signed in on this device, as the app remembers it (docs/app/cloud.js).
  var account = read('reading-room:ui:' + BASE + ':account');
  // A grown-up plays as themselves, whichever reader's books they have open; a reader's device plays as that reader.
  var id = /^[0-9a-f-]{36}$/;
  var who = 'device', player = '';
  if (account && account.me && account.role === 'grownup' && account.me.grownup && account.session && id.test(account.session.user || '')) {
    who = 'grownup:' + account.session.user;
    player = String(account.me.grownup.name || '') || 'Grown-up';
  } else if (account && account.me && account.role === 'reader' && account.me.kid && id.test(account.kid || '') && account.me.kid.id === account.kid) {
    who = 'kid:' + account.kid;
    player = String(account.me.kid.name || '');
  }
  var prefix = 'book-dude:arcade:' + BASE + who + ':';

  // Scores from a game's life before the arcade (Maple Madness was its own site at this address), taken once.
  var BEFORE = { 'maple-madness': { records: 'maple-records', profile: 'maple-profile' } };
  function moveIn(game) {
    var old = BEFORE[game];
    if (!old || read(prefix + game + ':records') !== null) return;
    var records = read(old.records), profile = read(old.profile);
    if (!records || typeof records !== 'object') return;
    if (!player) {
      write(prefix + game + ':records', records);
      if (profile && typeof profile === 'object') write(prefix + game + ':profile', profile);
      return;
    }
    // Someone signed in takes the old scores under their own name, or the only name there is. Anyone else's stay put.
    var names = Object.keys(records), mine = '';
    for (var n = 0; n < names.length; n++) if (names[n].toLowerCase() === player.toLowerCase()) mine = names[n];
    if (!mine && names.length === 1) mine = names[0];
    var out = {};
    if (mine) out[player] = records[mine];
    write(prefix + game + ':records', out);
    if (profile && typeof profile === 'object' && (profile.lang === 'en' || profile.lang === 'es')) write(prefix + game + ':profile', { lang: profile.lang });
  }

  window.BookDudeArcade = {
    open: function (game) {
      moveIn(game);
      return {
        player: player,
        // who is playing: 'reader', 'grownup' (playing as themselves), or 'device' (not signed in)
        kind: who === 'device' ? 'device' : who.indexOf('grownup:') === 0 ? 'grownup' : 'reader',
        get: function (name) { return read(prefix + game + ':' + name); },
        set: function (name, value) { write(prefix + game + ':' + name, value); }
      };
    }
  };
})();
