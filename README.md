# JUDGE Arena

A gamified practice ground for the **JUDGE Graduate Standard**: students judge AI-assisted reports, code and slides, fix what's weak, defend their work out loud, and practise the thinking AI can't do for them.

Five worlds unlock one after another, followed by a boss level that ends in a one-page **judgement record**.

| World | Levels | What it trains |
|---|---|---|
| 1 · Taste | Blind Taste Test, Pairwise Duel | Knowing what good looks like, whoever wrote it |
| 2 · Hunt | Hallucination Hunt, Claim Courtroom, Speaker-Notes Sweep | Verification: numbers vs outputs, citations, leakage, over-claiming |
| 3 · Craft | Number Diet, Jargon Jail, Ten-Second Slide | Fixing number-heavy slides and inflated, inconsistent prose |
| 4 · Defend | Why Not?, Viva Roulette | Explaining choices specifically, out loud, without notes |
| 5 · Beyond the Prompt | Think Before You Prompt, What the Model Couldn't Know, Off the Map, Constraint Cards | Own thinking, context, creativity |
| ★ Boss | Your Name Is On It | Everything at once, then the judgement record |

It's plain HTML, CSS and JavaScript. There's no build step and no framework, and it runs on GitHub Pages as-is.

---

## Run it on your computer

1. Open the folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.

Double-clicking `index.html` also works in most browsers.

**Instructor preview:** on the sign-in page, open *Instructor access* and enter the code from `js/config.js` (default `JUDGE-STAFF`; **change it before publishing**). This unlocks every world and opens the QR tools.

## Publish on GitHub Pages

1. Create a new **public** repository on GitHub, e.g. `judge-arena`.
2. Upload all of these files, keeping the folders. (In VS Code: *Source Control → Publish to GitHub*.)
3. On GitHub, go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then branch `main` and folder `/ (root)`. Save.
4. After a minute, your site is at `https://<your-username>.github.io/judge-arena/`.
5. Sign in as instructor on the live site and open **Instructor → Class QR code**. Pick the class, then save or screenshot the QR for your slides or the JUDGE website.

Each QR code points to `…/judge-arena/?class=CODE`, so students land with their class already filled in.

## Configure (`js/config.js`)

- `classes`: the class codes students can join, e.g. `AAI-WK9`, `MATHS-JAN`.
- `allowAnyClass`: set to `true` for drop-in sessions.
- `instructorCode`: **change this.**
- `judgeSiteUrl`: a link back to the JUDGE / DAIM site, shown in the footer.
- `supabase`: see below.

## Where progress is saved

**Default (no setup):** progress stays in each student's browser. Nothing is sent anywhere. Students continue on the same device with the same class code, nickname and PIN.

**With Supabase (optional):** students can continue on any device, the class gets a leaderboard, and you get a class progress dashboard.

1. Create a free project at supabase.com.
2. Open the **SQL editor**, paste `supabase/schema.sql`, and change `CHANGE-ME` to your own staff code. Run it.
3. In **Project Settings → API**, copy the Project URL and the anon / publishable key into `js/config.js`, then set `enabled: true`.
4. Publish again. The *Instructor* screen now has a **Class progress** table (it asks for the staff code).

Students never get email accounts. The table is closed to the browser, and all access goes through four database functions. A 4-digit PIN is fine for a classroom game but isn't strong security, so don't store anything sensitive.

**Ethics note:** if scores or judgement records will be used as research data, collect them under your approved ethics protocol. Keep nicknames non-identifying, and only use Supabase mode with participants who have consented.

## Change the examples

Each world's content lives in one file under `js/data/`:

```
js/data/w1-taste.js     World 1 — rating items and duels
js/data/w2-hunt.js      World 2 — hunts (planted flaws) and claim courtroom
js/data/w3-craft.js     World 3 — number diet slides, jargon paragraphs, flash slides
js/data/w4-defend.js    World 4 — why-not cases, viva question bank
js/data/w5-beyond.js    World 5 — think-first problems, context hunt, off-the-map themes, constraint cards
js/data/boss.js         Boss — a complete mini-project
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
js/config.js            classes, instructor code, Supabase switch
js/util.js              helpers (DOM, text measures, timers, storage)
js/render.js            draws reports, code, slides, charts
js/store.js             login, progress, unlocking, badges, evidence log
js/remote.js            optional Supabase sync
js/engines.js           the 12 level mechanics + boss + judgement record
js/app.js               screens: sign-in, map, worlds, results, badges, instructor
js/data/*.js            all the content
supabase/schema.sql     optional database
```
