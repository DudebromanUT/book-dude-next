# Book Dude's Google script: school quizzes, the talking Dude and COBOL

Each time Maddy passes an AR quiz, Renaissance emails acgumpher@gmail.com. `Code.gs` is a Google script that lives in that
Gmail account. Once a day, at about 3 p.m. Utah time, it copies the new results out of those emails. Book Dude then
picks them up at a private link the next time it opens.

It only reads "Accelerated Reader Reading Practice Quiz" result emails from `autodelivery@renlearnrp.com` about
Madeleine, sent after October 18, 2026. Every other Renaissance email (vocabulary quizzes, Star tests, news) is skipped. It never sends,
changes or deletes email.

## Setup (about 10 minutes, on a computer)

1. Sign in to Google as **acgumpher@gmail.com** and go to [script.google.com](https://script.google.com). Click **New project**.
2. Click "Untitled project" at the top and name it **Book Dude school quizzes**.
3. Delete everything in the editor, paste in all of `Code.gs`, and click the save icon.
4. **Deploy → New deployment.** Click the gear next to "Select type" and choose **Web app**. Then set:
   - Description: Book Dude
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy**. Google asks you to authorize it. Pick the acgumpher account. When it says "Google hasn't verified
   this app", click **Advanced**, then **Go to Book Dude school quizzes (unsafe)**. It says that because you wrote the
   app yourself and didn't send it to Google for review. Then click **Allow**.
5. Copy the **Web app URL**. It ends in `/exec`.
6. Back in the editor, choose **setup** in the function menu next to Run, and click **Run**. It sets up the daily 3 p.m.
   run and collects any quiz emails already there. The log at the bottom prints the Book Dude link, or the code to add to
   the end of the Web app URL (`?key=…`).
7. On Maddy's iPad, open Book Dude → **Settings** → **Book money and screen time**. Unlock it if you've set a passcode. Paste
   the whole link into **School quiz link**. It checks right away.

## Turning on the talking Dude (Claude)

With a Claude API key, the same script also adds:

1. **A Dude joke for every new quiz.** It becomes the Dude's line on Explore, linked to the book.
2. **A weekly email to you**, Sunday at 9 a.m.: her quizzes, points, money and minutes waiting, books finished and
   being read, tests passed in Book Dude, two or three dinner-table questions for each book, what Claude cost that week,
   and her week with COBOL: a short summary, every flagged exchange in full, and the whole week's chat at the bottom.
3. **"What should I read next?"**, a button under the Dude's bubble. Book Dude sends only books right for her age that
   she hasn't read (no heads-up warnings, nothing marked for teens, near her level), and only those can come back.
4. **COBOL**, a chat with a kid-safe AI helper on its own tab in Book Dude, made to feel like a machine, not a
   person: an IBM 3270 mainframe terminal with retro beeps. It calls her "Human"; her name is never sent to Claude.
   Answers appear whole, with no "typing" bubble or pauses, and there is no voice and no pictures. Nothing rewards
   coming back or chatting longer: no streaks, no counters, no "come back tomorrow". The keys along the bottom work like
   a mainframe's: **PF1 LIBRARY** (knowledge articles and their tests), **PF3 EXIT** (back one step, toward the main
   menu) and **PF5 SOUND** (beeps on or off).
   - A line that never scrolls away says **"This is an AI. Mom and Dad can read these chats."**
   - A small yellow **Talk to a grown-up** button is always at the top, whatever COBOL is doing (even after hours, at
     the day's limit, or offline). It tells her to go talk to Mom or Dad right now, and **emails you right away** with
     the last few messages. Asking for help never depends on her typing the right words.
   - A soft timer suggests a break at 15, 30 and 45 minutes. It never blocks her.
   - The script checks the rules before Claude sees anything: open 7 a.m. to 8 p.m., 40 messages a day, 400 letters a
     message, and phone numbers, email addresses, street addresses and passwords never go to Claude.
   - **COBOL's instructions are yours**, in this script (`COBOL_PROMPT`; the same words are in `cobol-prompt.md` to read
     or edit): your prompt, with your choices. Questions about bodies and growing up go to you; anything serious points
     her to Mom and Dad (no phone numbers); anything kid-safe is fine to talk about. Two short sections fit it to Book
     Dude: plain text only, no pictures or voice, no spoilers, no AR quiz answers, and the yellow button. When COBOL
     thinks you should know about something (safety, online strangers, bullying, worrying feelings), it flags it and
     **you get an email right away**.
   - Every message and answer goes in a Google Sheet called **Book Dude chats** in this account, and the Sunday email
     has the week's summary, everything flagged, and the whole log.
   - You can switch it off in Book Dude (Settings, behind the passcode) or here (`CHAT` = `off`).

