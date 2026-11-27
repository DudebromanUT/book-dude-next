const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../docs/core.js');
const books = [{ book_id: 'b1', title: 'One', author: 'A', year: '2020', ar_points: '10' }];

test('book money counts whole payouts from all-time points and never goes negative', () => {
  const r = { every: 100, perPoint: 1, paid: 0 };
  const zero = C.rewardStatus(0, r);
  assert.equal(zero.earned, 0); assert.equal(zero.owed, 0); assert.equal(zero.toGo, 100); assert.equal(zero.payout, 100);
  const s = C.rewardStatus(237.5, r);
  assert.equal(s.earned, 2); assert.equal(s.owed, 2); assert.equal(s.into, 37.5); assert.equal(s.toGo, 62.5);
  assert.equal(s.jarMoney, 37.5); assert.equal(s.owedMoney, 200); assert.equal(s.totalMoney, 237.5); assert.equal(s.money, true);
  assert.equal(C.rewardStatus(237.5, { ...r, perPoint: 0.5 }).owedMoney, 100);
  assert.equal(C.rewardStatus(237.5, { ...r, perPoint: 0 }).money, false);
  assert.equal(C.rewardStatus(100, r).earned, 1); assert.equal(C.rewardStatus(99.99, r).earned, 0);
  // A corrected (lower) quiz result after a prize was handed over never shows money owed back.
  assert.equal(C.rewardStatus(80, { ...r, paid: 1 }).owed, 0);
  assert.equal(C.rewardStatus(250, { ...r, paid: 1 }).owed, 1);
});

test('book-money settings fall back to sensible defaults', () => {
  const d = C.reward({});
  // $10 into her Greenlight account for every 10 points in the jar.
  assert.equal(d.on, true); assert.equal(d.every, 10); assert.equal(d.perPoint, 1); assert.equal(d.paid, 0);
  assert.match(d.where, /Greenlight account/); assert.match(d.prize, /Barnes & Noble/);
  assert.equal(C.reward({ perPoint: 0 }).perPoint, 0); assert.equal(C.reward({ perPoint: 'lots' }).perPoint, 1);
  const bad = C.reward({ every: 0, paid: -2, prize: '   ', on: 'yes' });
  assert.equal(bad.every, 10); assert.equal(bad.paid, 0); assert.match(bad.prize, /Barnes/); assert.equal(bad.on, false);
  assert.equal(C.reward({ every: '50', paid: '3' }).every, 50); assert.equal(C.reward({ every: 2.5 }).every, 10);
});

test('backups carry book-money settings, and the newer copy wins on restore', () => {
  const mine = C.reward({ every: 50, prize: 'A trip to the bookstore', paid: 2, updatedAt: '2026-10-01T00:00:00Z' });
  const file = JSON.parse(JSON.stringify(C.exportBackup({}, { goals: {}, reward: mine }, '2026-10-08T00:00:00Z', {})));
  const parsed = C.parseBackup(file, books);
  assert.deepEqual(parsed.reward, mine);
  const older = C.reward({ every: 100, paid: 0, updatedAt: '2026-09-01T00:00:00Z' });
  assert.equal(C.mergeBackup({}, {}, parsed, {}, older).reward.every, 50);
  const newer = C.reward({ every: 25, paid: 5, updatedAt: '2026-10-05T00:00:00Z' });
  const plan = C.mergeBackup({}, {}, parsed, {}, newer);
  assert.equal(plan.reward.every, 25); assert.equal(plan.rewardChanged, false);
  assert.equal(C.parseBackup({ app: 'reading-room', version: 1, records: {} }, books).reward, null);
  assert.throws(() => C.parseBackup({ app: 'reading-room', version: 1, records: {}, settings: { reward: 'lots' } }, books));
});

