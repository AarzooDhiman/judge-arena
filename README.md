# JUDGE Arena

A gamified practice ground for the **JUDGE Graduate Standard**: students judge AI-assisted reports, code and slides, fix what's weak, defend their work out loud, and practise the thinking AI can't do for them.

Five worlds unlock one after another, followed by a boss level that ends in a one-page **judgement record**.

| World | Levels | What it trains |
|---|---|---|
| 1 · Taste | Blind Taste Test, Pairwise Duel | Knowing what good looks like, whoever wrote it |
| 2 · Hunt | Hallucination Hunt, Claim Courtroom, Speaker-Notes Sweep | Verification: numbers vs outputs, citations, leakage, over-claiming |
| 3 · Craft | Number Diet, Jargon Jail, Ten-Second Slide | Fixing number-heavy slides and inflated, inconsistent prose |
| 4 · Defend | Why Not?, Examiner's Chair | Choosing project-specific reasons, and recognising strong and weak viva answers |
| 5 · Beyond the Prompt | Think Before You Prompt, What the Model Couldn't Know, Off the Map, Constraint Cards | Own thinking, context, creativity |
| ★ Boss | Your Name Is On It | Everything at once, then the judgement record |

It's plain HTML, CSS and JavaScript. There's no build step and no framework, and it runs on GitHub Pages as-is.

## What students see

- **A "How to play" card** before every level, with a description, the time it takes and how scoring works.
- **Project briefs.** Every project tag is a button that opens an "About this project" panel (goal, data, methods, results, audience).
- **A debrief at the end of each world:** the AI-overuse problem it tackled, what they practised, and how to keep improving.
- **Checkpoints.** Students can leave any level and carry on where they stopped, on the same device. Typed drafts are saved as they type.
- **Short feedback.** An optional star rating after each world, and a required set of questions after the boss.
- **A copy limit.** Copying is limited to encourage doing the work in the game. It can't stop screenshots or retyping; it's a nudge, not a lock.

---

## Run it on your computer

1. Open the folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.

Double-clicking `index.html` also works in most browsers.

If `supabase.enabled` is `true` in `js/config.js` but you haven't run the database script yet (see below), sign-in will fail. Set it to `false` to play on one device without a database.

**Instructor preview:** on the sign-in page, open *Instructor access* and enter the `instructorCode` from `js/config.js`. **Change it before publishing**, because the file is public. This unlocks every world and opens the QR and cohort tools.

## Publish on GitHub Pages

1. Create a new **public** repository on GitHub, e.g. `judge-arena`.
2. Upload all of these files, keeping the folders. (In VS Code: *Source Control → Publish to GitHub*.)
3. On GitHub, go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then branch `main` and folder `/ (root)`. Save.
4. After a minute, your site is at `https://<your-username>.github.io/judge-arena/`.
5. Sign in as instructor on the live site and open **Instructor → Class QR code**. Pick the trimester and academic year, then save or screenshot the QR for your slides or the JUDGE website.

Each QR code points to `…/judge-arena/?t=T1&y=25-26`, so students land with their trimester and year already filled in.

## How students sign in

There are no email accounts and no names.

- A **new player** chooses a trimester, an academic year and a 4-digit PIN. The game then gives them an anonymous **player code** such as `JA-7K3P`. They write it down.
- A **returning player** on another device chooses "Continue with my player code" and enters the code and PIN.
- On the same device, the game signs them in again automatically.
- An optional display name can be set at sign-up. It stays on the device and is never sent anywhere.

The trimester and year together form the **cohort**, such as `T1|25/26`. It groups the instructor dashboard.

## Configure (`js/config.js`)

- `trimesters` and `years`: the choices on the sign-in screen.
- `instructorCode`: **change this.**
- `copyAllowance`: copies allowed in each level before copying is blocked (default 2).
- `blockPasteInAnswers`: set to `true` to block pasting into answer boxes. Pastes are always counted, as a length and never as content.
- `judgeSiteUrl`: a link back to the JUDGE / DAIM site, shown in the footer.
- `supabase`: see below.

## Where progress is saved

**Default (no database):** progress stays in each student's browser. Nothing is sent anywhere. Set `supabase.enabled` to `false`.

**With Supabase (optional):** students can continue on any device, there is one leaderboard for everyone (the top 5 show on the front page and the top 10 on the map, using shortened player codes such as `JA-7K**`), and you get a dashboard, feedback summaries and research exports.