The Library's articles and tests don't need Claude. Passing a test earns its points once (2 for a short article, 4 for
a long one), counted like AR points. Each test ends with a think-about-it question: her answer earns 1 bonus point
once, and COBOL replies to it through this script (action `think`), with the same hours, private-details check, log
and alert email as the chat. After hours her answer is logged right away and COBOL replies the next time it is open.
The Sunday email shows each answer with COBOL's reply under **What she thought**.

**Book money emails.** When she puts enough points in the Book Money Jar for a payout (her "ask" for the money),
the script emails everyone in `DIGEST_TO` (the weekly email's list): "Add $10 to Maddy's Greenlight account", once per
payout, even if two devices both report it. It doesn't need Claude. To include Kristina, add her address to
`DIGEST_TO` with a comma between addresses (she then also gets the weekly email and COBOL's alerts).

### Setup (about 10 minutes, on a computer)

1. In the [Claude Console](https://platform.claude.com/), create an API key named **Book Dude**. While you're there, set
   a **monthly spend limit** (Settings, Limits). A chat message costs about 1½ cents, a set of picks about 5 cents, a
   joke under a cent, and the weekly email about 3 cents (a little more in a week with lots of chats, for the summary): about $6 a month with ten chats and one set of picks a day,
   and about $33 if she used every daily limit every day. A $15 limit covers normal use.
2. In the script editor, replace everything with the new `Code.gs` and click **save**.
3. Click the gear (**Project Settings**), scroll to **Script Properties**, click **Add script property**, and add
   `ANTHROPIC_API_KEY` with your key as the value. Save. **The key goes only here**: never in Book Dude, a text, an
   email or a chat. If it ever leaks, delete it in the Console and make a new one.
4. Optional, in the same place: `DIGEST_TO` with both your email addresses, separated by a comma, so you both get the
   weekly email and alerts. Blank means this account only.
5. **Deploy → Manage deployments → pencil → Version: New version → Deploy.** The link stays the same.
6. Choose **setup** in the function menu and click **Run**. Google asks for new permissions (to send email as you, to
   make the chat Sheet, and to reach Claude). Allow them the same way as before. The log says the Claude features are on.
7. On her iPad, open Book Dude. **What should I read next?** shows up under the Dude's bubble, and the chat on the
   **COBOL** tab opens (option 1 on its menu).
   To see the weekly email right away, run **sendWeeklyEmailNow** in the editor.

### Settings you can change (Script Properties)

| Property | Default | What it does |
| --- | --- | --- |
| `MODEL` | `claude-opus-5-5` | The Claude model. `claude-haiku-5-5` costs far less, if the bill matters more than the polish. |
| `CHAT` | `on` | `off` stops COBOL. |
| `CHAT_HOURS` | `7-20` | Hours she can chat, Utah time (7 a.m. to 8 p.m.). |
| `CHAT_LIMIT` | `40` | Messages to COBOL a day. |
| `PICKS_LIMIT` | `10` | "What should I read next?" asks a day. |
| `REPLY_LIMIT` | `2500` | The longest answer COBOL can give, in characters. A longer one ends at its last full sentence. |
| `DIGEST_TO` | this account | Who gets the weekly email and alerts. |
| `DIGEST_HOUR` | `9` | Sunday hour for the weekly email (run **setup** again after changing it). |

The Claude requests use Claude Opus 5.5 at low effort for jokes and COBOL and medium effort for picks and the weekly
email. If a request is declined for safety reasons, Claude retries it on the model Anthropic recommends (server-side
fallback); if it is still declined, COBOL gives a gentle answer that points her to Mom or Dad, and the Sheet notes it.

## Good to know

- **"Who has access: Anyone" is safe here.** The link answers only when it carries the secret key, and that key exists
  only in this Google account and on her iPad. Anyone who has the full link can see her quiz list (titles, scores,
  points). If the link gets out, change the key: in the script, go to **Project Settings → Script Properties**, delete
  `key`, run **setup** again, and paste the new link into Book Dude.
- **Timing:** the script checks Gmail once a day, some time between 3 and 4 p.m. Book Dude picks up new results when it
  opens after that. **Check for new quizzes now**, in the same settings, asks right away. That only finds quizzes the
  script has already collected. To collect sooner, run `collect` in the script editor.
- **No double counting:** each email is used once. If you already typed a book's points in by hand, those stay. If
  "Count her total from the school's AR report" is on, her points come from that total instead, so the email quizzes
  still land on her shelf but don't add points again.
- **If quizzes aren't coming in:** choose **checkEmails** in the function menu, click **Run**, and open the Execution log. It shows the newest Renaissance emails, whether each one reads as a quiz, and how many results are saved for Book Dude.
- **COBOL is a helper, not a guarantee.** The rules and alerts catch a lot, but read the chats now and then.
- **If you change the script later:** go to Deploy → Manage deployments → edit (pencil) → Version: New version →
  Deploy. The link stays the same.

## Spelling BB (optional)

Spelling BB is a game in Book Dude (Games tab). It works without this script; with it, BB uses Claude to
answer her questions about a word, give memory tricks, and understand messy spelling out loud, and every answer goes
into a "Spelling log" spreadsheet you can read.

1. In this Apps Script project, click **+** next to Files, choose **Script**, name it **Spelling**, and paste in all of
   `Spelling.gs` from this folder. (No HTML file, and no change to `doGet`: the page lives in Book Dude.)
2. Paste in the updated `Code.gs` too (its `doPost` hands spelling requests to `Spelling.gs`, behind the same key).
3. **Deploy → Manage deployments → pencil → Version: New version → Deploy.** The link stays the same.
4. Optional Script Properties: `SPELL_MODEL` (default `claude-haiku-5-5`) and `SPELL_DAILY_LIMIT` (most Claude calls a
   day, default 300). Run `spellLogUrl` in the editor for the Spelling log's link.


## Screen-time texts (optional)

Book Dude's screen-time clock works without this: cashing in starts it, and every phone signed in to the family
account shows the same countdown. With this, the script also texts both grown-ups when the clock starts, gets more
minutes, is paused, resumed or stopped, and when it runs out (even if nobody has Book Dude open). Each text says how
many minutes are still in her bank and ends with a **Fig-o-Clock** link: a live countdown where Fig the cat gets
sleepier as time runs out (it asks this script for the clock with a view-only code that shows nothing else). Texts go
through Twilio, which charges a little: a phone number for about $2 a month and a few cents a text (the link makes
each one two or three text segments).

1. Make a Twilio account at twilio.com, buy a **toll-free** number that can send SMS, and complete **Toll-Free
   Verification** for it (Console → Phone Numbers → Regulatory Compliance; it is free and takes a few days). Use case:
   personal notifications to your own family's phones; the messages include a link to your own countdown page. A
   sample: "Book Dude: Maddy's screen time started: 30 min, ends 4:35 PM. Bank: 45 min." Until it is verified, texts
   may not go out.
2. In this Apps Script project, click **+** next to Files, choose **Script**, name it **Timer**, and paste in all of
   `Timer.gs` from this folder. Paste in the updated `Code.gs` too (its `doPost` hands timer requests to `Timer.gs`).
3. **Project Settings → Script Properties**, add:
   - `TWILIO_SID`: the Account SID from the Twilio Console (starts with `AC`)
   - `TWILIO_TOKEN`: the Auth Token from the Twilio Console. A secret: it goes here and nowhere else.
   - `TWILIO_FROM`: your Twilio number, like `+18885551234`
   - `TEXT_TO`: both phones, with a comma between, like `+18015551234, +18015555678`
4. Pick `timerTextTest` in the editor's function menu and click **Run**. Both phones should get a test text; if not,
   the log says what Twilio answered.
5. **Deploy → Manage deployments → pencil → Version: New version → Deploy.** The link stays the same.

At most 40 texts a day are sent (each goes to every phone in `TEXT_TO`).

### Getting the texts to Maddy's iPad too (as iMessages, from one iPhone)

A Wi-Fi iPad can't get regular texts, so one grown-up's iPhone forwards them to her as iMessages. Set this up on
**one** iPhone only, or she gets every message twice.

1. Save your Twilio number as a contact named **Book Dude**.
2. **Shortcuts** app → **Automation** → **+** → **Message**.
3. **Sender**: Book Dude. **Message Contains**: `Book Dude`. Pick **Run Immediately**. **Next**.
4. **New Blank Automation** → **Add Action** → **Send Message**.
5. Tap **Message** and pick **Shortcut Input** (if it offers a choice, pick **Content**). Tap **Recipients** and pick
   Maddy (the email or number her iPad uses for iMessage). Tap the arrow on the action and turn off **Show When Run**.
6. **Done**. Run `timerTextTest` again: her iPad should get it as a blue iMessage, and tapping the link shows Fig.