test('school points: once a grown-up types her school total, the points above the starting line count', () => {
  assert.equal(C.reward({}).school, null); assert.equal(C.reward({}).schoolStart, 0); assert.equal(C.reward({}).schoolDate, '');
  assert.equal(C.rewardPoints(12.5, {}), 12.5);
  assert.equal(C.rewardPoints(12.5, { school: 47.3, schoolStart: 40 }), 7.3);
  assert.equal(C.rewardPoints(12.5, { school: '47.3', schoolStart: '0' }), 47.3);
  // A starting line above the total never makes points negative, and junk falls back to the app's own points.
  assert.equal(C.rewardPoints(12.5, { school: 30, schoolStart: 40 }), 0);
  assert.equal(C.rewardPoints(12.5, { school: 'lots' }), 12.5);
  assert.equal(C.reward({ schoolDate: '2026-02-30' }).schoolDate, '');
});

test('school points: quizzes from the school emails since the last typed total count on top of it', () => {
  assert.deepEqual(C.reward({}).schoolNew, {});
  const cfg = { school: 52.5, schoolStart: 40, schoolNew: { q1: 2.5, q2: '1.5' } };
  assert.deepEqual(C.reward(cfg).schoolNew, { q1: 2.5, q2: 1.5 });
  assert.equal(C.rewardPoints(99, cfg, 1), 17.5);
  // Below the starting line, new quizzes help her get there; nothing goes negative.
  assert.equal(C.rewardPoints(0, { school: 38, schoolStart: 40, schoolNew: { q1: 4 } }), 2);
  // Without a school total they don't count twice: the app's own quiz results already have them.
  assert.equal(C.rewardPoints(9, { school: null, schoolNew: { q1: 4 } }), 9);
  // Junk is dropped.
  assert.deepEqual(C.reward({ schoolNew: { a: 'lots', b: -2, c: 3 } }).schoolNew, { c: 3 });
  assert.deepEqual(C.reward({ schoolNew: [4] }).schoolNew, {});
});

test('Book Dude\'s own tests: their points count for rewards (on top of a school total, too), but they aren\'t AR quizzes', () => {
  const records = {
    'hatchet--gary-paulsen': C.entry({ id: 'hatchet--gary-paulsen', status: 'finished', finishedDate: '2026-10-01', earnedPoints: 7, quizDate: '2026-10-01' }),
    'exam:cobol': C.entry({ id: 'exam:cobol', earnedPoints: 2, quizScore: 90, quizDate: '2026-10-23' })
  };
  assert.ok(C.safeId('exam:cobol'));
  assert.ok(C.isExam('exam:cobol'));
  assert.ok(!C.isExam('hatchet--gary-paulsen'));
  assert.equal(C.examPoints(records), 2);
  const m = C.metrics([], records, '');
  assert.equal(m.earned, 7);
  assert.equal(m.quizzes, 1);
  assert.equal(C.metrics([], records, '2026').months[9], 7);
  assert.equal(C.rewardPoints(m.earned, {}, C.examPoints(records)), 9);
  assert.equal(C.rewardPoints(m.earned, { school: 47.3, schoolStart: 40 }, 2), 9.3);
  assert.equal(C.rewardPoints(m.earned, { school: 30, schoolStart: 40 }, 2), 2);
  assert.equal(C.rewardPoints(0, {}, 'junk'), 0);
});

