/* The family account on the More tab: signing in (a reader, or a grown-up), a grown-up's family area (readers,
 * their passwords, invite codes), and signing out. cloud.js talks to the account; sync.js moves the books.
 *
 * Signing in or out, or a grown-up opening a different reader, starts the app again: each reader has her own books
 * on the device, and starting fresh is the simple way to never show one reader's under another's name. */

import { $, esc, plural } from './util.js';
import { db, leaveAccount } from './state.js';
import { confirmBox, toast, showBox, showConfirm } from './page.js';
import { account, activeKid, activeKidName, readerSignIn, grownupSignIn, grownupSignUp, signOut, openKid, createKid, setKidPassword, signOutKid, createInvite, refreshMe } from './cloud.js';
import { syncLine, syncNow } from './sync.js';
import { asGrownup } from './grownup.js';
import { renderMore } from './more.js';
import { CLOUD } from './config.js';

const WHY = {
  offline: 'Could not reach the family account. Check the internet connection and try again.',
  slow: 'Too many tries just now. Wait a minute and try again.',
  setup: 'The family account isn’t answering the way it should. Try again in a little while.',
  storage: 'This browser is not letting the app remember a sign-in (Private Browsing can do this).',
  denied: 'This sign-in isn’t allowed to do that.'
};
const USERNAME = /^[a-z0-9][a-z0-9_.-]{2,23}$/;

const field = (id, label, type, auto, extra) => '<label class="field"><span>' + label + '</span><input id="' + id + '" class="input" type="' + type +
  '" autocomplete="' + auto + '" ' + (extra || '') + '></label>';
const PLAIN = 'autocapitalize="none" autocorrect="off" spellcheck="false"';
const buttons = label => '<p class="error" id="acct-error" role="alert" hidden></p><div class="row-actions"><button type="submit" class="btn primary">' + label +
  '</button><button type="button" class="btn" data-act="close-confirm">Cancel</button></div>';
function box(title, form, inner, focus) {
  showBox(title, '<form class="stack" data-form="' + form + '" novalidate>' + inner + '</form>');
  const first = $('#' + focus, confirmBox);
  if (first) first.focus();
}
// One go at a time: the button waits while the account answers.
function busy(form, on) {
  form.dataset.busy = on ? '1' : '';
  const b = $('button[type="submit"]', form);
  if (b) b.disabled = on;
}
function fail(form, text) {
  const p = $('.error', form);
  p.textContent = text;
  p.hidden = false;
  busy(form, false);
}
const val = (form, id) => $('#' + id, form).value;
const kidOf = id => ((account() && account().me && account().me.kids) || []).find(k => k.id === id);

function lockedText(until) {
  const mins = Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 60000));
  const wait = mins >= 90 ? 'about ' + plural(Math.round(mins / 60), 'hour') : plural(mins, 'minute');
  return 'Too many wrong tries. Try again in ' + wait + ', or ask a grown-up to set a new password.';
}

