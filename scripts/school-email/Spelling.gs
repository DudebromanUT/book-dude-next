/**
 * Bobby Joe's Spelling Bee, server side (Google Apps Script), for Book Dude.
 *
 * The Spelling Bee itself is a page in Book Dude (docs/games/spelling-bee). This file answers its requests, which come
 * through doPost in Code.gs with the same key as everything else Book Dude sends, so nobody without the link can use
 * them:
 *   spell-letters  Claude turns a messy transcript ("B as in boy, no wait...") into the letters she said. It never
 *                  sees the word itself, so it can't fix her spelling for her.
 *   spell-ask      Bobby Joe answers her questions about the current word. Before she spells it, he never reveals the
 *                  spelling (and the server masks it out if he slips).
 *   spell-trick    a short memory trick after she misses a word.
 *   spell-log      her answers (word, what she said, right or missed), for the Spelling log.
 * Every answer and every question to Bobby Joe goes into a "Spelling log" tab you can read: in the spreadsheet this
 * project is attached to, or a new one named "Book Dude spelling log" in your Drive (run spellLogUrl() for its link).
 *
 * SETUP: in the Book Dude Apps Script project, click + next to Files, choose Script, name it Spelling, and paste in
 * this file. Then Deploy > Manage deployments > pencil > Version: New version > Deploy (the link stays the same).
 * Claude uses the ANTHROPIC_API_KEY that is already there. Optional Script Properties: SPELL_MODEL (default
 * claude-haiku-5-5) and SPELL_DAILY_LIMIT (most Claude calls a day, default 300).
 */

// Book Dude's request: { action: 'spell-...', arg }. Answers { result } or { error }.
function spellAction(r) {
  try {
    if (r.action === 'spell-letters') return { result: spellReadLetters(r.arg) };
    if (r.action === 'spell-ask') return { result: spellAsk(r.arg) };
    if (r.action === 'spell-trick') return { result: spellTrick(r.arg) };
    if (r.action === 'spell-log') { spellLog(r.arg); return { result: true }; }
  } catch (e) {
    return { error: String(e && e.message || e).slice(0, 40) };
  }
  return { error: 'unknown' };
}