test('screen time: 60 minutes for each 10 points she spends on it, plus extras for books from the list finished since it started', () => {
  const list = [
    { book_id: 'bridge-to-terabithia--katherine-paterson', title: 'Bridge to Terabithia' },
    { book_id: 'hatchet--gary-paulsen', title: 'Hatchet' },
    { book_id: 'holes--louis-sachar', title: 'Holes' },
    { book_id: 'mine:abc', title: 'Dog Man', _custom: true }
  ];
  const done = (finishedDate, extra) => Object.assign(C.entry({ status: 'finished', finishedDate }), extra);
  const records = {
    'bridge-to-terabithia--katherine-paterson': done('2026-10-20'),
    'hatchet--gary-paulsen': done('2026-10-18'),
    'holes--louis-sachar': done('2026-10-01'), // finished before screen time started
    'mine:abc': done('2026-10-21'), // a book she added herself
    'not-in-the-catalog': done('2026-10-21'),
    'wonder--r-j-palacio': C.entry({ status: 'reading' })
  };
  const d = C.reward({});
  assert.equal(d.screen, true); assert.equal(d.minutes, 60); assert.equal(d.bonus, 30); assert.equal(d.given, 0); assert.equal(d.since, '');
  assert.deepEqual(d.special, { 'bridge-to-terabithia--katherine-paterson': 60 });
  const cfg = { since: '2026-10-17', toMinutes: 2 };
  const s = C.screenTime(27.5, records, list, cfg);
  assert.equal(s.fromPoints, 120); assert.equal(s.into, 7.5); assert.equal(s.toGo, 2.5);
  // Bridge to Terabithia earns its own 60 instead of the usual 30; newest first.
  assert.deepEqual(s.books.map(x => [x.id, x.minutes]), [['bridge-to-terabithia--katherine-paterson', 60], ['hatchet--gary-paulsen', 30]]);
  assert.equal(s.fromBooks, 90); assert.equal(s.earned, 210); assert.equal(s.owed, 210);
  assert.equal(C.screenTime(27.5, records, list, { ...cfg, given: 150 }).owed, 60);
  assert.equal(C.screenTime(27.5, records, list, { ...cfg, given: 500 }).owed, 0);
  // No start date yet: no book earns an extra, so books finished before screen time existed never count.
  assert.equal(C.screenTime(27.5, records, list, {}).fromBooks, 0);
  assert.equal(C.screenTime(9.99, {}, list, cfg).earned, 0);
  assert.equal(C.screenTime(10, {}, list, cfg).earned, 60);
  assert.equal(C.screenTime(10, {}, list, { ...cfg, minutes: 0 }).earned, 0);
  assert.equal(C.screenTime(0, records, list, { ...cfg, bonus: 0, special: {} }).fromBooks, 0);
});

test('screen-time settings fall back to sensible defaults', () => {
  const bad = C.reward({ minutes: -5, bonus: 2.5, given: 'some', since: 'yesterday', screen: 'yes', special: { 'ok-id': 45, 'bad id!': 10, 'also-ok': 'x' } });
  assert.equal(bad.minutes, 60); assert.equal(bad.bonus, 30); assert.equal(bad.given, 0); assert.equal(bad.since, ''); assert.equal(bad.screen, false);
  assert.deepEqual(bad.special, { 'ok-id': 45 });
  assert.deepEqual(C.reward({ special: 'none' }).special, { 'bridge-to-terabithia--katherine-paterson': 60 });
  assert.deepEqual(C.reward({ special: {} }).special, {});
  assert.equal(C.reward({ minutes: '0' }).minutes, 0);
});

test('backups carry school points and screen time', () => {
  const mine = C.reward({ school: 47.5, schoolStart: 40, schoolDate: '2026-10-17', minutes: 45, bonus: 20, toJar: 3, toMinutes: 2, given: 90, since: '2026-10-17', updatedAt: '2026-10-17T00:00:00Z' });
  const file = JSON.parse(JSON.stringify(C.exportBackup({}, { goals: {}, reward: mine }, '2026-10-18T00:00:00Z', {})));
  assert.deepEqual(C.parseBackup(file, books).reward, mine);
  // A backup from before screen time existed gets the defaults.
  const old = C.parseBackup({ app: 'reading-room', version: 1, records: {}, settings: { reward: { every: 100, paid: 1 } } }, books).reward;
  assert.equal(old.school, null); assert.equal(old.minutes, 60); assert.equal(old.given, 0); assert.equal(old.since, ''); assert.equal(old.toJar, 0);
});

test('the grown-up passcode is saved as a fingerprint, never as the four digits', () => {
  const h = C.codeHash('2468');
  assert.match(h, /^[0-9a-f]{8}$/);
  assert.equal(C.codeHash('2468'), h); assert.notEqual(C.codeHash('2469'), h); assert.notEqual(h, '2468');
  // Every 4-digit passcode gets its own fingerprint, so a wrong one never opens it.
  const all = new Set(); for (let i = 0; i < 10000; i++) all.add(C.codeHash(String(i).padStart(4, '0')));
  assert.equal(all.size, 10000);
  assert.equal(C.reward({}).code, ''); assert.equal(C.reward({ code: h }).code, h);
  assert.equal(C.reward({ code: '2468' }).code, ''); assert.equal(C.reward({ code: 12345678 }).code, '');
  assert.equal(C.reward({ codeReset: '2026-10-20' }).codeReset, '2026-10-20'); assert.equal(C.reward({ codeReset: 'today' }).codeReset, '');
  const mine = C.reward({ code: h, codeReset: '2026-10-20', updatedAt: '2026-10-20T00:00:00Z' });
  const file = JSON.parse(JSON.stringify(C.exportBackup({}, { goals: {}, reward: mine }, '2026-10-21T00:00:00Z', {})));
  assert.equal(C.parseBackup(file, books).reward.code, h);
  assert.equal(JSON.stringify(file).includes('2468'), false);
});

