/* Account check, for a grown-up signed in to the family account: what the account itself holds for each reader, read
 * fresh from the account with the grown-up's own sign-in (not this device's copy), and the points worked out from it the
 * same way the app does. Shown as a table, and downloadable as CSV: one row per reader, plus the latest saves. */

import { C, esc, fmtNum, today } from './util.js';
import { CATALOG_BOOKS } from './books.js';
import { account, call } from './cloud.js';
import { showBox, toast } from './page.js';

const PAGE = 1000;

// Every row the account holds for one reader, oldest change first. null when the account can't be reached.
async function pullAll(kid) {
  const rows = [];
  let cursor = 0;
  for (let n = 0; n < 50; n++) {
    const r = await call('GET', '/rest/v1/items?select=kind,id,data,client_at,deleted,rev&kid_id=eq.' + encodeURIComponent(kid) + '&rev=gt.' + cursor + '&order=rev.asc&limit=' + PAGE);
    if (r.status !== 200 || !Array.isArray(r.json)) return null;
    rows.push(...r.json);
    if (r.json.length < PAGE) break;
    cursor = Number(r.json[r.json.length - 1].rev) || cursor;
  }
  return rows;
}

const localTime = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
};

// One reader's numbers, from the account's rows, worked out the same way as the Progress tab.
function summarize(name, rows) {
  const records = {}, settings = {};
  let added = 0, last = '';
  for (const row of rows) {
    if (row.client_at && row.client_at > last) last = row.client_at;
    const v = C.cloudValue(row);
    if (!v || v.value === null) continue;
    if (v.kind === 'record') records[v.id] = v.value;
    else if (v.kind === 'setting') settings[v.id] = v.value;
    else if (v.kind === 'book') added++;
  }
  const ids = Object.keys(records), books = ids.filter(id => !C.isExam(id));
  const cfg = C.reward(settings.reward);
  const appPoints = C.metrics(CATALOG_BOOKS, records, '').earned;
  const tests = C.examPoints(records), home = C.homePoints(records), spell = C.spellPoints(settings.spelling).total;
  const total = C.rewardPoints(appPoints, settings.reward, tests + home + spell);
  const screen = C.screenTime(total, records, CATALOG_BOOKS, settings.reward);
  return [
    [ 'reader', name ],
    [ 'book_records', books.length ],
    [ 'finished_books', books.filter(id => records[id].status === 'finished').length ],
    [ 'quizzes_entered_in_app', books.filter(id => records[id].quizScore !== null && records[id].quizScore !== undefined).length ],
    [ 'quiz_points_entered_in_app', appPoints ],
    [ 'school_ar_total', cfg.school === null ? '' : cfg.school ],
    [ 'school_total_date', cfg.schoolDate || '' ],
    [ 'school_starting_line', cfg.schoolStart ],
    [ 'book_dude_test_points', tests ],
    [ 'home_points', home ],
    [ 'spelling_points', spell ],
    [ 'points_for_rewards', total ],
    [ 'screen_minutes_earned', screen.earned ],
    [ 'screen_minutes_given', screen.given ],
    [ 'screen_minutes_waiting', screen.owed ],
    [ 'piano_minutes_this_week', C.pianoWeek(settings.piano, today()).minutes ],
    [ 'books_she_added', added ],
    [ 'saved_items_in_account', rows.filter(r => !r.deleted).length ],
    [ 'last_saved', last ? localTime(last) : '' ]
  ];
}

// The latest saves, across readers: what changed, and when.
function recent(all) {
  return all.flatMap(({ name, rows }) => rows.filter(r => !r.deleted).map(r => ({ name, r })))
    .sort((a, b) => (b.r.client_at || '').localeCompare(a.r.client_at || ''))
    .slice(0, 15)
    .map(({ name, r }) => {
      const d = r.data || {};
      const what = r.kind === 'record'
        ? [ d.status, d.quizScore != null ? 'quiz ' + d.quizScore + '%' : '', d.earnedPoints != null ? d.earnedPoints + ' pts' : '', d.homePoints ? d.homePoints + ' home pts' : '' ].filter(Boolean).join(', ')
        : r.kind === 'book' ? (d.title || '') : 'setting';
      return [ name, localTime(r.client_at), r.kind, r.id, what ];
    });
}