export function accountPanelHtml() {
  const a = account();
  const head = '<section class="panel" id="account-panel"><h2>Family account</h2>';
  if (!a) {
    return head + '<p class="lead">This device isn’t signed in. Everything here is saved only on this device.</p>' +
      '<div class="row-actions"><button type="button" class="btn primary" data-act="acct-reader">Reader sign-in</button>' +
        '<button type="button" class="btn" data-act="acct-grownup">Grown-up sign-in</button></div>' +
      '<p class="hint">Signing in keeps a reader’s shelves, notes and points in their family’s account, so they are on every device the reader signs in on. ' +
        'A grown-up with an invite code starts here too.</p></section>';
  }
  const kid = activeKid(), name = activeKidName();
  const status = kid ? '<p class="hint" id="sync-status" role="status">' + esc(syncLine()) + '</p>' : '';
  if (a.role === 'reader') {
    return head + '<p class="lead">Signed in as <b>' + esc(name) + '</b>. ' + esc(name) + '’s books are saved on this device and in the family account.</p>' + status +
      '<div class="row-actions"><button type="button" class="btn small" data-act="acct-sync">Save now</button>' +
        '<button type="button" class="btn small" data-act="acct-signout">Sign out</button></div></section>';
  }
  const me = a.me || {};
  const kids = me.kids || [];
  const admin = !!(me.grownup && me.grownup.admin);
  return head + '<p class="lead">Signed in as <b>' + esc((me.grownup && me.grownup.name) || 'a grown-up') + '</b>, a grown-up in <b>' + esc((me.family && me.family.name) || 'your family') + '</b>. ' +
      (kid ? 'This device is showing <b>' + esc(name) + '</b>’s books.' : 'This device is showing its own books, which are not in the account.') + '</p>' + status +
    (admin && Number(me.schema) < CLOUD.schema ? '<p class="error">The account’s database needs its newest script (supabase/001_foundation.sql in the project).</p>' : '') +
    '<h3 class="panel-sub">Readers</h3>' +
    (kids.length ? '<ul class="reader-list">' + kids.map(k => '<li><span><b>' + esc(k.name) + '</b><br><span class="hint">Signs in as “' + esc(k.username) + '”' +
        (k.id === kid ? ' · on screen now' : '') + '</span></span><span class="row-actions">' +
        (k.id === kid ? '' : '<button type="button" class="btn small primary" data-act="acct-open" data-kid="' + esc(k.id) + '">Open</button>') +
        '<button type="button" class="btn small" data-act="acct-kid-password" data-kid="' + esc(k.id) + '">New password</button>' +
        '<button type="button" class="btn small" data-act="acct-kid-signout" data-kid="' + esc(k.id) + '">Sign out everywhere</button></span></li>').join('') + '</ul>'
      : '<p class="hint">No readers yet. Add one to give them a username and password to sign in with on their own device.</p>') +
    '<div class="row-actions"><button type="button" class="btn small primary" data-act="acct-add-kid">Add a reader</button>' +
      (admin ? '<button type="button" class="btn small" data-act="acct-invite">Make an invite code</button>' : '') + '</div>' +
    '<div class="row-actions">' + (kid ? '<button type="button" class="btn small" data-act="acct-sync">Save now</button>' +
        '<button type="button" class="btn small" data-act="acct-own">Show this device’s own books</button>' : '') +
      '<button type="button" class="btn small" data-act="acct-signout">Sign out</button></div></section>';
}

// After the account changed something a grown-up asked for: ask it who is who again, and redraw the panel.
async function refreshPanel() {
  await refreshMe();
  confirmBox.close();
  renderMore();
}

