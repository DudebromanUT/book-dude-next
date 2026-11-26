/* Fig-o-Clock: the screen-time countdown the family's texts link to. Fig the cat is wide awake when the clock is full
 * and gets sleepier as it runs down, until she is fast asleep when screen time is over.
 *
 * The link carries the clock as it was when the text went out (after #): e (when it ends, in seconds), m (minutes on
 * the clock), l (seconds left, when paused or stopped), s (r running, p paused, x stopped), b (minutes still in her
 * bank), n (her name). With t and u (a view-only code and the family script's id) it also asks the family script every
 * 30 seconds for the clock as it is now, so a pause, more minutes or a stop shows here too. The view-only code shows the
 * clock and nothing else. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.hash.slice(1));
  var num = function (k) { var v = Number(q.get(k)); return isFinite(v) && v >= 0 ? v : 0; };
  var name = (q.get('n') || 'Maddy').replace(/[^A-Za-z .'-]/g, '').slice(0, 30) || 'Maddy';
  var clock = {
    state: { r: 'running', p: 'paused', x: 'stopped' }[q.get('s')] || (num('e') ? 'running' : 'none'),
    minutes: Math.min(1440, num('m')), ends: num('e') * 1000, left: num('l') * 1000, bank: q.has('b') ? num('b') : null
  };
  var token = /^[a-f0-9]{8,40}$/.test(q.get('t') || '') ? q.get('t') : '';
  var script = /^[\w-]{10,120}$/.test(q.get('u') || '') ? q.get('u') : '';

  // ---------------------------------------------------------------------------------------------------------------
  // Fig, drawn facing you on her cushion: a gray tabby with yellow-green eyes.

  var GRAY = '#8C9198', DARK = '#5B6067', LIGHT = '#C9CDD2', PINK = '#E8A9B5', EYE = '#C8D64F';
  // Her fluffy mane: tufts all the way around, drawn as a soft star (n tufts, each `depth` deep) from angle a0 to a1
  // (degrees, 0 = right, 90 = down), closed through the middle so the head covers the inside.
  var fluff = function (cx, cy, rx, ry, n, depth, a0, a1, fill) {
    var d = '', step = (a1 - a0) / n;
    for (var i = 0; i <= n; i++) {
      var a = (a0 + i * step) * Math.PI / 180, m = (a0 + (i + .5) * step) * Math.PI / 180;
      var x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      var tx = cx + (rx + depth) * Math.cos(m), ty = cy + (ry + depth) * Math.sin(m);
      d += (i ? ' Q' + (tx - depth * .35 * Math.sin(m)).toFixed(1) + ' ' + (ty + depth * .35 * Math.cos(m)).toFixed(1) + ' ' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      if (i < n) d += ' L' + tx.toFixed(1) + ' ' + ty.toFixed(1);
    }
    return '<path d="' + d + ' L' + cx + ' ' + cy + ' Z" fill="' + fill + '"/>';
  };
  var MANE = '#A7ACB3', MANE_DARK = '#757A81', BIB = '#DDE0E4';
  var eye = function (side, cx) {
    return '<g class="eye-' + side + '">' +
      '<clipPath id="clip-' + side + '"><ellipse cx="' + cx + '" cy="88" rx="13" ry="14"/></clipPath>' +
      '<ellipse cx="' + cx + '" cy="88" rx="13" ry="14" fill="' + EYE + '"/>' +
      '<ellipse class="pupil" cx="' + cx + '" cy="88" rx="6" ry="11" fill="#14110F"/>' +
      '<circle cx="' + (cx + 4) + '" cy="82" r="2.6" fill="#FFFFFF"/>' +
      '<g clip-path="url(#clip-' + side + ')"><ellipse cx="' + cx + '" cy="88" rx="13" ry="14" fill="none" stroke="' + DARK + '" stroke-width="4"/>' +
        '<rect class="lid" x="' + (cx - 15) + '" y="72" width="30" height="0" fill="' + GRAY + '"/>' +
        '<path class="lid-line" d="" stroke="' + DARK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>' +
      '<path class="shut" d="M' + (cx - 12) + ' 89 Q' + cx + ' 99 ' + (cx + 12) + ' 89" stroke="' + DARK + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>' +
    '</g>';
  };
  $('fig').innerHTML =
    '<ellipse cx="100" cy="186" rx="88" ry="13" fill="#7B5EA7"/><ellipse cx="100" cy="181" rx="80" ry="10" fill="#9A7FC4"/>' +
    '<g class="tail"><path d="M158 170 C190 166 192 140 176 128" stroke="' + GRAY + '" stroke-width="11" fill="none" stroke-linecap="round"/>' +
      '<path d="M183 160 l-8 -3 M187 146 l-9 0 M181 134 l-8 4" stroke="' + DARK + '" stroke-width="3.5" stroke-linecap="round"/></g>' +
    '<g class="breath"><ellipse cx="100" cy="160" rx="66" ry="30" fill="' + GRAY + '"/>' +
      '<path d="M70 140 q4 14 0 28 M88 136 q4 16 0 32 M112 136 q-4 16 0 32 M130 140 q-4 14 0 28" stroke="' + DARK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="72" cy="182" rx="14" ry="7" fill="' + LIGHT + '"/><ellipse cx="128" cy="182" rx="14" ry="7" fill="' + LIGHT + '"/>' +
      fluff(100, 132, 34, 24, 9, 11, 10, 170, BIB) + '</g>' +
    '<g id="head">' +
      fluff(100, 98, 64, 54, 30, 15, -55, 235, MANE_DARK) + fluff(100, 100, 60, 50, 26, 12, -40, 220, MANE) +
      '<path d="M50 78 L58 28 L90 54 Z" fill="' + GRAY + '"/><path d="M58 68 L62 40 L82 56 Z" fill="' + PINK + '"/>' +
      '<path d="M150 78 L142 28 L110 54 Z" fill="' + GRAY + '"/><path d="M142 68 L138 40 L118 56 Z" fill="' + PINK + '"/>' +
      '<ellipse cx="100" cy="92" rx="56" ry="47" fill="' + GRAY + '"/>' +
      '<path d="M86 50 q3 10 0 20 M100 47 q0 12 0 24 M114 50 q-3 10 0 20" stroke="' + DARK + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M46 96 l14 -2 M46 106 l14 0 M154 96 l-14 -2 M154 106 l-14 0" stroke="' + DARK + '" stroke-width="3.5" stroke-linecap="round"/>' +
      fluff(100, 104, 52, 40, 7, 9, 20, 160, LIGHT) +
      '<ellipse cx="100" cy="92" rx="52" ry="44" fill="' + GRAY + '"/>' +
      '<path d="M86 50 q3 10 0 20 M100 47 q0 12 0 24 M114 50 q-3 10 0 20" stroke="' + DARK + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M44 92 l-8 -4 l6 8 l-9 2 l9 4 M156 92 l8 -4 l-6 8 l9 2 l-9 4" fill="' + MANE + '" stroke="' + MANE + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="100" cy="118" rx="26" ry="17" fill="' + LIGHT + '"/>' +
      eye('l', 76) + eye('r', 124) +
      '<path d="M94 108 L106 108 L100 115 Z" fill="' + PINK + '"/>' +
      '<path class="mouth" d="M100 115 q-6 8 -13 3 M100 115 q6 8 13 3" stroke="' + DARK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<g class="yawn" opacity="0"><ellipse cx="100" cy="124" rx="9" ry="11" fill="#7A2E3A"/><ellipse cx="100" cy="130" rx="6" ry="4" fill="' + PINK + '"/></g>' +
      '<path d="M74 118 l-32 -6 M74 123 l-32 2 M126 118 l32 -6 M126 123 l32 2" stroke="#F4F4F4" stroke-width="1.6" stroke-linecap="round"/>' +
      '<g class="cap" opacity="0"><path d="M58 58 Q92 10 150 30 Q160 52 150 58 Q104 44 58 58 Z" fill="#3E6FB5"/>' +
        '<path d="M150 30 Q176 40 172 70" stroke="#3E6FB5" stroke-width="10" fill="none" stroke-linecap="round"/>' +
        '<circle cx="172" cy="74" r="9" fill="#FFFFFF"/><path d="M58 58 Q104 44 150 58" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round"/></g>' +
    '</g>' +
    '<g class="zzz"><text x="150" y="40">z</text><text x="160" y="30">Z</text><text x="170" y="20">Z</text></g>';

  var svg = $('fig'), head = $('head');
  var lids = ['l', 'r'].map(function (s) {
    var g = svg.querySelector('.eye-' + s), cx = s === 'l' ? 76 : 124;
    return { cx: cx, lid: g.querySelector('.lid'), line: g.querySelector('.lid-line'), shut: g.querySelector('.shut'), pupil: g.querySelector('.pupil') };
  });

  // How open her eyes are, 0 (shut) to 1 (wide), and how big her pupils are.
  function eyes(open, pupil) {
    var top = 74, h = 28 * (1 - open);
    lids.forEach(function (e) {
      e.lid.setAttribute('height', String(h + 2));
      e.line.setAttribute('d', open < .98 ? 'M' + (e.cx - 14) + ' ' + (top + h) + ' Q' + e.cx + ' ' + (top + h + 4) + ' ' + (e.cx + 14) + ' ' + (top + h) : '');
      e.shut.setAttribute('opacity', open < .04 ? '1' : '0');
      e.pupil.setAttribute('rx', String(2.5 + 5.5 * pupil));
    });
  }

  // ---------------------------------------------------------------------------------------------------------------
  // What Fig says, by how much screen time is left.

  function caption(st, frac) {
    if (st === 'none') return 'This link is missing its time. Open the newest Book Dude text.';
    if (st === 'stopped') return 'Stopped early. Fig shrugged and went back to sleep. Unused minutes went back to the bank.';
    if (st === 'up') return 'Fig is asleep. So is screen time. Time to hand over the remote.';
    if (st === 'paused') return 'Paused. Fig is holding perfectly still, like a cat who just knocked something off the counter.';
    if (frac > .8) return 'Fig is WIDE awake. She has had three breakfasts and is ready to fight a sock.';
    if (frac > .6) return 'Fig is alert. She is supervising your screen time very closely.';
    if (frac > .4) return 'The slow blink. Fig is losing a staring contest with a sunbeam.';
    if (frac > .2) return 'Fig is getting heavy-eyed. Every yawn is bigger than the last.';
    if (frac > .07) return 'Loaf mode. Fig’s eyes are almost closed. Wrap it up!';
    return 'Fig is falling asleep… and so is your screen time.';
  }

  var timeText = function (ms) { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  function mmss(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
  }
  function leftNow(now) {
    if (clock.state === 'running') return Math.max(0, clock.ends - now);
    if (clock.state === 'paused' || clock.state === 'stopped') return clock.left;
    return 0;
  }

  var blinkAt = Date.now() + 2500, yawnAt = Date.now() + 6000, lastCaption = '';
  function draw() {
    var now = Date.now(), left = leftNow(now), total = clock.minutes * 60000;
    var frac = total ? Math.min(1, left / total) : 0;
    var st = clock.state === 'running' && left <= 0 ? 'up' : clock.state;
    var asleep = st === 'up' || st === 'stopped' || st === 'none';
    // Eyes: wide open down to 80% left, then closing; a blink now and then, slower as she gets sleepy.
    var open = asleep ? 0 : Math.min(1, frac / .8);
    if (!asleep && st !== 'paused' && now > blinkAt) {
      var t = now - blinkAt, len = frac > .4 ? 220 : 900;
      if (t < len) open *= Math.abs(1 - 2 * t / len);
      else blinkAt = now + (frac > .4 ? 2500 + Math.random() * 3000 : 1800 + Math.random() * 1500);
    }
    eyes(open, asleep ? 0 : .3 + .7 * frac);
    // Yawns once she's past the middle.
    var yawning = false;
    if (!asleep && frac < .6 && now > yawnAt) {
      if (now - yawnAt < 1400) yawning = true;
      else yawnAt = now + 7000 + Math.random() * 5000;
    }
    if (st === 'paused') yawning = true;   // frozen mid-yawn
    svg.querySelector('.yawn').setAttribute('opacity', yawning ? '1' : '0');
    svg.querySelector('.mouth').setAttribute('opacity', yawning ? '0' : '1');
    svg.querySelector('.cap').setAttribute('opacity', asleep && st !== 'none' ? '1' : '0');
    // Her head droops and tips as the clock runs down.
    var droop = asleep ? 1 : 1 - frac;
    head.setAttribute('transform', 'translate(0 ' + (droop * 14).toFixed(1) + ') rotate(' + (droop * 12).toFixed(1) + ' 100 120)');
    svg.setAttribute('class', asleep ? 'asleep' : st === 'paused' ? 'paused' : frac < .4 ? 'sleepy' : '');
    // The sky goes from morning to night.
    var night = asleep ? 1 : 1 - frac;
    document.body.classList.toggle('night', night > .62);
    document.body.style.setProperty('--sky-top', mix('#FFE6A3', '#16203F', night));
    document.body.style.setProperty('--sky-bottom', mix('#FFF6DE', '#3A3567', night));
    document.body.style.setProperty('--bar', frac > .4 ? '#E0A030' : frac > .15 ? '#D0703A' : '#B3261E');

    $('left').textContent = st === 'none' ? '--:--' : mmss(left);
    $('ends').textContent = st === 'running' ? 'ends ' + timeText(clock.ends) : st === 'paused' ? 'paused' : st === 'up' ? 'ended ' + timeText(clock.ends) : '';
    $('bar').style.width = (frac * 100).toFixed(1) + '%';
    var c = caption(st, frac);
    if (c !== lastCaption) { $('caption').textContent = c; lastCaption = c; }
    $('bank').textContent = clock.bank === null ? '' : clock.bank + ' min still in ' + name + '’s bank';
    document.title = (st === 'running' ? mmss(left) + ' · ' : '') + 'Fig-o-Clock';
    if (!document.body.classList.contains('ready')) setTimeout(function () { document.body.classList.add('ready'); }, 50);
    requestAnimationFrame(draw);
  }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return 'rgb(' + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * t); }).join(',') + ')';
  }

  // ---------------------------------------------------------------------------------------------------------------
  // The clock as it is now, from the family script (view only).

  function look() {
    if (!token || !script || document.hidden) return;
    fetch('https://script.google.com/macros/s/' + script + '/exec?clock=' + token).then(function (r) { return r.json(); }).then(function (c) {
      if (!c || !c.state || c.error) return;
      clock.state = c.state === 'running' || c.state === 'paused' || c.state === 'stopped' ? c.state : clock.state;
      if (Number(c.minutes) > 0) clock.minutes = Math.min(1440, Number(c.minutes));
      if (Number(c.ends) > 0) clock.ends = Number(c.ends);
      if (Number(c.left) >= 0) clock.left = Number(c.left);
      if (Number(c.bank) >= 0) clock.bank = Number(c.bank);
    }).catch(function () { /* offline: the link's own time keeps counting */ });
  }

  window.__fig = clock;
  draw();
  look();
  setInterval(look, 30000);
  document.addEventListener('visibilitychange', look);
  // A newer text's link opened in the same tab: start over with it.
  window.addEventListener('hashchange', function () { location.reload(); });
}());