test('her choices: every 10 points goes into the jar or becomes screen time, mixed however she likes', () => {
  assert.equal(C.reward({}).toJar, 0); assert.equal(C.reward({}).toMinutes, 0); assert.equal(C.reward({ toJar: -1 }).toJar, 0);
  const none = C.choices(27.5, {});
  assert.deepEqual([none.batches, none.open, none.toJar, none.toMinutes, none.into, none.toGo, none.jarPoints], [2, 2, 0, 0, 7.5, 2.5, 0]);
  const mixed = C.choices(35, { toJar: 1, toMinutes: 1 });
  assert.deepEqual([mixed.open, mixed.jarPoints], [1, 10]);
  // The jar counts only the points she put in it.
  assert.equal(C.rewardStatus(mixed.jarPoints, { every: 100 }).jarMoney, 10);
  assert.equal(C.rewardStatus(mixed.jarPoints, {}).owedMoney, 10); // $10 payouts: it's waiting for a grown-up right away
  // Choices beyond her points (after a quiz result is corrected down) don't count until she earns them again.
  const over = C.choices(15, { toJar: 1, toMinutes: 2 });
  assert.deepEqual([over.toJar, over.toMinutes, over.open], [1, 0, 0]);
  // With only one of the two switched on, every point goes straight to it, as before.
  const jarOnly = C.choices(27.5, { screen: false });
  assert.deepEqual([jarOnly.open, jarOnly.jarPoints], [0, 27.5]);
  const minutesOnly = C.choices(27.5, { on: false });
  assert.deepEqual([minutesOnly.open, minutesOnly.toMinutes, minutesOnly.jarPoints], [0, 2, 0]);
  assert.equal(C.screenTime(27.5, {}, [], { on: false }).fromPoints, 120);
  assert.equal(C.screenTime(27.5, {}, [], {}).fromPoints, 0);
});

test('she can move tens between the jar and screen time until they are deposited or given', () => {
  // Out of the jar: anything not deposited yet, even a full jar waiting for a grown-up.
  assert.equal(C.choices(35, { toJar: 2, toMinutes: 1 }).jarToMove, 2);
  assert.equal(C.choices(100, { toJar: 10 }).jarToMove, 10);
  assert.equal(C.choices(120, { toJar: 12, every: 100, paid: 1 }).jarToMove, 2);
  assert.equal(C.choices(120, { toJar: 10, every: 100, paid: 1 }).jarToMove, 0);
  assert.equal(C.choices(120, { toJar: 3, paid: 2 }).jarToMove, 1); // $10 payouts: two of three already deposited
  // Back from screen time: only minutes she chose that haven't been given yet.
  assert.equal(C.screenTime(35, {}, [], { toJar: 2, toMinutes: 1 }).minutesToMove, 1);
  assert.equal(C.screenTime(35, {}, [], { toMinutes: 3, given: 60 }).minutesToMove, 2);
  assert.equal(C.screenTime(35, {}, [], { toMinutes: 3, given: 150 }).minutesToMove, 0);
  // With only one reward switched on, or no minutes per choice, there is nothing to move.
  assert.equal(C.choices(35, { toJar: 2, screen: false }).jarToMove, 0);
  assert.equal(C.screenTime(35, {}, [], { toMinutes: 3, on: false }).minutesToMove, 0);
  assert.equal(C.choices(35, { toJar: 2, minutes: 0 }).jarToMove, 0);
});