export const actions = {
  'acct-reader': () => box('Reader sign-in', 'acct-reader',
    field('acct-username', 'Username', 'text', 'username', PLAIN) + field('acct-password', 'Password', 'password', 'current-password') + buttons('Sign in') +
    '<p class="hint">A grown-up in your family sets your username and password.</p>', 'acct-username'),
  'acct-grownup': () => box('Grown-up sign-in', 'acct-grownup',
    field('acct-email', 'Email', 'email', 'username', PLAIN) + field('acct-password', 'Password', 'password', 'current-password') + buttons('Sign in') +
    '<div class="row-actions"><button type="button" class="btn ghost small" data-act="acct-signup">I have an invite code</button></div>', 'acct-email'),
  'acct-signup': () => box('Join with an invite code', 'acct-signup',
    field('acct-name', 'Your first name', 'text', 'given-name', 'maxlength="40"') + field('acct-email', 'Email', 'email', 'username', PLAIN) +
    field('acct-password', 'Pick a password (8 or more characters)', 'password', 'new-password') +
    field('acct-code', 'Invite code', 'text', 'off', 'autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="20"') + buttons('Create my account') +
    '<p class="hint">The code comes from whoever invited you. It works once.</p>', 'acct-name'),
  'acct-add-kid': () => box('Add a reader', 'acct-add-kid',
    field('acct-name', 'First name', 'text', 'off', 'maxlength="40"') +
    field('acct-username', 'Username (3 to 24 small letters or numbers)', 'text', 'off', PLAIN + ' maxlength="24"') +
    field('acct-password', 'Password (6 or more characters)', 'text', 'off', PLAIN + ' maxlength="72"') + buttons('Add') +
    '<p class="hint">The reader types this username and password on their own device, under Settings, Reader sign-in. Only the first name is shown to anyone.</p>', 'acct-name'),
  'acct-kid-password': el => {
    const k = kidOf(el.dataset.kid);
    if (!k) return;
    box('New password for ' + k.name, 'acct-kid-password',
      '<input type="hidden" id="acct-kid" value="' + esc(k.id) + '">' + field('acct-password', 'New password (6 or more characters)', 'text', 'off', PLAIN + ' maxlength="72"') + buttons('Save') +
      '<p class="hint">' + esc(k.name) + ' is signed out on every device and signs in again with the new password. Nothing saved is lost.</p>', 'acct-password');
  },
  'acct-kid-signout': el => {
    const k = kidOf(el.dataset.kid);
    if (!k) return;
    showConfirm('Sign ' + k.name + ' out everywhere?', '<p>Every device signed in as ' + esc(k.name) + ' is signed out, and its copy of ' + esc(k.name) + '’s books is removed the next time it is online. ' +
      'The books stay safe in the family account, and the password stays the same.</p><p class="hint">For a lost or borrowed device. To keep someone out for good, set a new password instead.</p>', 'Sign out everywhere', async () => {
      const r = await signOutKid(k.id);
      toast(r.ok ? k.name + ' is signed out everywhere.' : WHY[r.why] || WHY.setup);
    });
  },
  'acct-invite': () => box('Make an invite code', 'acct-invite',
    '<label class="field"><span>Who is it for?</span><select id="acct-who" class="input">' +
      '<option value="mine">Another grown-up in my family</option><option value="admin">Another grown-up in my family, who can invite people too</option>' +
      '<option value="new">A new family</option></select></label>' +
    field('acct-family', 'The new family’s name (only for a new family)', 'text', 'off', 'maxlength="60"') + buttons('Make a code') +
    '<p class="hint">A code works once, for 14 days. Whoever gets it opens Book Dude, goes to Settings, Grown-up sign-in, and taps “I have an invite code”.</p>', 'acct-who'),
  'acct-open': async el => {
    await syncNow();
    if (openKid(el.dataset.kid)) location.reload();
  },
  'acct-own': async () => {
    await syncNow();
    if (openKid('')) location.reload();
  },
  'acct-sync': async () => {
    await syncNow(true);
    toast(syncLine());
  },
  'acct-signout': () => {
    const a = account();
    if (!a) return;
    const ask = async () => {
      await syncNow();
      const left = activeKid() ? (await db.outbox()).length : 0;
      const name = activeKidName();
      showConfirm('Sign out?', '<p>' + (a.role === 'reader'
        ? esc(name) + '’s books stay safe in the family account. This device’s copy is removed, and the device goes back to its own books.'
        : 'The readers’ books stay safe in the family account. The copies on this device are removed, and the device goes back to its own books.') + '</p>' +
        (left ? '<p class="error">' + plural(left, 'change has', 'changes have') + ' not reached the account yet and would be lost. Connect to the internet and try again first.</p>' : ''),
      left ? 'Sign out anyway' : 'Sign out', async () => {
        await signOut();
        await leaveAccount('');
      });
    };
    // On a reader's device, signing out is a grown-up's job (she would need her password to get back in).
    if (a.role === 'reader') asGrownup(ask); else ask();
  },
  // The first look at a reader's books could not finish (no internet): try again, or give up and sign out.
  'acct-retry': () => location.reload(),
  'acct-giveup': async () => {
    await signOut();
    await leaveAccount('');
  }
};

