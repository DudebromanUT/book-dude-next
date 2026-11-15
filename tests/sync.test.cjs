/* Saving to a family account, the parts with no browser in them (docs/core.js): how a saved thing is written for the
 * account, how one read back is checked, and which copy wins when a device and the account disagree. */
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../docs/core.js');

test('a record, an added book and a setting each become one row; removing something leaves an empty marker', () => {
  const rec = C.entry({ id: 'hatchet--gary-paulsen', status: 'finished', note: 'Brian!', updatedAt: '2026-11-01T10:00:00.000Z' });
  assert.deepEqual(C.cloudRow('record', rec.id, rec, rec.updatedAt), { kind: 'record', id: rec.id, data: rec, client_at: '2026-11-01T10:00:00.000Z', deleted: false });
  assert.deepEqual(C.cloudRow('setting', 'pets', false, '2026-11-02T10:00:00Z'), { kind: 'setting', id: 'pets', data: { v: false }, client_at: '2026-11-02T10:00:00Z', deleted: false });
  assert.deepEqual(C.cloudRow('book', 'mine:abc', null, '2026-11-03T10:00:00Z'), { kind: 'book', id: 'mine:abc', data: {}, client_at: '2026-11-03T10:00:00Z', deleted: true });
  // A time that isn't one never breaks the save: it counts as the oldest possible.
  assert.equal(C.cloudRow('setting', 'pets', true, 'yesterday-ish').client_at, '1970-01-01T00:00:00.000Z');
});

test('a row read back from the account is checked like anything from outside', () => {
  const rec = C.entry({ id: 'hatchet--gary-paulsen', status: 'finished', rating: 5, updatedAt: '2026-11-01T10:00:00.000Z' });
  assert.deepEqual(C.cloudValue(C.cloudRow('record', rec.id, rec, rec.updatedAt)), { kind: 'record', id: rec.id, value: rec });
  // The row's own id is the one that counts, and junk inside is cleaned the usual way.
  const odd = C.cloudValue({ kind: 'record', id: 'frindle--andrew-clements', data: { id: 'something-else', status: 'eaten', rating: 99, note: 7 }, deleted: false });
  assert.deepEqual([odd.value.id, odd.value.status, odd.value.rating, odd.value.note], ['frindle--andrew-clements', '', null, '']);
  assert.deepEqual(C.cloudValue({ kind: 'record', id: 'mine:abc', data: {}, deleted: true }), { kind: 'record', id: 'mine:abc', value: null });
  const book = C.cloudValue({ kind: 'book', id: 'mine:abc', data: { title: '  The   Purple Pancake  ', author: 'Sam', photo: 'javascript:alert(1)' }, deleted: false });
  assert.deepEqual([book.value.id, book.value.title, book.value.photo], ['mine:abc', 'The Purple Pancake', undefined]);
  assert.deepEqual(C.cloudValue({ kind: 'setting', id: 'accent', data: { v: 'teal' }, deleted: false }), { kind: 'setting', id: 'accent', value: 'teal' });
  // Not Book Dude's: unknown kinds, unsafe ids, a book with no title, a book id on a catalog book, settings that stay on one device.
  for (const row of [null, 'x', { kind: 'score', id: 'a', data: {} }, { kind: 'record', id: '__proto__', data: {} }, { kind: 'record', id: 7, data: {} },
    { kind: 'book', id: 'mine:abc', data: { title: '' } }, { kind: 'book', id: 'hatchet--gary-paulsen', data: { title: 'Hatchet' } },
    { kind: 'setting', id: 'schoolLink', data: { v: 'https://script.google.com/macros/s/X/exec?key=abc' } }, { kind: 'setting', id: 'lastExportAt', data: { v: 'x' } },
    { kind: 'setting', id: 'accent', data: {} }, { kind: 'setting', id: 'accent', data: { v: 'teal' }, deleted: true }]) {
    assert.equal(C.cloudValue(row), null, JSON.stringify(row));
  }
  assert.ok(!C.SYNCED_SETTINGS.includes('schoolLink'), 'the school quiz link never leaves the device');
});

test('the account\'s copy wins unless this device has a change of its own, as new or newer, still waiting', () => {
  assert.equal(C.cloudWins('2026-11-05T10:00:00Z', undefined), true, 'nothing waiting here');
  assert.equal(C.cloudWins('2026-11-05T10:00:00Z', '2026-11-04T10:00:00Z'), true, 'the account is newer');
  assert.equal(C.cloudWins('2026-11-05T10:00:00Z', '2026-11-05T10:00:00Z'), false, 'the same change coming back');
  assert.equal(C.cloudWins('2026-11-05T10:00:00Z', '2026-11-06T10:00:00Z'), false, 'this device is newer: its copy goes up');
  assert.equal(C.cloudWins('not a time', '2026-11-06T10:00:00Z'), false);
});