test('home points: a grown-up\'s points for a book with no AR quiz count on top of everything, and never as AR points', () => {
  const records = {
    'mine:lottie-1': C.entry({ id: 'mine:lottie-1', status: 'finished', finishedDate: '2026-11-01', homePoints: 4, homeDate: '2026-11-16' }),
    'mine:lottie-2': C.entry({ id: 'mine:lottie-2', status: 'finished', homePoints: '4' }),
    'hatchet--gary-paulsen': C.entry({ id: 'hatchet--gary-paulsen', status: 'finished', earnedPoints: 7, quizDate: '2026-10-01' }),
    'exam:topaz-mountain': C.entry({ id: 'exam:topaz-mountain', earnedPoints: 4, homePoints: 50 })
  };
  assert.equal(C.homePoints(records), 8, 'a test record never carries home points');
  assert.equal(records['mine:lottie-1'].homeDate, '2026-11-16');
  assert.equal(C.metrics([], records, '').earned, 7, 'not AR points');
  // On top of the app's own quiz results, or of a school total.
  assert.equal(C.rewardPoints(7, {}, C.examPoints(records) + C.homePoints(records)), 19);
  assert.equal(C.rewardPoints(7, { school: 52.5, schoolStart: 40 }, C.examPoints(records) + C.homePoints(records)), 24.5);
  // Checked like any number: over 99 or junk is no points.
  assert.equal(C.entry({ id: 'x', homePoints: 500 }).homePoints, null);
  assert.equal(C.entry({ id: 'x', homePoints: 'lots' }).homePoints, null);
  // A record with only home points is worth keeping, and a backup carries them.
  const only = C.entry({ id: 'mine:lottie-3', homePoints: 4 });
  assert.equal(C.isBlank(only), false);
  const parsed = C.parseBackup(JSON.stringify(C.exportBackup({ 'mine:lottie-3': only }, {}, '2026-11-16T00:00:00Z', {})), []);
  assert.equal(parsed.records['mine:lottie-3'].homePoints, 4);
  assert.throws(() => C.parseBackup(JSON.stringify({ app: 'reading-room', version: 1, records: { x: { homePoints: 'lots' } } }), []), /invalid homePoints/);
});

test('the points ledger: every AR quiz, test and home-points book, by school year starting August 1', () => {
  assert.equal(C.schoolYear('2026-11-15'), '2026-27');
  assert.equal(C.schoolYear('2026-08-01'), '2026-27');
  assert.equal(C.schoolYear('2026-07-31'), '2025-26');
  assert.equal(C.schoolYear('2099-12-31'), '2099-00');
  assert.equal(C.schoolYear(''), '');
  const records = {
    'hatchet--gary-paulsen': C.entry({ id: 'hatchet--gary-paulsen', status: 'finished', earnedPoints: 7, quizDate: '2026-10-01' }),
    'frindle--andrew-clements': C.entry({ id: 'frindle--andrew-clements', status: 'finished', earnedPoints: 0, quizDate: '2026-06-02' }),
    'holes--louis-sachar': C.entry({ id: 'holes--louis-sachar', status: 'finished', quizScore: 90 }),
    'mine:lottie-1': C.entry({ id: 'mine:lottie-1', status: 'finished', homePoints: 4, homeDate: '2026-11-16' }),
    'mine:both': C.entry({ id: 'mine:both', earnedPoints: 2, quizDate: '2026-09-01', homePoints: 1, homeDate: '2026-09-02' }),
    'exam:topaz-mountain': C.entry({ id: 'exam:topaz-mountain', earnedPoints: 4, quizScore: 100, quizDate: '2026-11-14' }),
    'exam:topaz-mountain:think': C.entry({ id: 'exam:topaz-mountain:think', earnedPoints: 1, quizDate: '2026-11-14' }),
    'mine:undated': C.entry({ id: 'mine:undated', earnedPoints: 3 })
  };
  assert.deepEqual(C.ledger(records).map(e => [e.kind, e.id, e.points, e.year]), [
    ['home', 'mine:lottie-1', 4, '2026-27'],
    ['test', 'exam:topaz-mountain', 4, '2026-27'],
    ['test', 'exam:topaz-mountain:think', 1, '2026-27'],
    ['ar', 'hatchet--gary-paulsen', 7, '2026-27'],
    ['home', 'mine:both', 1, '2026-27'],
    ['ar', 'mine:both', 2, '2026-27'],
    ['ar', 'frindle--andrew-clements', 0, '2025-26'],
    ['ar', 'mine:undated', 3, '']
  ], 'a history score with no points is not an entry; a 0 is');
});

