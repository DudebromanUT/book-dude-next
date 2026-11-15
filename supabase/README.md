# The Book Dude Next database (Supabase)

Book Dude Next keeps each family's reading records in a Supabase project (free plan). This folder holds everything that
defines it. Nothing here is secret: the project address and publishable key in `project.json` are the public ones the
website itself uses. The database password and the secret/service key are never needed by Book Dude and never go in
this repo, a chat or the app.

## Files

- `001_foundation.sql`: the tables, the rules for who can see and change what, and the functions the website calls.
  It explains itself in plain words at the top and beside each part.
- `project.json`: the project's public address and publishable key.

## Setting up (the owner, once)

1. **Sign-in settings.** In the Supabase dashboard: **Authentication**, **Sign In / Providers**.
   - Turn **on** "Allow anonymous sign-ins". A reader's device uses a nameless sign-in before she types her username
     and password; on its own it can see nothing.
   - Turn **off** "Confirm email". Grown-ups prove who they are with a one-time invite code, not an emailed link
     (Supabase's free email only delivers to the project's own team, and links open in Safari, not the Home Screen app).
   - Leave the **Email** provider on, and save.
2. **Run the script.** **SQL Editor**, new query, paste all of `001_foundation.sql`, **Run**. It should say "Success.
   No rows returned". It is safe to run again any time: it never deletes a family, a reader or anything saved.
3. **Check it from outside.** `node tests/live/supabase.cjs` tries the project the way a stranger with the public key
   would, and says what is wrong if anything is.
4. **The first grown-up.** In the SQL Editor run `select bookdude.owner_invite('Our family', true);` (change the name
   in quotes to your family's; `true` switches COBOL on for it). It shows a code like `K7WQ2-MX9PD`, good for 14 days
   and one use. In Book Dude Next go to **Farty Pants Central**, **Grown-up sign-in**, **I have an invite code**, and
   sign up with your email, a password and that code: you are an admin. Invite everyone else from the app (**Make an
   invite code**), and add your readers (**Add a reader**).

To try the whole thing on the real project without touching a real family: `select bookdude.owner_invite('Dude Next
try-out', false, false);` makes a code for a try-out family whose grown-up is not an admin, `INVITE=that-code node
tests/live/account.cjs` runs the app against the project with it, and `select bookdude.owner_remove_family('Dude Next
try-out');` removes that family and everything in it afterwards.

## How people get in

- **Grown-ups** sign up with an email, a password and a one-time invite code that an admin made. No code, no account:
  the database refuses the sign-up itself. An invite either joins an existing family or starts a new one.
- **Admins** are the people who run this Book Dude. Only they can make invite codes, and only in their own family can
  an invite make another admin.
- **Readers** (kids) have no email. A grown-up in their family gives them a username and a password. Five wrong
  passwords lock the username for 15 minutes, and the wait doubles with every five more (up to a day). A grown-up
  setting a new password clears the lock and signs her out everywhere.

## Who can see what

- Not signed in: the daily check-in (`ping`) and "is this invite code good?". No table can be read.
- A reader's device: that reader's items (book records, books she added, settings). Nothing of her siblings'.
- A grown-up: the items of the readers in their own family, and the family's readers and devices.
- An admin: also the list of families and grown-ups (names only), to invite and to reset a forgotten password.
- Nobody, from the website: passwords and invite codes. Only fingerprints are stored, in tables with no access at all.

`tests/db.test.cjs` proves these on a scratch Postgres (two families, grown-ups, readers, devices and a stranger), and
the **Checks** GitHub Action runs it on every push.

## When someone forgets a password

- A reader: a grown-up in her family sets a new one in the app.
- A grown-up: an admin resets them in the app and gives them the code that comes back. They sign up again with the
  same email and a new password, into the same family; nothing the family saved is touched.
- Every admin at once: run `select bookdude.owner_invite('Our family');` in the SQL Editor (with your family's exact
  name) for a new admin code. If the old email should be reused, first delete that user under **Authentication**,
  **Users**.

## Removing a family

`select bookdude.owner_remove_family('The family name');` in the SQL Editor removes a family and everything in it: its
grown-ups' sign-ins, its readers, their devices and everything they saved. There is no undo, and the website can't
call it.
