/* ==========================================================================
   App shell: screens, navigation, results, badges, instructor tools.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = J.util, S = J.store, C = J.ui, h = U.h;
  const app = document.getElementById("app");
  const ICON = {
    rate: "Rate", duel: "Duel", hunt: "Hunt", court: "Court", diet: "Cut", jargon: "Edit", flash: "Recall",
    whynot: "Argue", roulette: "Speak", thinkfirst: "Think", offmap: "Invent", constraints: "Create", boss: "Boss"
  };
  let current = null;

  /* ---------------- frame ---------------- */
  function frame(content, opts) {
    opts = opts || {};
    U.clear(app);
    if (S.state) app.appendChild(topbar());
    const main = h("main", { class: "screen" + (opts.wide ? " wide" : ""), id: "main", tabindex: "-1" }, content);
    app.appendChild(main);
    app.appendChild(footer());
    window.scrollTo(0, 0);
    try { main.focus({ preventScroll: true }); } catch (e) {}
    return main;
  }

  function topbar() {
    const st = S.state, badges = Object.keys(st.badges).length;
    return h("header", { class: "topbar" }, h("div", { class: "topbar-inner" },
      h("button", { class: "brand", type: "button", onClick: showMap, "aria-label": "Go to the world map" }, h("span", { class: "brand-mark" }, "J"), h("span", { class: "brand-name" }, J.config.appName)),
      h("nav", { class: "nav" },
        h("span", { class: "stat", title: "Experience points" }, h("b", null, S.totalXP()), " XP"),
        h("button", { type: "button", class: "stat btnlike", onClick: showBadges }, h("b", null, badges), " badge" + (badges === 1 ? "" : "s")),
        h("button", { type: "button", class: "navlink", onClick: showRecord }, "My record"),
        st.instructor ? h("button", { type: "button", class: "navlink", onClick: showInstructor }, "Instructor") : null,
        h("button", { type: "button", class: "navlink", onClick: showAbout }, "About"),
        h("button", { type: "button", class: "navlink who", onClick: showAccount, title: "Account" }, st.profile.nick))));
  }

  function footer() {
    return h("footer", { class: "foot" },
      h("span", null, "Part of the JUDGE framework — professional judgement in an AI-enabled world."),
      J.config.judgeSiteUrl ? h("a", { href: J.config.judgeSiteUrl, target: "_blank", rel: "noopener" }, "JUDGE website") : null,
      h("span", null, "All projects, people and data in these levels are fictional."));
  }

  function toast(text, sub) {
    const t = h("div", { class: "toast", role: "status" }, h("strong", null, text), sub ? h("span", null, sub) : null);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("out"), 3200);
    setTimeout(() => t.remove(), 3800);
  }

  /* ---------------- login ---------------- */
  function showLogin(msg) {
    const params = new URLSearchParams(location.search);
    const qClass = (params.get("class") || "").toUpperCase();
    const known = S.validClass(qClass);
    const cls = h("input", { id: "login-class", type: "text", autocomplete: "off", autocapitalize: "characters", value: qClass, placeholder: "e.g. AAI-WK9" });
    const nick = h("input", { id: "login-nick", type: "text", autocomplete: "nickname", maxlength: "20", placeholder: "Not your real name" });
    const pin = h("input", { id: "login-pin", type: "password", inputmode: "numeric", pattern: "[0-9]*", maxlength: "4", autocomplete: "off", placeholder: "4 digits" });
    const err = h("p", { class: "error", role: "alert" }, msg || "");
    const go = h("button", { type: "submit", class: "btn primary big" }, "Enter the arena");
    const form = h("form", { class: "login-form", novalidate: true },
      known ? h("div", { class: "class-chip" }, h("span", { class: "hint" }, "Joining"), h("strong", null, known.label), h("span", { class: "hint" }, known.code)) : C.field("Class code", cls, "From your QR code or your instructor"),
      C.field("Nickname", nick, "2–20 letters or numbers. Don't use your real name."),
      C.field("PIN", pin, "Pick 4 digits and remember them — they let you carry on later."),
      err, go,
      h("p", { class: "hint small" }, J.remote.enabled ? "Your progress is saved to your class, so you can continue on any device." : "Your progress is saved in this browser on this device."));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const c = known ? known.code : cls.value.trim().toUpperCase();
      const n = nick.value.trim(), p = pin.value.trim();
      if (!S.validClass(c)) { err.textContent = "That class code isn't recognised. Check the code with your instructor."; cls.focus(); return; }
      if (!/^[A-Za-z0-9_\- ]{2,20}$/.test(n)) { err.textContent = "Nicknames need 2–20 letters, numbers, spaces, - or _."; nick.focus(); return; }
      if (!/^\d{4}$/.test(p)) { err.textContent = "Your PIN must be exactly 4 digits."; pin.focus(); return; }
      go.disabled = true; go.textContent = "Entering…";
      const r = await S.login(c, n, p);
      go.disabled = false; go.textContent = "Enter the arena";
      if (!r.ok) { err.textContent = r.error; return; }
      if (window.history && history.replaceState && !U.framed) history.replaceState(null, "", location.pathname);
      showMap();
    });

    const staffCode = h("input", { id: "staff-code", type: "password", autocomplete: "off", placeholder: "Instructor code" });
    const staffErr = h("p", { class: "error", role: "alert" });
    const staff = h("details", { class: "staff" }, h("summary", null, "Instructor access"),
      h("form", { class: "staff-form", onSubmit: async (e) => {
        e.preventDefault();
        if (staffCode.value.trim() !== J.config.instructorCode) { staffErr.textContent = "That instructor code isn't right."; return; }
        const r = await loginInstructor();
        if (!r.ok) { staffErr.textContent = r.error; return; }
        showInstructor();
      } }, staffCode, h("button", { type: "submit", class: "btn ghost" }, "Open instructor tools"), staffErr));

    frame(h("div", { class: "login" },
      h("section", { class: "login-hero" },
        h("p", { class: "eyebrow" }, "JUDGE · Graduate Standard practice"),
        h("h1", { class: "display" }, "Judge the work.", h("br"), "Not the robot."),
        h("p", { class: "lede" }, "Five worlds of short, playable levels on reports, code and slides. Spot what's wrong, fix what's weak, defend it out loud — and find the ideas no AI would give you."),
        h("ol", { class: "world-strip" }, S.worlds().map((w) => h("li", { class: "w-" + w.colour }, h("span", null, w.num <= 5 ? w.num : "★"), " ", w.name)))),
      h("section", { class: "login-card" }, h("h2", null, "Join your class"), form, staff)));
    (known ? nick : cls).focus();
  }

  async function loginInstructor() {
    const nick = "Instructor";
    const cls = "STAFF";
    const prev = J.remote.enabled;
    J.remote.enabled = false; // instructor preview is local-only
    S.state = U.lsGet(S.key(cls, nick)) || S.blank(cls, nick, U.hash("staff"));
    J.remote.enabled = prev;
    S.state.instructor = true;
    S.state.unlockAll = true;
    U.lsSet("judge-arena:v1:session", { cls, nick });
    U.lsSet(S.key(cls, nick), S.state);
    return { ok: true };
  }

  /* ---------------- map ---------------- */
  function showMap() {
    current = null;
    const st = S.state, worlds = S.worlds();
    const done = worlds.filter((w) => S.worldDone(w)).length;
    const next = worlds.find((w) => S.worldUnlocked(w) && !S.worldDone(w));
    const hero = h("section", { class: "map-hero" },
      h("div", null,
        h("p", { class: "eyebrow" }, "Class " + st.profile.cls),
        h("h1", { class: "display" }, "Welcome, " + st.profile.nick),
        h("p", { class: "lede" }, next ? (done ? "World " + next.num + " is open. Keep going." : "Start with World 1. Each world unlocks the next.") : "Every world complete. Your judgement record is waiting.")),
      h("div", { class: "hero-stats" },
        h("div", null, h("b", null, done), h("span", null, "of " + worlds.length + " worlds")),
        h("div", null, h("b", null, S.totalXP()), h("span", null, "XP")),
        h("div", null, h("b", null, Object.keys(st.badges).length), h("span", null, "of " + Object.keys(J.BADGES).length + " badges"))));
    const path = h("ol", { class: "path" }, worlds.map((w) => {
      const unlocked = S.worldUnlocked(w), wd = S.worldDone(w);
      const levelsDone = w.levels.filter((l) => (S.levelState(l.id) || {}).done).length;
      const stars = S.worldStars(w), maxStars = w.levels.length * 3;
      const state = wd ? "done" : unlocked ? "open" : "locked";
      const card = h("li", { class: "world-card w-" + w.colour, dataset: { state } },
        h("div", { class: "world-num" }, w.num <= 5 ? w.num : "★"),
        h("div", { class: "world-body" },
          h("div", { class: "world-top" }, h("h2", null, w.name), h("span", { class: "world-tag" }, w.tagline)),
          h("p", null, unlocked ? w.intro : "Finish World " + (w.num - 1) + " to unlock."),
          h("div", { class: "world-meta" },
            h("span", null, levelsDone + "/" + w.levels.length + " levels"),
            h("span", { class: "stars", "aria-label": stars + " of " + maxStars + " stars" }, starRow(stars, maxStars)))),
        h("div", { class: "world-go" }, unlocked ? C.btn(wd ? "Replay" : levelsDone ? "Continue" : "Enter", () => showWorld(w), wd ? "ghost" : "primary") : h("span", { class: "lock", "aria-label": "Locked" }, lockIcon())));
      return card;
    }));
    const lb = h("section", { class: "leaderboard", hidden: true });
    frame([hero, path, lb]);
    if (J.remote.enabled && !st.instructor) {
      J.remote.leaderboard(st.profile.cls).then((rows) => {
        if (!rows.length) return;
        lb.hidden = false;
        lb.append(h("h2", null, "Class leaderboard"), h("ol", { class: "lb" }, rows.slice(0, 10).map((r) => h("li", { class: r.nickname.toLowerCase() === st.profile.nick.toLowerCase() ? "me" : "" }, h("span", null, r.nickname), h("b", null, r.xp + " XP")))));
      });
    }
  }
  function starRow(n, max) {
    const per = Math.max(1, Math.round(max / 3));
    const filled = Math.round((n / max) * 3);
    return [0, 1, 2].map((i) => h("span", { class: "star" + (i < filled ? " on" : "") }, "★"));
  }
  function lockIcon() {
    const s = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    return h("span", { html: s });
  }

  /* ---------------- world ---------------- */
  function showWorld(w) {
    current = null;
    if (!S.worldUnlocked(w)) return showMap();
    const list = h("ol", { class: "levels" }, w.levels.map((l, i) => {
      const ls = S.levelState(l.id);
      return h("li", { class: "level-card", dataset: { done: ls && ls.done ? "1" : "" } },
        h("div", { class: "level-kind" }, h("span", null, ICON[l.type] || l.type)),
        h("div", { class: "level-body" },
          h("h3", null, l.title),
          h("p", null, l.blurb),
          h("div", { class: "level-meta" }, h("span", null, "About " + l.minutes + " min"), ls ? h("span", null, "Best " + ls.best + "/" + ls.max) : null, ls ? h("span", { class: "stars" }, [0, 1, 2].map((k) => h("span", { class: "star" + (k < ls.stars ? " on" : "") }, "★"))) : null)),
        h("div", { class: "level-go" }, C.btn(ls ? "Play again" : "Play", () => playLevel(w, l), ls ? "ghost" : "primary")));
    }));
    const wd = S.worldDone(w);
    const ws = S.worlds(), nextW = ws[ws.indexOf(w) + 1];
    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("section", { class: "world-hero w-" + w.colour },
        h("p", { class: "eyebrow" }, w.num <= 5 ? "World " + w.num : "Final level"),
        h("h1", { class: "display" }, w.name),
        h("p", { class: "lede" }, w.intro)),
      list,
      wd && nextW ? h("div", { class: "unlock-note" }, h("p", null, "World complete. ", h("strong", null, nextW.name), " is unlocked."), C.btn("Go to " + nextW.name, () => showWorld(nextW))) : null
    ]);
  }

  /* ---------------- level ---------------- */
  function playLevel(w, L) {
    const root = h("div", { class: "level-root" });
    const earned = [];
    current = L.id;
    frame([
      h("div", { class: "level-head" },
        h("button", { type: "button", class: "back", onClick: () => showWorld(w) }, "← " + w.name),
        h("div", { class: "level-title" }, h("span", { class: "eyebrow w-" + w.colour }, (w.num <= 5 ? "World " + w.num : "Final") + " · " + (ICON[L.type] || "")), h("h1", null, L.title))),
      root
    ], { wide: true });
    const ctx = {
      levelId: L.id,
      timers: S.state.settings.timers !== false,
      award(id) { if (S.award(id)) { earned.push(id); toast("Badge earned: " + J.BADGES[id].name, J.BADGES[id].desc); } },
      bet(p, c) { if (S.bet(p, c)) { earned.push("calibrated"); toast("Badge earned: Calibrated", J.BADGES.calibrated.desc); } },
      log(lines, key) { S.log(key || L.id, lines); },
      finish(res) {
        const r = S.recordResult(L.id, res.score, res.max);
        showResults(w, L, res, r, earned);
      }
    };
    try { J.engines[L.type](root, L, ctx); }
    catch (e) { console.error(e); root.append(h("p", { class: "error" }, "This level hit a problem: " + e.message)); }
  }

  function showResults(w, L, res, r, earned) {
    current = null;
    const ws = S.worlds();
    const idx = w.levels.indexOf(L);
    const nextL = w.levels[idx + 1];
    const wd = S.worldDone(w);
    const nextW = ws[ws.indexOf(w) + 1];
    const actions = [];
    if (nextL) actions.push(C.btn("Next: " + nextL.title, () => playLevel(w, nextL)));
    else if (wd && nextW) actions.push(C.btn("Unlocked: " + nextW.name + " →", () => showWorld(nextW)));
    else if (wd && !nextW) actions.push(C.btn("Open my judgement record", showRecord));
    actions.push(C.btn("Back to " + w.name, () => showWorld(w), "ghost"));
    actions.push(C.btn("Play again", () => playLevel(w, L), "ghost"));
    frame(h("section", { class: "results w-" + w.colour },
      h("p", { class: "eyebrow" }, L.title + " complete"),
      h("div", { class: "big-score" }, h("b", null, res.score), h("span", null, " / " + res.max)),
      h("div", { class: "stars big", "aria-label": r.stars + " stars" }, [0, 1, 2].map((k) => h("span", { class: "star" + (k < r.stars ? " on" : "") }, "★"))),
      r.improved && !r.first ? h("p", { class: "hint" }, "New personal best.") : null,
      earned.length ? h("div", { class: "earned" }, earned.map((id) => badgeEl(id, true))) : null,
      res.summary && res.summary.length ? C.list(res.summary, "list summary") : null,
      C.lesson(res.lesson),
      !nextL && wd && nextW ? h("p", { class: "unlock-flash" }, "World " + nextW.num + " unlocked: " + nextW.name) : null,
      h("div", { class: "row-center" }, actions)));
  }

  /* ---------------- badges / record / about / account ---------------- */
  function badgeEl(id, on) {
    const b = J.BADGES[id];
    return h("div", { class: "badge" + (on ? " on" : "") }, h("span", { class: "badge-mark", "aria-hidden": "true" }, b.mark), h("div", null, h("strong", null, b.name), h("p", null, b.desc)));
  }
  function showBadges() {
    current = null;
    const st = S.state, cal = S.calibration();
    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("h1", { class: "display" }, "Badges"),
      h("div", { class: "badges" }, Object.keys(J.BADGES).map((id) => badgeEl(id, !!st.badges[id]))),
      cal ? h("section", { class: "calib" }, h("h2", null, "Your calibration"),
        h("p", null, "When you bet, how often were you right?"),
        h("div", { class: "table-wrap" }, h("table", { class: "mini" }, h("thead", null, h("tr", null, h("th", null, "When you said"), h("th", null, "Bets"), h("th", null, "Right"), h("th", null, "Well calibrated would be"))),
          h("tbody", null, [["Unsure", 0.5], ["Fairly sure", 0.7], ["Certain", 0.9]].map(([lab, p]) => {
            const g = cal.groups[p];
            return h("tr", null, h("td", null, lab), h("td", { class: "num" }, g[1]), h("td", { class: "num" }, g[1] ? U.pct(g[0], g[1]) + "%" : "—"), h("td", { class: "num" }, Math.round(p * 100) + "%"));
          })))),
        h("p", { class: "hint" }, "Brier score " + cal.brier.toFixed(2) + " over " + cal.n + " bets (0 is perfect; 0.20 or lower earns the badge).")) : null
    ]);
  }

  function showRecord() {
    current = null;
    const root = h("div");
    frame([h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"), h("h1", { class: "display" }, "My judgement record"), root], { wide: true });
    J.recordForm(root, {});
  }

  function showAbout() {
    current = null;
    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("article", { class: "about" },
        h("h1", { class: "display" }, "About JUDGE Arena"),
        h("p", { class: "lede" }, "A practice ground for the JUDGE Graduate Standard: using AI in your work while keeping your own judgement in charge."),
        h("h2", null, "How it works"),
        C.list([
          "Five worlds, each unlocking the next: Taste (what good looks like), Hunt (verify), Craft (fix), Defend (explain out loud), Beyond the Prompt (think where AI can't). Then a boss level.",
          "You score for judging quality, finding real problems and explaining specifically. Guessing whether something was written by AI is worth a little — because it matters much less than whether the work is any good.",
          "Some levels ask you to bet on your confidence. Being honest about what you don't know is part of the skill.",
          "Everything you do feeds a one-page judgement record you can use for your own coursework."
        ]),
        h("h2", null, "About the examples"),
        h("p", null, "Every project, person, dataset and number here is fictional and was written for teaching. Examples labelled “Human” were written to reflect typical student work; examples labelled “AI” were written as typical AI output, some from careful prompts and some from lazy ones; “AI-assisted” means a student draft polished by AI. Fictional citations are flagged as fabricated in the levels where they appear — don't cite them."),
        h("h2", null, "Your data"),
        h("p", null, J.remote.enabled ? "Your nickname, progress and judgement record are saved to your class's database so your instructor can see class progress. Use a nickname, not your real name." : "Your nickname, progress and judgement record stay in this browser on this device. Nothing is sent anywhere."),
        h("h2", null, "Settings"),
        timerToggle())
    ]);
  }
  function timerToggle() {
    const box = h("input", { type: "checkbox", id: "set-timers" });
    box.checked = S.state.settings.timers !== false;
    box.addEventListener("change", () => { S.state.settings.timers = box.checked; S.save(); toast(box.checked ? "Timers on" : "Timers off", box.checked ? "" : "Timed levels give you more time and no countdown."); });
    return h("label", { class: "check" }, box, " Show countdown timers (turn off if you need more time)");
  }

  function showAccount() {
    current = null;
    const st = S.state;
    const confirmBox = h("div", { class: "confirm", hidden: true },
      h("p", null, "Erase all JUDGE Arena progress stored in this browser? This can't be undone."),
      h("div", { class: "row-end" }, C.btn("Cancel", () => (confirmBox.hidden = true), "ghost"), C.btn("Erase", () => { S.resetDevice(); showLogin("Progress on this device was erased."); }, "danger")));
    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("h1", { class: "display" }, st.profile.nick),
      h("p", { class: "lede" }, "Class " + st.profile.cls + (st.instructor ? " · instructor preview" : "")),
      h("div", { class: "row-start" },
        C.btn("Sign out", () => { S.logout(); showLogin(); }, "ghost"),
        C.btn("Erase progress on this device", () => (confirmBox.hidden = false), "ghost")),
      confirmBox,
      h("p", { class: "hint" }, "To continue later, sign in with the same class code, nickname and PIN" + (J.remote.enabled ? " — on any device." : " on this device."))
    ]);
  }

  /* ---------------- instructor ---------------- */
  function classUrl(code) {
    const base = location.href.split("#")[0].split("?")[0];
    return base + "?class=" + encodeURIComponent(code);
  }
  function showInstructor() {
    current = null;
    const st = S.state;
    if (!st || !st.instructor) return showMap();
    const sel = h("select", { id: "qr-class" }, J.config.classes.map((c) => h("option", { value: c.code }, c.label + " (" + c.code + ")")));
    const custom = h("input", { id: "qr-custom", type: "text", placeholder: "Or type any code (needs allowAnyClass)" });
    const qrBox = h("div", { class: "qr-box" });
    const linkTxt = h("input", { id: "qr-link", type: "text", readonly: true });
    const copyStatus = h("span", { class: "hint", role: "status" });
    function drawQR() {
      const code = (custom.value.trim() || sel.value).toUpperCase();
      const url = classUrl(code);
      linkTxt.value = url;
      U.clear(qrBox);
      if (window.QRCode) {
        const holder = h("div", { class: "qr" });
        qrBox.appendChild(holder);
        new window.QRCode(holder, { text: url, width: 220, height: 220, colorDark: "#0e1726", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
        qrBox.appendChild(h("p", { class: "hint" }, "Right-click (or long-press) the code to save it, or screenshot it for your slides."));
      } else {
        qrBox.appendChild(h("p", { class: "hint" }, "The QR library didn't load (offline?). Use the link instead, or any QR generator."));
      }
      if (U.framed) qrBox.appendChild(h("p", { class: "warn-text" }, "You're previewing inside Claude. This link points at the preview; publish to GitHub Pages and generate the QR there for students."));
    }
    sel.addEventListener("change", drawQR);
    custom.addEventListener("input", drawQR);

    const dash = h("section", { class: "dash" });
    if (J.remote.enabled) {
      const dc = h("input", { id: "dash-class", type: "text", placeholder: "Class code", value: J.config.classes[0] ? J.config.classes[0].code : "" });
      const sc = h("input", { id: "dash-staff", type: "password", placeholder: "Staff code (set in schema.sql)" });
      const out = h("div");
      dash.append(h("h2", null, "Class progress"), h("div", { class: "control-row" }, C.field("Class", dc), C.field("Staff code", sc), C.btn("Load", async () => {
        U.clear(out);
        out.append(h("p", { class: "hint" }, "Loading…"));
        const r = await J.remote.classProgress(dc.value.trim(), sc.value);
        U.clear(out);
        if (!r.ok) { out.append(h("p", { class: "error" }, r.error)); return; }
        const total = S.worlds().reduce((s, w) => s + w.levels.length, 0);
        out.append(h("p", null, r.rows.length + " players"), h("div", { class: "table-wrap" }, h("table", { class: "mini" },
          h("thead", null, h("tr", null, h("th", null, "Nickname"), h("th", null, "XP"), h("th", null, "Levels"), h("th", null, "Badges"), h("th", null, "Last active"))),
          h("tbody", null, r.rows.map((x) => h("tr", null, h("td", null, x.nickname), h("td", { class: "num" }, x.xp), h("td", { class: "num" }, x.levels_done + "/" + total), h("td", { class: "num" }, x.badges), h("td", null, new Date(x.updated_at).toLocaleString("en-GB"))))))));
      })), out);
    } else {
      dash.append(h("h2", null, "Class progress"), h("p", null, "Turn on Supabase in js/config.js to see a live class dashboard and leaderboard. Without it, each student's progress stays on their own device."));
    }

    const unlock = h("input", { type: "checkbox", id: "unlock-all" });
    unlock.checked = !!st.unlockAll;
    unlock.addEventListener("change", () => { st.unlockAll = unlock.checked; S.save(); });

    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("h1", { class: "display" }, "Instructor tools"),
      h("section", { class: "qr-section" },
        h("div", null, h("h2", null, "Class QR code"), h("p", null, "Students scan this and land on the sign-in page with their class already filled in."),
          C.field("Class", sel), custom, C.field("Link", linkTxt),
          h("div", { class: "row-start" }, C.btn("Copy link", async () => { const ok = await U.copy(linkTxt.value); copyStatus.textContent = ok ? "Copied" : "Select the link and copy it"; if (!ok) linkTxt.select(); }, "ghost"), copyStatus)),
        qrBox),
      dash,
      h("section", null, h("h2", null, "Preview"), h("label", { class: "check" }, unlock, " Unlock every world for this instructor preview"),
        h("p", { class: "hint" }, "Running a session: give students the QR, say 'World 1 together, then at your own pace', and stop after 45–60 minutes for Viva Roulette in pairs."))
    ]);
    drawQR();
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    await J.remote.init();
    if (S.resume()) showMap(); else showLogin();
  }
  J.app = { showMap, showLogin, showWorld, playLevel };
  boot();
})();