test('AR points by quarter: kept apart from other points, with points the school reported that Book Dude has no quiz for', () => {
  const t = C.arTrack({});
  assert.deepEqual(t.quarters['2026-27'], ['2026-10-19', '2027-01-04', '2027-03-15']);
  assert.deepEqual(t.goal, { quarter: 62.5, year: 250 });
  assert.deepEqual(['2026-08-01', '2026-10-18', '2026-10-19', '2027-01-03', '2027-01-04', '2027-03-15', '2027-07-31', '2027-08-01', ''].map(d => C.quarterOf(d, t)), [1, 1, 2, 2, 3, 4, 4, 1, 0]);
  const records = {
    'hatchet--gary-paulsen': C.entry({ id: 'hatchet--gary-paulsen', earnedPoints: 7, quizDate: '2026-10-01' }),
    'frindle--andrew-clements': C.entry({ id: 'frindle--andrew-clements', earnedPoints: 4.7, quizDate: '2026-11-03' }),
    'old--book': C.entry({ id: 'old--book', earnedPoints: 9, quizDate: '2026-05-01' }),
    'mine:lottie': C.entry({ id: 'mine:lottie', homePoints: 4, homeDate: '2026-11-16' }),
    'exam:topaz-mountain': C.entry({ id: 'exam:topaz-mountain', earnedPoints: 4, quizDate: '2026-11-14' })
  };
  const track = { missed: { '2026-27': { 1: 61, 2: 40 } }, before: { year: '2026-27', points: 954.3 } };
  const r = C.arReport(records, track, '2026-27');
  assert.deepEqual(r.quarters.map(x => [x.q, x.counted, x.missed, x.ar, x.other]), [[1, 7, 61, 68, 0], [2, 4.7, 40, 44.7, 8], [3, 0, 0, 0, 0], [4, 0, 0, 0, 0]]);
  assert.deepEqual(r.starts, ['2026-08-01', '2026-10-19', '2027-01-04', '2027-03-15']);
  assert.equal(r.yearAr, 112.7);
  assert.equal(r.yearOther, 8, 'tests and home points are not AR');
  assert.equal(r.lifetime, 954.3 + 7 + 4.7 + 9 + 101, 'all time: earlier years, every quiz, every missed point');
  assert.equal(C.arReport(records, {}, '2026-27').lifetime, null, 'no all-time number until a grown-up gives the earlier years');
  // Junk is left out; quarter dates must be in order and in their school year.
  const bad = C.arTrack({ quarters: { '2027-28': ['2027-10-20', '2027-09-01', '2028-03-15'], '2028-29': ['2028-10-18', '2029-01-03', '2029-03-14'] },
    missed: { '2026-27': { 1: 'lots', 5: 3, 2: 12.345 }, nonsense: { 1: 3 } }, goal: { quarter: -1 }, before: { year: 'x', points: 3 } });
  assert.equal(bad.quarters['2027-28'], undefined);
  assert.deepEqual(bad.quarters['2028-29'], ['2028-10-18', '2029-01-03', '2029-03-14']);
  assert.deepEqual(bad.missed, { '2026-27': { 2: 12.35 } });
  assert.deepEqual(bad.goal, { quarter: 62.5, year: 250 });
  assert.equal(bad.before, null);
  assert.ok(C.SYNCED_SETTINGS.includes('arTrack'), 'it travels with her account');
});

