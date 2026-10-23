# Project instructions for AI coding assistants

JUDGE Arena is a static, gamified teaching site (GitHub Pages). Read README.md first.

## Architecture rules
- Plain HTML/CSS/JS. No build step, no framework, no npm. Scripts are classic `<script>` tags loaded in the order listed in `index.html`, and everything hangs off the global `window.JUDGE`.
- The site must keep working when `index.html` is opened directly (file://). That means no ES modules and no `fetch()` of local JSON.
- Content lives only in `js/data/*.js`. Engines in `js/engines.js` must not contain project-specific text.
- New level types go in `js/engines.js` as `E.<type> = function (root, L, ctx) {...}`. They must call `ctx.finish({score, max, summary, lesson})` exactly once, and may call `ctx.award(badgeId)`, `ctx.bet(p, correct)` and `ctx.log(lines)`.
- Unlocking: a world opens when every level in the previous world has `done: true` (see `store.js`). Don't bypass this except through the instructor `unlockAll` flag.
- Styling uses the CSS custom properties at the top of `css/style.css`. Every colour must come from a token, and both light and dark themes must keep working.
- Use `el.hidden = true/false` to hide things, never `style.display`.
- Library versions are pinned: highlight.js 11.9.0, qrcodejs 1.0.0, supabase-js 2.45.4.

## Content rules
- All projects, people, data and citations are fictional. Keep them internally consistent: every number in a report or slide should match the notebook outputs, unless it is a deliberately planted flaw listed in that level's `flaws`.
- Every planted flaw needs a clear `why` that teaches the general principle.
- Real citations used as "correct" examples must be real and correctly attributed. Fabricated ones must be flagged as fabricated in the answer key.
- Model answers (`model`, `modelHeadline`, `expert`) must pass the level's own meters, e.g. the word target and banned-word list.
- Write in UK English and plain language. No emoji.

## Testing
- Open with VS Code Live Server. Sign in with *Instructor access* (code in `js/config.js`) to unlock everything.
- After editing content, play the edited level once start to finish and check the browser console has no errors.