const cell = v => {
  const s = String(v === null || v === undefined ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = rows => rows.map(r => r.map(cell).join(',')).join('\n') + '\n';

function download(name, text) {
  const url = URL.createObjectURL(new Blob([ text ], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// How each row reads on screen (the CSV keeps the plain names).
const LABEL = {
  reader: 'Reader', book_records: 'Book records', finished_books: 'Finished books', quizzes_entered_in_app: 'Quizzes typed into Book Dude',
  quiz_points_entered_in_app: 'Quiz points typed into Book Dude', school_ar_total: 'School AR total', school_total_date: 'School total typed in on',
  school_starting_line: 'School starting line', book_dude_test_points: 'Book Dude test points', home_points: 'Home points',
  spelling_points: 'Spelling BB points', points_for_rewards: 'Points for rewards', screen_minutes_earned: 'Screen minutes earned',
  screen_minutes_given: 'Screen minutes cashed in', screen_minutes_waiting: 'Screen minutes waiting', piano_minutes_this_week: 'Piano minutes this week',
  books_she_added: 'Books she added', saved_items_in_account: 'Things saved in the account', last_saved: 'Last saved'
};

let last = null;   // the latest check: { summary: [[field, value...]...], recent: [...], at }

export const actions = {
  'acct-check': async () => {
    const a = account();
    const kids = (a && a.me && a.me.kids) || [];
    if (!a || a.role !== 'grownup' || !kids.length) { toast('Sign in as a grown-up with at least one reader first.'); return; }
    showBox('Account check', '<p>Reading the family account…</p>');
    const all = [];
    for (const k of kids) {
      const rows = await pullAll(k.id);
      if (!rows) { showBox('Account check', '<p class="error">Couldn’t reach the family account. Check the internet and try again.</p>'); return; }
      all.push({ name: k.name, rows });
    }
    const per = all.map(({ name, rows }) => summarize(name, rows));
    const summary = per[0].map((row, i) => [ row[0], ...per.map(p => p[i][1]) ]);
    last = { summary, recent: recent(all), at: new Date() };
    const num = v => (typeof v === 'number' ? fmtNum(v) : v === '' ? '<span class="hint">not yet</span>' : esc(v));
    showBox('Account check',
      '<p class="hint">Read just now from the family account itself, not this device’s copy. Points are worked out the same way as the Progress tab.</p>' +
      '<div class="check-scroll"><table class="check-table"><tbody>' +
        summary.map((row, i) => '<tr' + (i === 0 ? ' class="head"' : '') + '><th scope="row">' + esc(LABEL[row[0]] || row[0]) + '</th>' + row.slice(1).map(v => '<td>' + num(v) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' +
      '<h3 class="panel-sub">Latest saves</h3>' +
      (last.recent.length ? '<ul class="check-recent">' + last.recent.map(r => '<li><b>' + esc(r[1]) + '</b> ' + esc(r[0]) + ': ' + esc(r[2]) + ' ' + esc(r[3]) + (r[4] ? ' <span class="hint">(' + esc(r[4]) + ')</span>' : '') + '</li>').join('') + '</ul>' : '<p class="hint">Nothing saved yet.</p>') +
      '<div class="row-actions"><button type="button" class="btn small primary" data-act="acct-check-csv" data-which="summary">Download CSV</button>' +
        '<button type="button" class="btn small" data-act="acct-check-csv" data-which="recent">Latest saves CSV</button>' +
        '<button type="button" class="btn small" data-act="close-confirm">Close</button></div>');
  },
  'acct-check-csv': el => {
    if (!last) return;
    const day = localTime(last.at.toISOString()).replace(/[: ]/g, '-');
    if (el.dataset.which === 'recent') download('book-dude-latest-saves-' + day + '.csv', csv([ [ 'reader', 'saved_at', 'kind', 'id', 'what' ], ...last.recent ]));
    else download('book-dude-account-check-' + day + '.csv', csv(last.summary));
  }
};