test('piano practice: 90 minutes a week (Monday to Sunday) unlock cashing in; it earns no minutes itself', () => {
  assert.deepEqual(C.piano({ '2026-11-22': 3, '2026-11-21': 1, '2026-02-30': 2, 'soon': 1, '2026-11-20': 0, '2026-11-19': 1.5, '2026-11-18': 97 }), { '2026-11-22': 3, '2026-11-21': 1 });
  assert.equal(C.pianoMinutes({ '2026-11-22': 3, '2026-11-21': 1 }), 60);
  const p = { '2026-11-15': 4, '2026-11-16': 2, '2026-11-18': 2, '2026-11-22': 2 };
  const w = C.pianoWeek(p, '2026-11-22');
  assert.deepEqual([w.days[0], w.days[6], w.minutes, w.goal, w.met], ['2026-11-16', '2026-11-22', 90, 90, true], 'Sunday the 15th is last week');
  assert.deepEqual([C.pianoWeek(p, '2026-11-16').minutes, C.pianoWeek(p, '2026-11-16').met], [90, true], 'Monday is the same week');
  assert.deepEqual([C.pianoWeek(p, '2026-11-15').days[0], C.pianoWeek(p, '2026-11-15').minutes], ['2026-11-09', 60]);
  assert.equal(C.pianoWeek({}, 'nope').met, false);
  const cfg = { on: true, screen: true, minutes: 60, bonus: 0, toMinutes: 1 };
  assert.equal(C.screenTime(10, {}, [], cfg).earned, 60, 'piano adds no minutes');
  // Cash-in: Friday from 3 pm, Saturday, Sunday.
  assert.deepEqual([[5, 14], [5, 15], [6, 9], [0, 22], [1, 10], [4, 20]].map(([d, h]) => C.cashWindow(d, h)), [false, true, true, true, false, false]);
  assert.ok(C.SYNCED_SETTINGS.includes('piano'), 'it travels with her account');
});

test('spelling: gems pay by list, each word once; comebacks count twice; list and streak bonuses', () => {
  const earned = {};
  for (let i = 0; i < 10; i++) earned['one' + i] = { lv: 'one', d: '2026-11-2' + (i < 5 ? 0 : 1), cb: 0 };
  for (let i = 0; i < 4; i++) earned['three' + i] = { lv: 'three', d: '2026-11-22', cb: 1 };
  earned.bad = { lv: 'four', d: '2026-11-22' };
  const sp = { earned, streaks: { 10: '2026-11-21', 25: 'nope' } };
  const r = C.spellPoints(sp);
  assert.deepEqual(r.entries.map(e => [e.id, e.date, e.points]), [['One Bee gems', '2026-11-21', 1], ['10 in a row', '2026-11-21', 1]]);
  assert.equal(r.total, 2);
  assert.deepEqual([r.gems.one, r.gems.three, r.next.one, r.next.three], [10, 4, 10, 2], '4 comeback gems are 8 of the next 10');
  earned.three4 = { lv: 'three', d: '2026-11-23', cb: 0 }; earned.three5 = { lv: 'three', d: '2026-11-23', cb: 0 };
  assert.equal(C.spellPoints({ earned }).entries.find(e => e.id === 'Three Bee gems').points, 3, 'Three Bee pays 3 a ten');
  // Finishing a list.
  const all = {};
  for (let i = 0; i < 150; i++) all['two' + i] = { lv: 'two', d: '2026-12-01', cb: 0 };
  const f = C.spellPoints({ earned: all });
  assert.equal(f.total, 15 * 2 + 10);
  assert.ok(f.entries.some(e => e.id === 'Finished Two Bee' && e.points === 10));
  // Merging keeps every paid word (earliest copy) and the newer game state.
  const m = C.spellMerge({ t: 5, p: { cat: [1, 0, 0] }, earned: { dog: { lv: 'one', d: '2026-11-20' } }, streaks: { 10: '2026-11-25' } },
    { t: 9, p: { cat: [2, 1, 0] }, earned: { dog: { lv: 'one', d: '2026-11-19' }, cat: { lv: 'one', d: '2026-11-22' } }, streaks: { 10: '2026-11-24' } });
  assert.deepEqual([m.t, m.p.cat, m.earned.dog.d, Object.keys(m.earned).length, m.streaks[10]], [9, [2, 1, 0], '2026-11-19', 2, '2026-11-24']);
  // They show up in the ledger and as "other" points, never AR.
  const led = C.ledger({}, { earned });
  assert.ok(led.every(e => e.kind === 'spell' && e.year === '2026-27'));
  const rep = C.arReport({}, {}, '2026-27', { earned });
  assert.deepEqual([rep.yearAr, rep.yearOther], [0, 4]);
  assert.ok(C.SYNCED_SETTINGS.includes('spelling'));
});