export const submits = {
  'acct-reader': async form => {
    if (form.dataset.busy) return;
    const username = val(form, 'acct-username').trim(), password = val(form, 'acct-password');
    if (!username || !password) { fail(form, 'Type your username and your password.'); return; }
    busy(form, true);
    const r = await readerSignIn(username, password);
    if (r.ok) { location.reload(); return; }
    fail(form, r.why === 'no' ? 'That username or password isn’t right.' : r.why === 'locked' ? lockedText(r.until) : WHY[r.why] || WHY.setup);
  },
  'acct-grownup': async form => {
    if (form.dataset.busy) return;
    const email = val(form, 'acct-email').trim(), password = val(form, 'acct-password');
    if (!email || !password) { fail(form, 'Type your email and your password.'); return; }
    busy(form, true);
    const r = await grownupSignIn(email, password);
    if (r.ok) { location.reload(); return; }
    fail(form, r.why === 'no' ? 'That email or password isn’t right.'
      : r.why === 'nofamily' ? 'That account isn’t part of a family any more. Ask whoever invited you for a new invite code.' : WHY[r.why] || WHY.setup);
  },
  'acct-signup': async form => {
    if (form.dataset.busy) return;
    const name = val(form, 'acct-name').trim(), email = val(form, 'acct-email').trim(), password = val(form, 'acct-password'), code = val(form, 'acct-code').trim();
    if (!name) { fail(form, 'Type your first name.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { fail(form, 'That email address doesn’t look right.'); return; }
    if (password.length < 8) { fail(form, 'Pick a longer password: 8 or more characters.'); return; }
    if (!code) { fail(form, 'Type the invite code.'); return; }
    busy(form, true);
    const r = await grownupSignUp(name, email, password, code);
    if (r.ok) { location.reload(); return; }
    fail(form, {
      code: 'That invite code isn’t right, or it has been used or has run out. Ask for a new one.',
      exists: 'That email already has an account. Sign in instead, or ask whoever invited you to reset it.',
      weak: 'Pick a longer password: 8 or more characters.',
      email: 'That email address doesn’t look right.',
      nofamily: 'The account was made, but it didn’t join a family. Ask whoever invited you for a new code.'
    }[r.why] || WHY[r.why] || WHY.setup);
  },
  'acct-add-kid': async form => {
    if (form.dataset.busy) return;
    const name = val(form, 'acct-name').trim(), username = val(form, 'acct-username').trim().toLowerCase(), password = val(form, 'acct-password');
    if (!name) { fail(form, 'Type the reader’s first name.'); return; }
    if (!USERNAME.test(username)) { fail(form, 'A username is 3 to 24 small letters or numbers (dots, dashes and underscores are fine after the first).'); return; }
    if (password.length < 6) { fail(form, 'Pick a longer password: 6 or more characters.'); return; }
    busy(form, true);
    const r = await createKid(name, username, password);
    if (!r.ok) {
      fail(form, { taken: 'Someone already has that username. Try another.', full: 'This family has as many readers as it can hold.', name: 'Type the reader’s first name.',
        username: 'That username won’t work. Try small letters and numbers.', password: 'Pick a longer password: 6 or more characters.' }[r.why] || WHY[r.why] || WHY.setup);
      return;
    }
    await refreshPanel();
    toast(name + ' can now sign in with the username “' + username + '”.');
  },
  'acct-kid-password': async form => {
    if (form.dataset.busy) return;
    const k = kidOf(val(form, 'acct-kid')), password = val(form, 'acct-password');
    if (!k) return;
    if (password.length < 6) { fail(form, 'Pick a longer password: 6 or more characters.'); return; }
    busy(form, true);
    const r = await setKidPassword(k.id, password);
    if (!r.ok) { fail(form, r.why === 'password' ? 'Pick a longer password: 6 or more characters.' : WHY[r.why] || WHY.setup); return; }
    confirmBox.close();
    toast(k.name + ' has a new password and is signed out everywhere.');
  },
  'acct-invite': async form => {
    if (form.dataset.busy) return;
    const who = val(form, 'acct-who'), family = val(form, 'acct-family').trim();
    if (who === 'new' && !family) { fail(form, 'Type the new family’s name.'); return; }
    busy(form, true);
    const r = await createInvite(who === 'new' ? family : '', who === 'admin');
    if (!r.ok) { fail(form, r.why === 'many' ? 'There are a lot of unused invite codes already. Use those, or wait for them to run out.' : WHY[r.why] || WHY.setup); return; }
    showBox('Invite code', '<p class="invite-code" id="invite-code">' + esc(r.code) + '</p>' +
      '<p>' + (who === 'new' ? 'For a grown-up starting the family “' + esc(family) + '”.' : 'For another grown-up in your family' + (who === 'admin' ? ', who will be able to invite people too.' : '.')) + '</p>' +
      '<p class="hint">It works once, for 14 days, and it won’t be shown again: write it down or send it now. They open Book Dude, go to Settings, Grown-up sign-in, and tap “I have an invite code”.</p>' +
      '<div class="row-actions"><button type="button" class="btn primary" data-act="close-confirm">Done</button></div>');
  }
};
