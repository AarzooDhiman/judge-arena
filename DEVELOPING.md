# Developing JUDGE Arena in VS Code

This is a working platform, not a starter kit. You only need to change things when testing shows what to improve. These steps get you set up, and the prompts below cover the changes you're most likely to want.

---

## Part 1 — Set up (about 20 minutes, once)

1. **Install the tools**
   - VS Code: code.visualstudio.com
   - Git: git-scm.com (on a Mac, run `git --version` in Terminal and it will offer to install)
   - A GitHub account
2. **Add VS Code extensions** (Extensions panel, `Ctrl/Cmd+Shift+X`)
   - *Live Server* (Ritwick Dey): live preview that reloads on save
   - An AI assistant you can chat with about the code, such as *Claude Code* or *GitHub Copilot Chat*. The `CLAUDE.md` file in this folder briefs any assistant on how the project works, so it doesn't break the rules (no build step, content only in `js/data`, and so on).
3. **Open the project.** Unzip `judge-arena.zip`, then use *File → Open Folder…* and choose the `judge-arena` folder.
4. **Preview it.** Right-click `index.html` → **Open with Live Server**. Sign in with *Instructor access* (code in `js/config.js`) to unlock every world.
5. **Change the instructor code** in `js/config.js` now, before you forget.
6. **Put it on GitHub.**
   - Open the Source Control panel (`Ctrl/Cmd+Shift+G`), click **Publish to GitHub**, and choose **public**.
   - On github.com, open the repo, then **Settings → Pages → Deploy from a branch → main / (root) → Save**.
   - Wait a minute, then open `https://<username>.github.io/judge-arena/`.
7. **Make the QR code** on the live site: *Instructor → Class QR code*. Save the image and put it on the JUDGE website or your week-9 slides.
8. **Every change after that:** edit, check in Live Server, then in Source Control type a short message, **Commit**, then **Sync Changes**. GitHub Pages updates within a minute or two.

## Part 2 — The testing loop

1. Play each world as a student, with timers on. Note anything confusing, too easy, or wrong.
2. Bring the notes back to this chat in this form, and I'll return updated data files: *"World 2, Hallucination Hunt: flaw r10 is too obvious; the jargon paragraph in World 3 is too long; add a slide about …"*
3. Or make the change yourself in VS Code with the prompts below.

**Pilot with 3–4 students before week 9.** Time how long each world takes them. The minute estimates in the data files are guesses.

---

## Part 3 — Prompts for your VS Code AI assistant

Copy a prompt and fill in the `[brackets]`. Each one is written to keep the assistant inside the project's rules.

### Getting oriented
```
Read CLAUDE.md and README.md, then give me a 10-line tour of how this app works:
how a level is defined in js/data, how an engine in js/engines.js plays it, and
how unlocking works in js/store.js. Don't change any files.
```

### Editing or adding content
```
In js/data/[w2-hunt.js], level [w2-l1], make flaw [r10] subtler: rewrite the
sentence so the over-claim is less obvious but still clearly unsupported by the
notebook output. Update its "why". Keep every other number consistent with the
notebook outputs. Show me the diff before saving.
```

```
Add a new item to the Blind Taste Test (js/data/w1-taste.js, level w1-l1):
a [report paragraph / code cell / slide] from the [ReAdmit / Humber Flood Watch /
Module Voice] project, origin "[ai / human / ai-assisted]", quality around
[2/5 or 4/5]. Include expert ratings for all three criteria, 2–3 pros and 2–4 cons.
Keep its numbers consistent with the other examples from that project.
```

```
Create a Maths version of the content for the January cohort. Copy each file in
js/data to js/data-maths/ and keep every level type, flaw type and scoring rule
the same. Replace the three case projects with Maths projects: [e.g. a
time-series forecast of energy demand, a Bayesian A/B test, a numerical PDE
solver]. Keep all numbers internally consistent. Then add a "maths" switch in
js/config.js that makes index.html load js/data-maths/ instead of js/data/.
```

### Making the Off the Map counts real
Do this in any AI chat tool, outside VS Code: run the same question **30 times**, each in a fresh chat with no history. Then:
```
Here are 30 AI answers to the same question: [paste]. Group the ideas into 8–10
themes and count how many of the 30 answers mention each theme (an answer can
count towards several). Return the result as a JavaScript "themes" array in
exactly the format used in js/data/w5-beyond.js, sorted by count, with "runs": 30.
```
Paste the result into `w5-beyond.js` and change `runsNote` to say the counts are real, which model you used, and the date.

### Turning on Supabase (shared progress, leaderboard, dashboard)
```
I've created a Supabase project and run supabase/schema.sql. My project URL is
[url] and my anon key is [key]. Update js/config.js to enable Supabase. Then
walk me through testing it: sign in as two students in two browsers, check the
leaderboard on the map, and load the class dashboard from the Instructor screen.
```

### Research data export (only once ethics approval is in place)
```
Add an "Export class data (CSV)" button to the Instructor screen, shown only when
Supabase is enabled. It should call a new SECURITY DEFINER function
judge_export(p_class, p_staff_code) — add it to supabase/schema.sql in the same
style as judge_class_progress — returning nickname, per-level best scores,
badges, and the judgement record fields. No other personal data. Download it as
a CSV file.
```

### New level types
```
Add a new level type "rubric" to js/engines.js: students mark a short student
report against a 4-criterion rubric (like the Applied AI module rubric:
[paste criteria]), then compare their marks with the examiner's and read the
examiner's feedback. Follow the same pattern as E.rate (sequence, reveal,
ctx.finish). Add one example level to World 1 in js/data/w1-taste.js with two
reports. Use only existing CSS classes where possible.
```

```
Add a "Prompt Autopsy" level to World 5: students see a lazy prompt and the
mediocre output it produced, then rewrite the prompt with the context that was
missing, then see a better output (pre-written). Score them on how many of the
missing context items they named. Follow the E.hunt pattern for scoring and
reuse the existing reveal styling.
```

### Look and feel
```
Change the colour tokens at the top of css/style.css to match [DAIM / University
of Hull] branding: primary [#hex], accent [#hex]. Update both the light and dark
token blocks, and keep contrast at WCAG AA. Don't change any other CSS.
```

```
Do an accessibility review: keyboard-only play-through of World 2 (the hunt
sheet must be usable without a mouse), screen-reader labels on the segmented
buttons, and colour contrast in dark mode. Fix what you find and list the changes.
```

### When something breaks
```
When I [describe what you did], the browser console shows: [paste the red error].
Find the cause in js/, explain it in one or two sentences, and fix it with the
smallest change. Then tell me how to check the fix.
```

---

## Part 4 — Running a session

- **Before:** check the QR code on your phone. Set `classes` in `js/config.js` to today's code.
- **Opening (5 min):** everyone scans and plays World 1 *together*. Show your screen, discuss the reveal, and ask who rated the AI paragraph higher than the human one.
- **Middle (35–45 min):** students work at their own pace through Worlds 2–3.
- **Pairs (15 min):** everyone stops for Viva Roulette in pairs, whichever world they reached. Project it from your instructor login (all worlds unlocked) and spin for the room, choosing *My own project* so each pair defends their own coursework.
- **Close (5 min):** students open *My record* and fill in the judgement record for their own coursework.
- Worlds 4–5 and the boss work well as homework before the next session.