test('the screen-time clock: cashing in starts it, grown-ups pause and stop it, and unused minutes go back', () => {
  const t0 = Date.parse('2026-11-27T22:00:00Z'), M = 60000;
  assert.equal(C.timer(null), null);
  assert.equal(C.timer({ id: 'BAD id', minutes: 5 }), null);
  assert.equal(C.timer({ id: 'abcd', minutes: 0 }), null);
  assert.equal(C.timerState(null, t0), 'none');
  let { timer: t } = C.timerDo(null, 'cash', t0, 30, 'abcd1234');
  assert.deepEqual([t.minutes, t.start, t.used, t.stopped], [30, t0, 0, false]);
  assert.equal(C.timerState(t, t0 + 10 * M), 'running');
  assert.equal(C.timerLeft(t, t0 + 10 * M), 20 * M);
  assert.equal(C.timerEnds(t), t0 + 30 * M);
  // Cashing in more while it runs adds to the same clock.
  t = C.timerDo(t, 'cash', t0 + 10 * M, 15, 'other111').timer;
  assert.deepEqual([t.id, t.minutes, C.timerLeft(t, t0 + 10 * M)], ['abcd1234', 45, 35 * M]);
  // Paused, it holds still; resumed, it counts from where it was.
  t = C.timerDo(t, 'pause', t0 + 20 * M).timer;
  assert.deepEqual([C.timerState(t, t0 + 50 * M), C.timerLeft(t, t0 + 50 * M), C.timerEnds(t)], ['paused', 25 * M, 0]);
  t = C.timerDo(t, 'resume', t0 + 50 * M).timer;
  assert.deepEqual([C.timerState(t, t0 + 55 * M), C.timerLeft(t, t0 + 55 * M), C.timerEnds(t)], ['running', 20 * M, t0 + 75 * M]);
  // Time runs out: 'up' for half an hour, then gone.
  assert.equal(C.timerState(t, t0 + 75 * M), 'up');
  assert.equal(C.timerState(t, t0 + 104 * M), 'up');
  assert.equal(C.timerState(t, t0 + 106 * M), 'none');
  // A run-out clock is over: the next cash-in starts a new one.
  const fresh = C.timerDo(t, 'cash', t0 + 80 * M, 15, 'newone11').timer;
  assert.deepEqual([fresh.id, fresh.minutes, fresh.start], ['newone11', 15, t0 + 80 * M]);
  // Stopping early gives back the whole minutes not used.
  const stop = C.timerDo(t, 'stop', t0 + 60 * M + 30000);
  assert.equal(stop.back, 14);
  assert.equal(C.timerState(stop.timer, t0 + 60 * M + 30000), 'none');
  assert.equal(C.timerDo(stop.timer, 'stop', t0 + 61 * M).back, 0, 'stopping twice gives nothing more');
  assert.deepEqual([C.clock(0), C.clock(59001), C.clock(25 * M), C.clock(65 * M + 5000)], ['0:00', '1:00', '25:00', '1:05:05']);
  assert.ok(C.SYNCED_SETTINGS.includes('timer'));
});

test('screen-time alert topics: two long, random-looking names, or nothing', () => {
  assert.equal(C.alerts(null), null);
  assert.equal(C.alerts({ grown: 'short', kid: '' }), null, 'too short to be private');
  assert.deepEqual(C.alerts({ grown: ' bookdude-0123abcd456789ef0123 ', kid: 'bookdude-kid-0123abcd456789ef0123' }),
    { grown: 'bookdude-0123abcd456789ef0123', kid: 'bookdude-kid-0123abcd456789ef0123' });
  assert.deepEqual(C.alerts({ grown: 'bookdude-0123abcd456789ef0123', kid: 'has spaces in it' }), { grown: 'bookdude-0123abcd456789ef0123', kid: '' });
  assert.equal(C.topicOk('ntfy.sh/bookdude-123456'), false, 'a name, not an address');
  assert.ok(C.SYNCED_SETTINGS.includes('alerts'));
});
