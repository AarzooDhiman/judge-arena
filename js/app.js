/* ==========================================================================
   App shell: screens, navigation, results, badges, instructor tools.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = J.util, S = J.store, C = J.ui, h = U.h;
  const app = document.getElementById("app");
  const ICON = {
    rate: "Rate", duel: "Duel", hunt: "Hunt", claimcheck: "Check", court: "Court", diet: "Cut", jargon: "Edit", flash: "Recall",
    whynot: "Argue", examiner: "Examine", thinkfirst: "Think", offmap: "Invent", constraints: "Create", boss: "Boss"
  };
  let current = null;
  let playToken = 0, leaveFn = null;
  const T = J.telemetry;
  J.guard.init({ level: () => current, toast });
  T.init({ level: () => current, timersOn: () => !S.state || S.state.settings.timers !== false });

  /* One level at a time is "open": used for the engagement events. */
  let lv = null;
  function addActive(id, secs) {
    S.state.activeS = S.state.activeS || {};
    S.state.activeS[id] = (S.state.activeS[id] || 0) + Math.max(0, secs);
    S.save();
  }
  function levelExit() {
    if (!lv || !lv.started || lv.finished) return;
    const secs = Math.round(T.activeS() - lv.activeMark);
    addActive(lv.id, secs);
    const cp = S.cpGet(lv.id);
    J.track("level_exit", cp && cp.itemIndex != null ? { item_index: cp.itemIndex, active_s: secs } : { active_s: secs }, { world_id: lv.wid, level_id: lv.id });
    lv.finished = true;
  }

  /* After sign-in or resume: ask about research use once (Supabase only), then start. */
  function enter() {
    if (J.remote.enabled && !S.state.instructor && S.consent() == null) return showConsent(() => { T.begin(); showMap(); });
    T.begin();
    showMap();
  }

  /* Flush any half-typed draft when the tab is hidden or closed. */
  function flushLeave() { try { leaveFn && leaveFn(); } catch (e) {} try { S.flushRemote(); } catch (e) {} }
  window.addEventListener("pagehide", flushLeave);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushLeave(); });

  /* ---------------- frame ---------------- */
  function frame(content, opts) {
    opts = opts || {};
    levelExit();
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
        h("button", { type: "button", class: "navlink who", onClick: showAccount, title: "Account" }, S.shownName(st)))));
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
    const cfg = J.config;
    const qT = (cfg.trimesters || []).find((x) => x.code === params.get("t"));
    const qY = (cfg.years || []).find((x) => x.code === (params.get("y") || "").replace("-", "/"));
    const fromLink = !!(qT && qY);
    const optionsOf = (list, pick) => list.map((x) => h("option", { value: x.code, selected: pick && pick.code === x.code }, x.label));
    const tri = h("select", { id: "login-tri" }, optionsOf(cfg.trimesters, qT));
    const yr = h("select", { id: "login-year" }, optionsOf(cfg.years, qY));
    const cohortKey = () => (fromLink ? S.cohortKey(qT.code, qY.code) : S.cohortKey(tri.value, yr.value));

    const nick = h("input", { id: "login-nick", type: "text", autocomplete: "off", maxlength: "20", placeholder: "Optional, and not your real name" });
    const code = h("input", { id: "login-code", type: "text", autocomplete: "off", autocapitalize: "characters", maxlength: "7", placeholder: "JA-7K3P" });
    const pin = h("input", { id: "login-pin", type: "password", inputmode: "numeric", pattern: "[0-9]*", maxlength: "4", autocomplete: "off", placeholder: "4 digits" });
    const err = h("p", { class: "error", role: "alert" }, msg || "");
    const go = h("button", { type: "submit", class: "btn primary big" }, "Start");
    const swap = h("button", { type: "button", class: "linkbtn" }, "Continue with my player code");

    const nickField = C.field("Display name (optional)", nick, "Shown only to you. 2–20 letters or numbers. Don't use your real name.");
    const codeField = C.field("Player code", code, "The code you were given when you started, like JA-7K3P");
    const pinField = C.field("PIN", pin, "Pick 4 digits and remember them. With your player code, they let you carry on later.");
    codeField.hidden = true;
    let returning = false;
    function setMode(r) {
      returning = r;
      codeField.hidden = !r;
      nickField.hidden = r;
      go.textContent = r ? "Continue" : "Start";
      swap.textContent = r ? "I'm new here" : "Continue with my player code";
      pinField.querySelector(".hint").textContent = r ? "The 4 digits you chose when you started." : "Pick 4 digits and remember them. With your player code, they let you carry on later.";
      err.textContent = "";
    }
    swap.addEventListener("click", () => { setMode(!returning); (returning ? code : pin).focus(); });

    const form = h("form", { class: "login-form", novalidate: true },
      fromLink
        ? h("div", { class: "class-chip" }, h("span", { class: "hint" }, "Joining"), h("strong", null, S.cohortLabel(cohortKey())), h("span", { class: "hint" }, cohortKey()))
        : [C.field("Trimester", tri), C.field("Academic year", yr)],
      nickField, codeField, pinField, err, go, swap,
      h("p", { class: "hint small" }, J.remote.enabled
        ? "Your progress is saved to your cohort, so you can continue on any device. Work in progress inside a level stays on the device you started it on."
        : "Your progress is saved in this browser on this device."));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = nick.value.trim(), p = pin.value.trim(), c = code.value.trim().toUpperCase();
      if (returning && !/^JA-[A-Z0-9]{4}$/.test(c)) { err.textContent = "Player codes look like JA-7K3P."; code.focus(); return; }
      if (!returning && n && !/^[A-Za-z0-9_\- ]{2,20}$/.test(n)) { err.textContent = "Display names need 2–20 letters, numbers, spaces, - or _."; nick.focus(); return; }
      if (!/^\d{4}$/.test(p)) { err.textContent = "Your PIN must be exactly 4 digits."; pin.focus(); return; }
      go.disabled = true; go.textContent = "Please wait…";
      const r = returning ? await S.login(cohortKey(), c, p) : await S.register(cohortKey(), p, n);
      go.disabled = false; go.textContent = returning ? "Continue" : "Start";
      if (!r.ok) { err.textContent = r.error; return; }
      if (window.history && history.replaceState && !U.framed) history.replaceState(null, "", location.pathname);
      if (returning) enter(); else showCodeCard();
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
    (fromLink ? pin : tri).focus();
  }

  /* Full-screen card shown once, right after a new player gets their code. */
  function showCodeCard() {
    const st = S.state, code = st.profile.code;
    const status = h("span", { class: "hint", role: "status" });
    frame(h("section", { class: "code-card" },
      h("p", { class: "eyebrow" }, "You're in"),
      h("h1", { class: "display" }, "Your player code is ", h("span", { class: "player-code" }, code)),
      h("p", { class: "lede" }, "Write it down. With your PIN it lets you continue on another device."),
      h("div", { class: "row-center" },
        C.btn("Copy code", async () => { const ok = await U.copy(code); status.textContent = ok ? "Copied" : "Couldn't copy. Write it down instead."; }, "ghost", { "data-copy-ok": "" }),
        C.btn("Continue to the arena", enter)),
      status,
      h("p", { class: "hint" }, "You can see your code again any time from your account (top right).")));
  }

  /* Shown once, before any events are sent. The answer can be changed from the account screen. */
  function showConsent(onDone) {
    current = null;
    const choose = (yes) => { S.setConsent(yes); onDone(); };
    frame(h("section", { class: "code-card consent" },
      h("h1", { class: "display" }, "Help improve JUDGE Arena (optional)"),
      h("p", { class: "lede" }, "With your permission, we record how you use JUDGE Arena — which levels you reach, how long they take, your scores, how often you come back, and copy/paste counts. We never record what you type or which answers you choose. Records use your anonymous player code, not your name. This may be used in research on how students learn to use AI, under the university's ethics approval. You can still play fully if you say no."),
      h("div", { class: "row-center" }, C.btn("Yes, include my usage data", () => choose(true)), C.btn("No thanks", () => choose(false), "ghost"))));
  }

  async function loginInstructor() {
    const code = "INSTRUCTOR";
    const cohort = "STAFF";
    const prev = J.remote.enabled;
    J.remote.enabled = false; // instructor preview is local-only
    S.state = U.lsGet(S.key(cohort, code)) || S.blank(cohort, code, U.hash("staff"));
    J.remote.enabled = prev;
    S.state.instructor = true;
    S.state.unlockAll = true;
    U.lsSet("judge-arena:v1:session", { cohort, code });
    U.lsSet(S.key(cohort, code), S.state);
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
        h("p", { class: "eyebrow" }, st.instructor ? "Instructor preview" : S.cohortLabel(st.profile.cohort)),
        h("h1", { class: "display" }, "Welcome, " + S.shownName(st)),
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
      J.remote.leaderboard(st.profile.cohort).then((rows) => {
        if (!rows.length) return;
        lb.hidden = false;
        lb.append(h("h2", null, "Class leaderboard"), h("ol", { class: "lb" }, rows.slice(0, 10).map((r) => h("li", { class: r.player_code === st.profile.code ? "me" : "" }, h("span", null, r.player_code), h("b", null, r.xp + " XP")))));
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
  function cpMeta(l) {
    const cp = S.cpGet(l.id);
    if (!cp) return null;
    const where = progressText(l, cp);
    return h("span", { class: "in-progress" }, "In progress — " + (where || "answers saved"));
  }

  function showWorld(w) {
    current = null;
    if (!S.worldUnlocked(w)) return showMap();
    J.track("world_open", { world_id: w.id, unlocked: true }, { world_id: w.id });
    const list = h("ol", { class: "levels" }, w.levels.map((l, i) => {
      const ls = S.levelState(l.id);
      return h("li", { class: "level-card", dataset: { done: ls && ls.done ? "1" : "" } },
        h("div", { class: "level-kind" }, h("span", null, ICON[l.type] || l.type)),
        h("div", { class: "level-body" },
          h("h3", null, l.title),
          h("p", null, l.blurb),
          h("div", { class: "level-meta" }, h("span", null, "About " + l.minutes + " min"), cpMeta(l), ls ? h("span", null, "Best " + ls.best + "/" + ls.max) : null, ls ? h("span", { class: "stars" }, [0, 1, 2].map((k) => h("span", { class: "star" + (k < ls.stars ? " on" : "") }, "★"))) : null)),
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
      wd && w.debrief ? h("div", { class: "row-start" },
        C.btn("What this world was about", () => showDebrief(w), "ghost"),
        w.id !== "boss" ? C.btn(S.worldFeedback(w.id) ? "Change my feedback" : "Give feedback on this world", () => showWorldFeedback(w), "ghost") : null) : null,
      wd && w.id === "boss" && !S.finalDone() ? h("div", { class: "unlock-note" }, h("p", null, "Answer the final questions to unlock your judgement record download."), C.btn("Answer the final questions", () => showFinalQuestions(() => showWorld(w)))) : null,
      wd && nextW ? h("div", { class: "unlock-note" }, h("p", null, "World complete. ", h("strong", null, nextW.name), " is unlocked."), C.btn("Go to " + nextW.name, () => showWorld(nextW))) : null
    ]);
  }

  /* ---------------- level ---------------- */
  function playLevel(w, L) {
    const root = h("div", { class: "level-root" });
    const earned = [];
    const token = ++playToken;
    leaveFn = null;
    levelExit();
    lv = { id: L.id, wid: w.id, started: false, finished: false, startedAt: 0, activeMark: 0, itemMark: 0, attempt: 0 };
    const ids = { world_id: w.id, level_id: L.id };
    const savedNote = h("span", { class: "saved-note", role: "status", hidden: true });
    current = L.id;
    frame([
      h("div", { class: "level-head" },
        h("button", { type: "button", class: "back", onClick: () => showWorld(w) }, "← " + w.name),
        h("div", { class: "level-title" }, h("span", { class: "eyebrow w-" + w.colour }, (w.num <= 5 ? "World " + w.num : "Final") + " · " + (ICON[L.type] || "")), h("h1", null, L.title), savedNote)),
      root
    ], { wide: true });
    const ctx = {
      levelId: L.id,
      timers: S.state.settings.timers !== false,
      /* Mid-level progress. Saved on this device only; ignored once another level has been opened. */
      checkpoint: {
        load: () => S.cpGet(L.id),
        save(data, pos) {
          if (token !== playToken) return;
          pos = pos || {};
          S.cpSet(L.id, { data, savedAt: Date.now(), itemIndex: pos.itemIndex == null ? null : pos.itemIndex, score: pos.score || 0, max: pos.max || 0 });
          savedNote.hidden = false;
          savedNote.textContent = "Progress saved";
        },
        clear() { S.cpClear(L.id); },
        onLeave(fn) { if (token === playToken) leaveFn = fn; }
      },
      itemDone(index, points, max) {
        if (!lv || lv.id !== L.id) return;
        const now = T.activeS();
        J.track("item_done", { item_index: index, item_points: points, item_max: max, item_active_s: Math.round(now - lv.itemMark) }, ids);
        lv.itemMark = now;
      },
      award(id) { if (S.award(id)) { earned.push(id); toast("Badge earned: " + J.BADGES[id].name, J.BADGES[id].desc); } },
      bet(p, c) { if (S.bet(p, c)) { earned.push("calibrated"); toast("Badge earned: Calibrated", J.BADGES.calibrated.desc); } },
      log(lines, key) { S.log(key || L.id, lines); },
      finish(res) {
        const wasDone = S.worldDone(w);
        leaveFn = null;
        S.cpClear(L.id);
        const r = S.recordResult(L.id, res.score, res.max);
        const worldJustDone = !wasDone && S.worldDone(w);
        if (lv && lv.id === L.id && !lv.finished) {
          const secs = Math.round(T.activeS() - lv.activeMark);
          addActive(L.id, secs);
          const size = J.levelSize(L);
          J.track("level_complete", Object.assign({ score: res.score, max: res.max, stars: r.stars, attempt_no: S.levelState(L.id).attempts, active_s: secs, total_s: Math.round((Date.now() - lv.startedAt) / 1000) }, size ? { items: size } : {}), ids);
          lv.finished = true;
          if (worldJustDone) J.track("world_complete", { world_id: w.id, total_active_s: Math.round(w.levels.reduce((s, l) => s + ((S.state.activeS || {})[l.id] || 0), 0)) }, { world_id: w.id });
        }
        if (w.id === "boss" && !S.finalDone()) showFinalQuestions(() => showResults(w, L, res, r, earned, worldJustDone));
        else showResults(w, L, res, r, earned, worldJustDone);
      }
    };
    const run = (fromCp) => {
      const cp = fromCp ? S.cpGet(L.id) : null;
      lv.started = true; lv.startedAt = Date.now(); lv.activeMark = T.activeS(); lv.itemMark = T.activeS();
      lv.attempt = ((S.levelState(L.id) || {}).attempts || 0) + 1;
      J.track("level_start", { attempt_no: lv.attempt, from_checkpoint: !!cp, item_index: cp && cp.itemIndex != null ? cp.itemIndex : 0 }, ids);
      if (cp) J.track("checkpoint_resume", { level_id: L.id, item_index: cp.itemIndex != null ? cp.itemIndex : 0, minutes_since_save: Math.round((Date.now() - cp.savedAt) / 60000) }, ids);
      U.clear(root);
      try { J.engines[L.type](root, L, ctx); }
      catch (e) { console.error(e); root.append(h("p", { class: "error" }, "This level hit a problem: " + e.message)); }
    };
    if (L.howTo) root.append(howToCard(L, run)); else run(false);
  }

  /* Text with **bold** runs, as written in the data files. */
  function richText(t) {
    return String(t).split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? h("strong", null, part) : part));
  }

  function savedAtText(ts) {
    const d = new Date(ts), now = new Date();
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return d.toDateString() === now.toDateString() ? time : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + time;
  }
  /* "item 4 of 9", or null for a single-screen level */
  function progressText(L, cp) {
    if (cp.itemIndex == null) return null;
    const n = J.levelSize(L);
    return (L.type === "boss" ? "stage " : "item ") + (cp.itemIndex + 1) + (n ? " of " + n : "");
  }

  function howToCard(L, start) {
    const cp = S.cpGet(L.id);
    const where = cp ? progressText(L, cp) : null;
    return h("section", { class: "howto" },
      h("p", { class: "eyebrow" }, "How to play"),
      h("h2", null, L.title),
      h("p", { class: "howto-text" }, richText(L.howTo)),
      h("p", { class: "howto-meta" }, "About " + L.minutes + " minutes"),
      h("p", { class: "hint" }, "Scoring: you earn points for each judgement you make. Every level gives one to three stars: 60% of the points for two, 85% for three."),
      cp
        ? h("div", { class: "row-start" },
            C.btn(where ? "Continue from " + where + " (saved " + savedAtText(cp.savedAt) + ")" : "Continue where you left off (saved " + savedAtText(cp.savedAt) + ")", () => start(true)),
            C.btn("Start again", () => { S.cpClear(L.id); start(false); }, "ghost"))
        : h("div", { class: "row-start" }, C.btn("Start", () => start(false))));
  }

  function showResults(w, L, res, r, earned, worldJustDone) {
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
      worldJustDone && w.debrief ? debriefBlock(w, true) : null,
      worldJustDone && w.id !== "boss" && !S.worldFeedbackAsked(w.id) ? feedbackSlot(w) : null,
      !nextL && wd && nextW ? h("p", { class: "unlock-flash" }, "World " + nextW.num + " unlocked: " + nextW.name) : null,
      h("div", { class: "row-center" }, actions)));
  }

  /* ---------------- feedback ---------------- */
  /* Star rating + optional comment. onDone("sent" | "skipped") once the player chooses. */
  function worldFeedbackCard(w, onDone, edit) {
    const cfg = J.FEEDBACK.world, existing = S.worldFeedback(w.id);
    let rating = existing ? existing.rating : 0;
    const btns = [1, 2, 3, 4, 5].map((n) => {
      const b = h("button", { type: "button", role: "radio", class: "star-btn", "aria-label": n + (n === 1 ? " star" : " stars") }, "★");
      b.addEventListener("click", () => { rating = n; paint(); send.disabled = false; });
      return b;
    });
    const paint = () => btns.forEach((b, i) => { b.classList.toggle("on", i < rating); b.setAttribute("aria-checked", i + 1 === rating ? "true" : "false"); });
    const ta = C.textarea("fb-" + w.id, "", 3, existing ? existing.comment : "");
    ta.setAttribute("maxlength", String(cfg.maxChars));
    ta.setAttribute("aria-label", "Comment (optional)");
    const count = h("span", { class: "hint" });
    const updateCount = () => (count.textContent = ta.value.length + " / " + cfg.maxChars);
    ta.addEventListener("input", updateCount);
    updateCount();
    const send = C.btn("Send", () => { S.setWorldFeedback(w.id, rating, ta.value.trim().slice(0, cfg.maxChars)); onDone("sent"); }, "primary", { disabled: !rating });
    paint();
    return h("section", { class: "feedback-card" },
      h("h3", null, cfg.prompt),
      h("div", { class: "star-input", role: "radiogroup", "aria-label": cfg.prompt }, btns),
      C.field("Comment (optional)", ta), count,
      h("div", { class: "row-start" }, send, C.btn(edit ? "Cancel" : "Skip", () => { if (!edit) S.skipWorldFeedback(w.id); onDone("skipped"); }, "ghost")));
  }
  function feedbackSlot(w) {
    const slot = h("div", { class: "feedback-slot" });
    slot.append(worldFeedbackCard(w, (how) => {
      U.clear(slot);
      slot.append(h("p", { class: "hint" }, how === "sent" ? "Thank you. Your feedback was saved." : "Skipped. You can add feedback any time from the world screen."));
    }));
    return slot;
  }
  function showWorldFeedback(w) {
    current = null;
    frame([
      h("button", { type: "button", class: "back", onClick: () => showWorld(w) }, "← " + w.name),
      h("h1", { class: "display" }, w.name),
      worldFeedbackCard(w, (how) => { if (how === "sent") toast("Feedback saved"); showWorld(w); }, true)
    ]);
  }

  /* The required end-of-game questionnaire. Questions 1 to requiredUpTo must be answered. */
  function showFinalQuestions(onDone) {
    current = null;
    const cfg = J.FEEDBACK.final, saved = S.finalFeedback() || {};
    const ans = {};
    const submit = C.btn("Submit and continue", () => { S.setFinalFeedback(ans); toast("Thank you"); onDone(); }, "primary", { disabled: true });
    const check = () => {
      submit.disabled = !cfg.questions.slice(0, cfg.requiredUpTo).every((q) => (q.type === "multi" ? (ans[q.id] || []).length > 0 : !!ans[q.id]));
    };
    const blocks = cfg.questions.map((q, n) => {
      if (q.type === "text") {
        const ta = C.textarea("fq-" + q.id, "", 4, saved[q.id] || "");
        ta.setAttribute("maxlength", String(q.maxChars));
        ans[q.id] = ta.value;
        ta.addEventListener("input", () => (ans[q.id] = ta.value.slice(0, q.maxChars)));
        return h("fieldset", { class: "fq" }, h("legend", null, (n + 1) + ". " + q.text), ta, h("span", { class: "hint" }, "Up to " + q.maxChars.toLocaleString("en-GB") + " characters"));
      }
      const multi = q.type === "multi";
      if (multi) ans[q.id] = (saved[q.id] || []).slice(); else if (saved[q.id]) ans[q.id] = saved[q.id];
      const boxes = q.options.map((opt, k) => {
        const input = h("input", { type: multi ? "checkbox" : "radio", name: "fq-" + q.id, id: "fq-" + q.id + "-" + k, value: opt });
        input.checked = multi ? ans[q.id].includes(opt) : ans[q.id] === opt;
        input.addEventListener("change", () => {
          if (multi) {
            const set = new Set(ans[q.id]);
            if (input.checked) set.add(opt); else set.delete(opt);
            if (input.checked && q.exclusive) {
              if (opt === q.exclusive) { set.clear(); set.add(opt); } else set.delete(q.exclusive);
            }
            ans[q.id] = q.options.filter((o) => set.has(o));
            boxes.forEach((b) => (b.input.checked = set.has(b.opt)));
          } else ans[q.id] = opt;
          check();
        });
        return { opt, input, el: h("label", { class: "check" }, input, " ", opt) };
      });
      return h("fieldset", { class: "fq" }, h("legend", null, (n + 1) + ". " + q.text), boxes.map((b) => b.el));
    });
    check();
    frame([
      h("h1", { class: "display" }, "Final questions"),
      h("p", { class: "lede" }, "Questions 1 to " + cfg.requiredUpTo + " unlock your results and your judgement record download. The last one is optional."),
      h("form", { class: "fq-form", onSubmit: (e) => e.preventDefault() }, blocks, h("div", { class: "row-start" }, submit))
    ]);
  }

  /* ---------------- world debrief ---------------- */
  function debriefBlock(w, complete) {
    const d = w.debrief;
    return h("section", { class: "debrief" },
      h("p", { class: "eyebrow" }, complete ? "World complete" : w.name),
      h("h2", null, complete ? w.name : "What this world was about"),
      h("h3", null, "The AI-overuse problem this world tackled"), h("p", null, d.challenge),
      h("h3", null, "What you practised"), h("p", null, d.practised),
      h("h3", null, "How to keep getting better"), C.list(d.improve));
  }
  function showDebrief(w) {
    current = null;
    frame([
      h("button", { type: "button", class: "back", onClick: () => showWorld(w) }, "← " + w.name),
      debriefBlock(w, false)
    ]);
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
        h("p", null, J.remote.enabled ? "Your anonymous player code, progress and judgement record are saved to your cohort's database so your instructor can see cohort progress. Never use your real name." : "Your player code, progress and judgement record stay in this browser on this device. Nothing is sent anywhere."),
        h("h2", null, "Copying and pasting"),
        h("p", null, "Copying is limited to encourage doing the work here. It can't stop screenshots or retyping; it's a nudge, not a lock. JUDGE Arena counts copy attempts and pastes into answer boxes, but never what was copied or pasted."),
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
      h("div", { class: "row-end" }, C.btn("Cancel", () => (confirmBox.hidden = true), "ghost"), C.btn("Erase", () => { T.stop(false); S.resetDevice(); showLogin("Progress on this device was erased."); }, "danger")));
    const consentBox = h("input", { type: "checkbox", id: "set-consent" });
    consentBox.checked = S.consent() === true;
    consentBox.addEventListener("change", () => {
      S.setConsent(consentBox.checked);
      if (consentBox.checked) T.begin(); else T.stop(false);
      toast(consentBox.checked ? "Usage data on" : "Usage data off", consentBox.checked ? "Thank you." : "Nothing more will be recorded.");
    });
    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("h1", { class: "display" }, S.shownName(st)),
      h("p", { class: "lede" }, S.cohortLabel(st.profile.cohort) + (st.instructor ? " · instructor preview" : "")),
      st.instructor ? null : h("p", null, "Your player code: ", h("span", { class: "player-code" }, st.profile.code), " ", C.btn("Copy", async () => { await U.copy(st.profile.code); toast("Player code copied"); }, "ghost", { "data-copy-ok": "" })),
      h("div", { class: "row-start" },
        C.btn("Sign out", async () => { await T.stop(true); S.logout(); showLogin(); }, "ghost"),
        C.btn("Erase progress on this device", () => (confirmBox.hidden = false), "ghost")),
      confirmBox,
      J.remote.enabled && !st.instructor ? h("label", { class: "check" }, consentBox, " Include my usage data in research (optional). We never record what you type or which answers you choose.") : null,
      h("p", { class: "hint" }, "To continue later, choose \"Continue with my player code\" and enter your player code and PIN" + (J.remote.enabled ? " — on any device." : " on this device."))
    ]);
  }

  /* ---------------- instructor ---------------- */
  /* Average stars per world, and how many chose each option of each final question. */
  function feedbackSummaryView(data) {
    const worldName = (id) => { const w = S.worlds().find((x) => x.id === id); return w ? w.name : id; };
    const worlds = (data && data.worlds) || [], fin = (data && data.final) || {};
    const qs = J.FEEDBACK.final.questions;
    return h("div", { class: "fb-summary" },
      h("h3", null, "Feedback"),
      worlds.length ? h("div", { class: "table-wrap" }, h("table", { class: "mini" },
        h("thead", null, h("tr", null, h("th", null, "World"), h("th", null, "Average stars"), h("th", null, "Ratings"))),
        h("tbody", null, worlds.map((x) => h("tr", null, h("td", null, worldName(x.world_id)), h("td", { class: "num" }, Number(x.avg).toFixed(2)), h("td", { class: "num" }, x.n)))))) : h("p", { class: "hint" }, "No world ratings yet."),
      qs.filter((q) => q.type !== "text").map((q) => {
        const counts = fin[q.id] || {};
        return h("div", { class: "table-wrap" }, h("table", { class: "mini" },
          h("caption", null, q.text.replace(" (tick all that apply)", "")),
          h("tbody", null, q.options.map((o) => h("tr", null, h("td", null, o), h("td", { class: "num" }, counts[o] || 0))))));
      }));
  }
  function eventsCsv(rows) {
    const cols = ["id", "player_code", "session_id", "cohort", "type", "world_id", "level_id", "payload", "client_ts", "created_at"];
    return U.toCsv(cols, rows.map((r) => cols.map((c) => r[c])));
  }
  function summaryCsv(rows) {
    const levelIds = S.worlds().flatMap((w) => w.levels.map((l) => l.id));
    const worldIds = S.worlds().filter((w) => w.id !== "boss").map((w) => w.id);
    const qIds = J.FEEDBACK.final.questions.map((q) => q.id);
    const header = ["player_code", "research_consent", "levels_done", "visits", "total_active_s"]
      .concat(levelIds.map((id) => "best_" + id), levelIds.map((id) => "active_s_" + id), ["copy_attempts", "copies_blocked", "pastes"], worldIds.map((id) => "rating_" + id), qIds);
    return U.toCsv(header, rows.map((r) => {
      const lv = r.levels || {}, la = r.level_active_s || {}, wr = r.world_ratings || {}, fin = r.final || {};
      return [r.player_code, r.research_consent == null ? "undecided" : r.research_consent, r.levels_done, r.visits, r.total_active_s]
        .concat(levelIds.map((id) => (lv[id] ? lv[id].best : "")), levelIds.map((id) => la[id]), [r.copy_attempts, r.copies_blocked, r.pastes], worldIds.map((id) => wr[id]),
          qIds.map((q) => (Array.isArray(fin[q]) ? fin[q].join(" | ") : fin[q])));
    }));
  }
  function cohortUrl(t, y) {
    const base = location.href.split("#")[0].split("?")[0];
    return base + "?t=" + encodeURIComponent(t) + "&y=" + encodeURIComponent(y.replace("/", "-"));
  }
  function showInstructor() {
    current = null;
    const st = S.state;
    if (!st || !st.instructor) return showMap();
    const selT = h("select", { id: "qr-tri" }, J.config.trimesters.map((c) => h("option", { value: c.code }, c.label)));
    const selY = h("select", { id: "qr-year" }, J.config.years.map((c) => h("option", { value: c.code }, c.label)));
    const qrBox = h("div", { class: "qr-box" });
    const linkTxt = h("input", { id: "qr-link", type: "text", readonly: true });
    const copyStatus = h("span", { class: "hint", role: "status" });
    function drawQR() {
      const url = cohortUrl(selT.value, selY.value);
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
    selT.addEventListener("change", drawQR);
    selY.addEventListener("change", drawQR);

    const dash = h("section", { class: "dash" });
    if (J.remote.enabled) {
      const dT = h("select", { id: "dash-tri" }, J.config.trimesters.map((c) => h("option", { value: c.code }, c.label)));
      const dY = h("select", { id: "dash-year" }, J.config.years.map((c) => h("option", { value: c.code }, c.label)));
      const sc = h("input", { id: "dash-staff", type: "password", placeholder: "Staff code (set in schema.sql)" });
      const out = h("div");
      const exportMsg = h("div");
      dash.append(h("h2", null, "Cohort progress"), h("div", { class: "control-row" }, C.field("Trimester", dT), C.field("Academic year", dY), C.field("Staff code", sc), C.btn("Load", async () => {
        U.clear(out);
        out.append(h("p", { class: "hint" }, "Loading…"));
        const r = await J.remote.classProgress(S.cohortKey(dT.value, dY.value), sc.value);
        U.clear(out);
        if (!r.ok) { out.append(h("p", { class: "error" }, r.error)); return; }
        const total = S.worlds().reduce((s, w) => s + w.levels.length, 0);
        const csv = ["player_code,xp,levels_done,levels_total,badges,last_active"].concat(r.rows.map((x) =>
          [x.player_code, x.xp, x.levels_done, total, x.badges, x.updated_at].join(","))).join("\n");
        out.append(h("p", null, r.rows.length + " players"), C.btn("Download CSV", () => U.download("cohort-progress-" + dT.value + "-" + dY.value.replace(/[^\w-]/g, "-") + ".csv", csv), "ghost"), h("div", { class: "table-wrap" }, h("table", { class: "mini" },
          h("thead", null, h("tr", null, h("th", null, "Player code"), h("th", null, "XP"), h("th", null, "Levels"), h("th", null, "Badges"), h("th", null, "Last active"))),
          h("tbody", null, r.rows.map((x) => h("tr", null, h("td", null, x.player_code), h("td", { class: "num" }, x.xp), h("td", { class: "num" }, x.levels_done + "/" + total), h("td", { class: "num" }, x.badges), h("td", null, new Date(x.updated_at).toLocaleString("en-GB"))))))));
        const fbBox = h("div");
        out.append(fbBox);
        const f = await J.remote.feedbackSummary(S.cohortKey(dT.value, dY.value), sc.value);
        if (f.ok) fbBox.append(feedbackSummaryView(f.data));
      }, "primary"), C.btn("Export engagement data (CSV)", async () => {
        U.clear(exportMsg);
        const cohort = S.cohortKey(dT.value, dY.value);
        const [ev, sm] = await Promise.all([J.remote.exportEvents(cohort, sc.value), J.remote.exportSummary(cohort, sc.value)]);
        if (!ev.ok || !sm.ok) { exportMsg.append(h("p", { class: "error" }, (ev.ok ? sm : ev).error)); return; }
        const stamp = dT.value + "-" + dY.value.replace(/[^\w-]/g, "-");
        U.download("engagement-events-" + stamp + ".csv", eventsCsv(ev.data || []));
        U.download("engagement-summary-" + stamp + ".csv", summaryCsv(sm.data || []));
        exportMsg.append(h("p", { class: "hint" }, (ev.data || []).length + " events from players who agreed, and " + (sm.data || []).length + " players in the summary. Players who did not agree appear with progress only."));
      }, "ghost")), exportMsg, out);
    } else {
      dash.append(h("h2", null, "Cohort progress"), h("p", null, "Turn on Supabase in js/config.js to see a live cohort dashboard and leaderboard. Without it, each student's progress stays on their own device."));
    }

    const unlock = h("input", { type: "checkbox", id: "unlock-all" });
    unlock.checked = !!st.unlockAll;
    unlock.addEventListener("change", () => { st.unlockAll = unlock.checked; S.save(); });

    frame([
      h("button", { type: "button", class: "back", onClick: showMap }, "← All worlds"),
      h("h1", { class: "display" }, "Instructor tools"),
      h("section", { class: "qr-section" },
        h("div", null, h("h2", null, "Class QR code"), h("p", null, "Students scan this and land on the sign-in page with their trimester and year already filled in."),
          C.field("Trimester", selT), C.field("Academic year", selY), C.field("Link", linkTxt),
          h("div", { class: "row-start" }, C.btn("Copy link", async () => { const ok = await U.copy(linkTxt.value); copyStatus.textContent = ok ? "Copied" : "Select the link and copy it"; if (!ok) linkTxt.select(); }, "ghost", { "data-copy-ok": "" }), copyStatus)),
        qrBox),
      dash,
      h("section", null, h("h2", null, "Preview"), h("label", { class: "check" }, unlock, " Unlock every world for this instructor preview"),
        h("p", { class: "hint" }, "Running a session: give students the QR, say 'World 1 together, then at your own pace', and let them go at their own pace for 45–60 minutes."))
    ]);
    drawQR();
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    await J.remote.init();
    if (S.resume()) enter(); else showLogin();
  }
  J.app = { showMap, showLogin, showWorld, playLevel };
  boot();
})();