1. Create a free project at supabase.com. Choose a region that suits your data rules (London for the UK).
2. Open the **SQL editor**, paste all of `supabase/schema.sql`, and change `CHANGE-ME` to your own staff code. Run it. The script is safe to run again after an update, and it keeps your existing data.
3. In **Project Settings → API**, copy the Project URL and the publishable (anon) key into `js/config.js`, then set `enabled: true`. The anon key is meant to be public.
4. Publish again. The *Instructor* screen now has a **Cohort progress** table (it asks for the staff code), a **Feedback** summary, and **Export engagement data (CSV)**.

The database tables are closed to the browser. All access goes through database functions. A 4-digit PIN is fine for a classroom game but isn't strong security, so don't store anything sensitive.

### What is stored

| What | Where | Who can see it |
|---|---|---|
| Progress summary: which levels are done, best scores, badges, XP | `judge_players` | Instructor (needs the staff code) |
| Star ratings, comments and final-question answers | `judge_feedback` | Instructor, as averages and counts |
| Engagement events: worlds opened, levels reached, the score for each question, timings, visits, copy and paste counts | `judge_events` | Instructor export, **only for players who said yes** |

It never stores what students type, which answers they chose, or checkpoints. Free-text feedback goes to `judge_feedback` and nowhere else.

### Research consent

The first time a player signs in, a card asks whether their usage data may be included in research. They can still play fully if they say no, and they can change their mind from the Account screen. If they say no, or haven't answered, no events are recorded. Players who haven't agreed appear in the summary export with progress only.

Withdrawing consent stops new events and removes the player from exports. It does not delete events already stored. To delete one player's events, use the SQL line at the end of `supabase/schema.sql`.

### Deleting an account

On the Account screen a player can choose **Delete my account**. This removes their progress, feedback and usage events from the database and from their device, and withdraws consent. Only the player code stays, flagged with a `deleted_at` date in the `judge_players` table. That flag is visible in Supabase only: the instructor screen on the website doesn't list deleted players and its exports don't include them. A deleted code can't be signed in to again. The player can create a new code to start again.

### Research queries (Supabase only)

`supabase/research-queries.sql` has ready-made queries to paste into the Supabase SQL editor: worlds opened and completed per player, the score for each question, and the list of deleted codes. Results show in the editor and can be downloaded as CSV from there. They are not part of the website.
## Change the examples

Each world's content lives in one file under `js/data/`:

```
js/data/projects.js     the four project briefs shown in "About this project"
js/data/w1-taste.js     World 1: rating items and duels
js/data/w2-hunt.js      World 2: hallucination hunts and claim courtroom
js/data/w3-craft.js     World 3: number diet slides, jargon paragraphs, flash slides
js/data/w4-defend.js    World 4: why-not cases, examiner rounds
js/data/w5-beyond.js    World 5: think-first problems, context hunt, off-the-map themes, constraint cards
js/data/boss.js         Boss: a complete mini-project
js/data/feedback.js     the feedback and final-question wording
```

Edit the text and refresh. See `DEVELOPING.md` for step-by-step VS Code prompts.

## About the examples

All projects, people, data and numbers are **fictional**. "Human" examples were written to reflect typical student work. "AI" examples were written as typical AI output, some from careful prompts and some from lazy ones. Citations flagged as fabricated in the Hunt levels do not exist.

For the strongest classroom reveal, swap in a few genuine samples: your own writing, consented past work, or AI output you generate yourself.

The *Off the Map* frequencies are illustrative. `DEVELOPING.md` explains how to replace them with real counts from 30 AI runs.

## Folder structure

```
index.html              page shell + script order
css/style.css           all styling (light + dark)
js/config.js            cohorts, instructor code, copy limit, Supabase switch
js/util.js              helpers (DOM, text measures, timers, storage, CSV)
js/render.js            draws reports, code, slides, charts
js/store.js             sign-in, progress, unlocking, badges, checkpoints, feedback
js/remote.js            optional Supabase calls
js/telemetry.js         engagement events (only with Supabase and consent)
js/guard.js             copy limit and paste log
js/engines.js           the level mechanics + boss + judgement record
js/app.js               screens: sign-in, map, worlds, results, badges, instructor
js/data/*.js            all the content
supabase/schema.sql     optional database (run it once; safe to run again)
```