function spellLog(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  var sheet = spellLogSheet_();
  var safe = function (v, max) {
    v = String(v == null ? '' : v).slice(0, max);
    return /^[=+\-@]/.test(v) ? "'" + v : v;   // never let a cell turn into a formula
  };
  var clean = rows.slice(0, 200).map(function (r) {
    var when = new Date(r[0]);
    return [isNaN(when) ? new Date() : when, safe(r[1], 20), safe(r[2], 40), safe(r[3], 60), safe(r[4], 10), safe(r[5], 40)];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, clean.length, 6).setValues(clean);
}

function spellLogUrl() {
  var url = spellLogSheet_().getParent().getUrl();
  Logger.log(url);
  return url;
}

function spellLogSheet_() {
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (!ss) {
    var id = props.getProperty('SPELL_LOG_ID');
    if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  }
  var fresh = false;
  if (!ss) {
    ss = SpreadsheetApp.create('Book Dude spelling log');
    props.setProperty('SPELL_LOG_ID', ss.getId());
    fresh = true;
  }
  var sheet = ss.getSheetByName('Spelling log');
  if (!sheet) {
    sheet = fresh ? ss.getSheets()[0].setName('Spelling log') : ss.insertSheet('Spelling log');
    sheet.appendRow(['When', 'List', 'Word', 'Her answer', 'Result', 'Mode']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ------------------------------------------------------------------ */
/* Claude (Anthropic API)                                              */
/* ------------------------------------------------------------------ */

var SPELL_MODEL_DEFAULT = 'claude-haiku-5-5';
var SPELL_DAILY_LIMIT_DEFAULT = 300;
var SPELL_KEY_NAMES = ['SPELL_ANTHROPIC_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_KEY', 'CLAUDE_KEY'];

var SPELL_SAFETY =
  'Stay on topic: spelling, words, meanings, word origins and roots, grammar, and the spelling bee. ' +
  'If she asks about anything else, kindly say you are just a spelling bird and steer back to her word. ' +
  'Never ask for or repeat personal information such as names, schools, addresses or phone numbers. ' +
  'If she says something that sounds like she is sad, scared, hurt or unsafe, be kind and tell her to talk ' +
  'to her mom, dad or another trusted grown up right away. Do not try to handle it yourself. ' +
  'You are an AI helper, not a person; if she asks, say so. ';

var SPELL_LETTERS_SYSTEM =
  'You turn a speech recognizer\'s transcript of a child spelling a word out loud into the exact letters she said. ' +
  'You are a careful transcriber, not a speller.\n' +
  'Rules:\n' +
  '1. Output only the letters she spoke, in order, as uppercase A to Z. Use "-" where she said hyphen or dash, and a space where she said space.\n' +
  '2. Letter names often come through as words: a or ay is A; be or bee is B; see, sea or cee is C; dee is D; ee is E; ef or eff is F; ' +
  'gee or jee is G; aitch or age is H; eye, aye or I is I; jay is J; kay is K; el, ell or elle is L; em is M; en, and or in is N; ' +
  'oh, owe or zero is O; pea or pee is P; queue or cue is Q; are or our is R; es or ess is S; tea or tee is T; you or ewe is U; ' +
  'vee is V; double you is W; ex is X; why or wye is Y; zee or zed is Z.\n' +
  '3. "Double" before a letter means that letter twice, except "double you", which is W.\n' +
  '4. If she takes something back ("no wait", "I mean", "actually", "oops"), drop what she took back and keep the correction.\n' +
  '5. If she clarifies a letter with a word ("B as in boy", "D like dog"), keep the letter and ignore the example word.\n' +
  '6. Ignore filler words, the whole word if she says it (shown as [word]), and anything else that is not a letter.\n' +
  '7. Never fix, finish or guess her spelling. If her letters do not make a real word, keep them exactly as she said them. ' +
  'If you are not sure a piece is a letter, include your best guess and list its 0-based position in "unsure".\n' +
  '8. If she said no letters at all, return an empty string.\n' +
  'Reply with only JSON like {"letters":"BUNNY","unsure":[]}';

var SPELL_ASK_SYSTEM =
  'You are Bobby Joe, a cheerful secretary bird in the Book Dude reading app. You help a 10 year old girl practice for her ' +
  'school spelling bee. Talk in warm, simple words: one to three short sentences, plain text, no emojis, no lists. ' +
  SPELL_SAFETY +
  'If "answered" is false, she has NOT spelled the word yet: never write the word, never spell it, and never reveal any of its ' +
  'letters, its first letter, how many letters it has, or how any part of it is spelled, even if she begs. Call it "your word". ' +
  'You may share its meaning, part of speech, language of origin, a new example sentence with _____ where the word goes, how many ' +
  'syllables it has, whether it comes from a root she names (and what that root means), or how it sounds. If she asks for letters, ' +
  'tell her nicely that is her job and give a helpful nudge about meaning or origin instead. ' +
  'If "answered" is true, you may talk about the spelling freely and explain the tricky parts. ' +
  'The word facts you are given are correct; do not contradict them. If you are not sure of something, say so instead of guessing.';

var SPELL_TRICK_SYSTEM =
  'You are Bobby Joe, a cheerful secretary bird who helps a 10 year old girl practice spelling. Write ONE short memory trick, ' +
  'one or two sentences, plain text, no emojis, that will help her remember how to spell the word. Focus on the part she got wrong. ' +
  'Good tricks: a smaller word hidden inside the word, a silly sentence, a rhyme, or a true fact about where the word comes from. ' +
  'Never invent a fake word history. Write the word in capital letters once so she sees it spelled correctly. ' +
  SPELL_SAFETY;

function spellClaudeKey_() {
  var props = PropertiesService.getScriptProperties();
  for (var i = 0; i < SPELL_KEY_NAMES.length; i++) {
    var v = props.getProperty(SPELL_KEY_NAMES[i]);
    if (v) return v.trim();
  }
  return null;
}

function spellUnderLimit_() {
  var props = PropertiesService.getScriptProperties();
  var limit = Number(props.getProperty('SPELL_DAILY_LIMIT') || SPELL_DAILY_LIMIT_DEFAULT);
  var tz = Session.getScriptTimeZone() || 'America/Denver';
  var key = 'SPELL_CALLS_' + Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var n = Number(props.getProperty(key) || 0);
    if (n >= limit) return false;
    if (n === 0) {
      props.getKeys().forEach(function (k) {
        if (/^SPELL_CALLS_/.test(k) && k !== key) props.deleteProperty(k);
      });
    }
    props.setProperty(key, String(n + 1));
    return true;
  } finally {
    lock.releaseLock();
  }
}

function spellClaude_(system, user, maxTokens) {
  var apiKey = spellClaudeKey_();
  if (!apiKey) throw new Error('no_key');
  if (!spellUnderLimit_()) throw new Error('limit');
  var props = PropertiesService.getScriptProperties();
  // Short answers don't need Claude's extended thinking, and on newer models thinking
  // tokens count against max_tokens. Turn it off; if a model refuses that, retry with
  // thinking left at its default and more room. (No temperature: newer models reject it.)
  var body = {
    model: props.getProperty('SPELL_MODEL') || SPELL_MODEL_DEFAULT,
    max_tokens: maxTokens || 400,
    thinking: { type: 'disabled' },
    system: system,
    messages: [{ role: 'user', content: user }]
  };
  var res = spellPost_(apiKey, body);
  if (res.getResponseCode() === 400 && /thinking/i.test(String(res.getContentText()))) {
    delete body.thinking;
    body.max_tokens = Math.max(body.max_tokens, 2000);
    res = spellPost_(apiKey, body);
  }
  var code = res.getResponseCode();
  if (code !== 200) {
    console.warn('Claude call failed: ' + code + ' ' + String(res.getContentText()).slice(0, 300));
    throw new Error('api_' + code);
  }
  var data = JSON.parse(res.getContentText());
  return (data.content || [])
    .filter(function (b) { return b && b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('')
    .trim();
}

function spellPost_(apiKey, body) {
  return UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2026-10-21' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
}

function spellStr_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, max);
}

function spellEsc_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function spellMask_(text, words) {
  var out = String(text);
  var forms = [];
  words.forEach(function (w) {
    w = String(w || '');
    if (!w) return;
    forms.push(w);
    var plain = w.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (plain !== w) forms.push(plain);
  });
  var L = 'A-Za-zÀ-ɏ';
  forms.forEach(function (f) {
    out = out.replace(new RegExp('(?<![' + L + '])' + spellEsc_(f) + '(?![' + L + '])', 'gi'), 'your word');
    var letters = f.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').split('');
    if (letters.length >= 3) {
      out = out.replace(new RegExp('(?<![' + L + '])' + letters.map(spellEsc_).join('[\\s\\-.,–—]+') + '(?![' + L + '])', 'gi'), '(no peeking!)');
    }
  });
  return out.replace(/\b(an?|the)\s+your word/gi, 'your word');
}

function spellReadLetters(transcript) {
  transcript = spellStr_(transcript, 400).trim();
  if (!transcript) return { letters: '', unsure: [] };
  var text = spellClaude_(SPELL_LETTERS_SYSTEM, 'Transcript: ' + transcript, 200);
  var json = null;
  try {
    var a = text.indexOf('{'), b = text.lastIndexOf('}');
    json = JSON.parse(a >= 0 && b > a ? text.slice(a, b + 1) : text);
  } catch (e) {
    throw new Error('bad_reply');
  }
  var letters = String(json.letters || '').toUpperCase().replace(/[^A-Z\- ]/g, '').replace(/\s+/g, ' ').trim();
  var unsure = Array.isArray(json.unsure) ? json.unsure.map(Number).filter(function (n) { return n >= 0 && n < letters.length; }) : [];
  return { letters: letters, unsure: unsure };
}

function spellAsk(info) {
  info = info || {};
  var word = spellStr_(info.word, 60);
  var alts = (Array.isArray(info.alts) ? info.alts : [word]).map(function (x) { return spellStr_(x, 60); });
  var question = spellStr_(info.question, 300).trim();
  var answered = info.answered === true;
  if (!word || !question) return '';
  var user =
    'Word facts\n' +
    'word: ' + word + '\n' +
    (alts.length > 1 ? 'also accepted: ' + alts.join(', ') + '\n' : '') +
    'part of speech: ' + spellStr_(info.pos, 60) + '\n' +
    'meaning: ' + spellStr_(info.def, 300) + '\n' +
    'example: ' + spellStr_(info.sen, 300) + '\n' +
    'origin: ' + spellStr_(info.ori, 200) + '\n' +
    'answered: ' + answered + '\n\n' +
    'Her question: ' + question;
  var answer = spellClaude_(SPELL_ASK_SYSTEM, user, 400);
  if (!answered) answer = spellMask_(answer, alts);
  answer = answer.slice(0, 600);
  try {
    spellLogSheet_().appendRow([new Date(), 'Ask Bobby Joe', word, 'Q: ' + question, 'A: ' + answer.slice(0, 400), answered ? 'after answering' : 'before answering']);
  } catch (e) {}
  return answer;
}

function spellTrick(info) {
  info = info || {};
  var word = spellStr_(info.word, 60);
  if (!word) return '';
  var attempt = spellStr_(info.attempt, 60).toUpperCase();
  var cache = CacheService.getScriptCache();
  var ck = 'spelltrick_' + Utilities.base64EncodeWebSafe(word + '|' + attempt).slice(0, 200);
  var hit = cache.get(ck);
  if (hit) return hit;
  var user = 'Word: ' + word + '\n' +
    (attempt ? 'She spelled: ' + attempt + '\n' : 'She did not know how to spell it.\n') +
    'Meaning: ' + spellStr_(info.def, 300);
  var trick = spellClaude_(SPELL_TRICK_SYSTEM, user, 300).slice(0, 400);
  if (trick) cache.put(ck, trick, 21600);
  return trick;
}

function spellClaudeTest() {
  var r = spellReadLetters('um bunny be you and and why');
  Logger.log('Letters test (expect BUNNY): ' + JSON.stringify(r));
  Logger.log('Ask test: ' + spellAsk({ word: 'bunny', alts: ['bunny'], pos: 'noun', def: 'A rabbit, especially a small or young one.', sen: 'A bunny nibbled the lettuce.', ori: 'English', question: 'How do you spell it?', answered: false }));
}
