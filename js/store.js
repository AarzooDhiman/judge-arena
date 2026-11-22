/* ==========================================================================
   Player state: login, progress, unlocking, badges, evidence log.
   Saves to this browser (localStorage). If Supabase is enabled in config.js,
   it also syncs to the class database via JUDGE.remote.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = J.util;
  const PREFIX = "judge-arena:v1:";

  J.BADGES = {
    calibrated: { name: "Calibrated", mark: "Ca", desc: "Your confidence matched your accuracy across 8+ bets." },
    "sharp-eye": { name: "Sharp Eye", mark: "SE", desc: "Found every hallucination in a level." },
    "three-numbers": { name: "Three Numbers Max", mark: "3N", desc: "Kept the number that answers the question on every slide." },
    "plain-speaker": { name: "Plain Speaker", mark: "PS", desc: "Every Jargon Jail meter green on a paragraph." },
    "honest-idk": { name: "Honest “I don't know”", mark: "IK", desc: "Full marks on an Examiner's Chair round where the answer was honest about its limits." },
    "sharp-examiner": { name: "Sharp Examiner", mark: "SX", desc: "Full marks on every round of Examiner's Chair." },
    "own-thinker": { name: "Own Thinker", mark: "OT", desc: "Had two or more ideas the AI didn't." },
    "context-detective": { name: "Context Detective", mark: "CD", desc: "Caught every place the AI's plan broke on missing context." },
    "off-the-map": { name: "Off the Map", mark: "OM", desc: "A valid idea no AI run produced." },
    "name-on-it": { name: "Your Name Is On It", mark: "YN", desc: "Beat the boss and wrote your judgement record." }
  };

  const S = (J.store = { state: null });

  /* ---- cohort = "<trimester>|<year>", e.g. "T1|25/26" ---- */
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  S.cohortKey = (t, y) => t + "|" + y;
  S.cohortParts = function (key) {
    const [t, y] = String(key || "").split("|");
    const tri = (J.config.trimesters || []).find((x) => x.code === t);
    const yr = (J.config.years || []).find((x) => x.code === y);
    return tri && yr ? { t: tri, y: yr } : null;
  };
  S.cohortLabel = function (key) {
    const p = S.cohortParts(key);
    return p ? p.t.label + " · " + p.y.label : key;
  };

  S.key = (cohort, code) => PREFIX + "p:" + cohort + ":" + code.toUpperCase();

  S.blank = (cohort, code, pinHash, nick) => ({
    v: 2,
    profile: { cohort, code, nick: nick || "", pinHash, created: Date.now() },
    levels: {}, badges: {}, bets: [], evidence: {}, record: {}, checkpoints: {}, feedback: { worlds: {}, asked: {}, final: null },
    settings: { timers: true },
    instructor: false, unlockAll: false, updated: Date.now()
  });

  /* What to show for a player: their display name if they set one, else their code. */
  S.shownName = (st) => (st.profile.nick || st.profile.code);

  S.newCode = function () {
    let out = "JA-";
    const n = CODE_CHARS.length;
    const buf = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(4)) : null;
    for (let i = 0; i < 4; i++) out += CODE_CHARS[(buf ? buf[i] : Math.floor(Math.random() * 256)) % n];
    return out;
  };

  /* New player: choose a PIN, get a code. Returns {ok, error, code} */
  S.register = async function (cohort, pin, nick) {
    nick = (nick || "").trim();
    let code, token = null;
    if (J.remote && J.remote.enabled) {
      const r = await J.remote.register(cohort, pin);
      if (!r.ok) return r;
      code = r.code;
    } else {
      let tries = 0;
      do { code = S.newCode(); } while (U.lsGet(S.key(cohort, code)) && ++tries < 50);
    }
    S.state = S.blank(cohort, code, U.hash(cohort + "|" + code + "|" + pin), nick);
    U.lsSet(PREFIX + "session", { cohort, code });
    S.save(true);
    return { ok: true, code };
  };

  /* Returning player: code + PIN. Returns {ok, error} */
  S.login = async function (cohort, code, pin) {
    code = code.trim().toUpperCase();
    const pinHash = U.hash(cohort + "|" + code + "|" + pin);
    const local = U.lsGet(S.key(cohort, code));
    if (J.remote && J.remote.enabled) {
      const r = await J.remote.signIn(cohort, code, pin);
      if (!r.ok) return r;
      /* Cross-device: completed levels, badges and feedback come back; mid-level checkpoints stay on the original device. */
      const st = local || S.blank(cohort, code, pinHash);
      mergeProgress(st, r.progress);
      mergeFeedback(st, r.feedback);
      st.profile.researchConsent = r.consent;
      st.profile.pinHash = pinHash;
      S.state = st;
    } else {
      if (!local) return { ok: false, error: "No player with that code was found for this trimester and year on this device. Check the code, the trimester and the year." };
      if (local.profile.pinHash !== pinHash) return { ok: false, error: "That PIN doesn't match this player code. Try again." };
      S.state = local;
    }
    U.lsSet(PREFIX + "session", { cohort, code });
    S.save(true);
    return { ok: true };
  };

  function mergeProgress(st, p) {
    Object.entries((p && p.levels) || {}).forEach(([id, pl]) => {
      const lo = st.levels[id] || {};
      st.levels[id] = {
        done: !!(lo.done || pl.done),
        attempts: Math.max(lo.attempts || 0, pl.attempts || 0),
        best: Math.max(lo.best || 0, pl.best || 0),
        last: lo.last != null ? lo.last : pl.best || 0,
        max: Math.max(lo.max || 0, pl.max || 0),
        stars: Math.max(lo.stars || 0, pl.stars || 0),
        at: lo.at || Date.now()
      };
    });
    ((p && p.badges) || []).forEach((id) => { if (J.BADGES[id] && !st.badges[id]) st.badges[id] = Date.now(); });
  }
  function mergeFeedback(st, f) {
    st.feedback = st.feedback || { worlds: {}, asked: {}, final: null };
    Object.entries((f && f.worlds) || {}).forEach(([id, w]) => {
      if (!st.feedback.worlds[id]) st.feedback.worlds[id] = { rating: w.rating, comment: w.comment || "", at: w.at || Date.now() };
      st.feedback.asked[id] = true;
    });
    if (f && f.final && !st.feedback.final) st.feedback.final = Object.assign({}, f.final, { at: f.final.at || Date.now() });
  }

  /* What goes to Supabase: a summary, never answers, drafts or feedback text. */
  S.progress = function () {
    const levels = {};
    Object.entries(S.state.levels).forEach(([id, l]) => { levels[id] = { done: !!l.done, best: l.best || 0, max: l.max || 0, stars: l.stars || 0, attempts: l.attempts || 0 }; });
    return { levels, badges: Object.keys(S.state.badges), worlds_done: S.worlds().filter((w) => S.worldDone(w)).length };
  };

  S.resume = function () {
    const s = U.lsGet(PREFIX + "session");
    if (!s || !s.cohort || !s.code) return false;
    const st = U.lsGet(S.key(s.cohort, s.code));
    if (!st) return false;
    S.state = st;
    if (J.remote && J.remote.enabled) J.remote.resume && J.remote.resume();
    return true;
  };

  S.logout = function () {
    U.lsDel(PREFIX + "session");
    S.state = null;
    if (J.remote && J.remote.enabled && J.remote.signOut) J.remote.signOut();
  };

  let remoteTimer = null;
  S.save = function (now) {
    if (!S.state) return;
    S.state.updated = Date.now();
    U.lsSet(S.key(S.state.profile.cohort, S.state.profile.code), S.state);
    if (J.remote && J.remote.enabled) {
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(S.flushRemote, now ? 0 : 1200);
    }
  };

  /* Send the progress summary now (also used when the tab is hidden or closed). */
  S.flushRemote = function () {
    clearTimeout(remoteTimer);
    remoteTimer = null;
    if (S.state && J.remote && J.remote.enabled) J.remote.save(S.progress(), S.totalXP());
  };

  S.resetDevice = function () {
    U.lsKeys(PREFIX).forEach(U.lsDel);
    S.state = null;
  };

  /* ---- worlds & levels ---- */
  S.worlds = function () {
    const w = (J.worlds || []).slice().sort((a, b) => a.num - b.num);
    if (J.boss) w.push(J.boss);
    return w;
  };
  S.findLevel = function (id) {
    for (const w of S.worlds()) for (const l of w.levels) if (l.id === id) return { world: w, level: l };
    return null;
  };
  S.levelState = (id) => (S.state && S.state.levels[id]) || null;
  S.worldDone = (w) => w.levels.every((l) => S.levelState(l.id) && S.levelState(l.id).done);
  S.worldStars = (w) => w.levels.reduce((s, l) => s + ((S.levelState(l.id) || {}).stars || 0), 0);
  S.worldUnlocked = function (w) {
    if (!S.state) return false;
    if (S.state.unlockAll) return true;
    const ws = S.worlds();
    const i = ws.indexOf(w);
    return i <= 0 || S.worldDone(ws[i - 1]);
  };
  S.totalXP = () => (S.state ? Object.values(S.state.levels).reduce((s, l) => s + (l.best || 0), 0) : 0);
  S.maxXP = () => S.worlds().reduce((s, w) => s + w.levels.reduce((t, l) => t + ((S.levelState(l.id) || {}).max || 0), 0), 0);

  S.starsFor = function (score, max) {
    const p = max ? score / max : 0;
    return p >= 0.85 ? 3 : p >= 0.6 ? 2 : 1;
  };

  S.recordResult = function (id, score, max) {
    const prev = S.state.levels[id] || { attempts: 0, best: 0, stars: 0 };
    const stars = S.starsFor(score, max);
    S.state.levels[id] = {
      done: true,
      attempts: prev.attempts + 1,
      best: Math.max(prev.best || 0, score),
      last: score,
      max,
      stars: Math.max(prev.stars || 0, stars),
      at: Date.now()
    };
    S.save(true);
    return { stars, improved: score > (prev.best || 0), first: !prev.attempts };
  };

  /* ---- checkpoints: mid-level progress, kept on this device only ---- */
  S.cpGet = (id) => (S.state && S.state.checkpoints && S.state.checkpoints[id]) || null;
  S.cpSet = function (id, cp) {
    if (!S.state) return;
    S.state.checkpoints = S.state.checkpoints || {};
    S.state.checkpoints[id] = cp;
    S.save();
  };
  S.cpClear = function (id) {
    if (S.state && S.state.checkpoints && S.state.checkpoints[id]) { delete S.state.checkpoints[id]; S.save(); }
  };

  /* ---- feedback (kept on this device for now) ---- */
  const fb = () => (S.state.feedback = S.state.feedback || { worlds: {}, asked: {}, final: null });
  S.worldFeedback = (id) => (S.state && fb().worlds[id]) || null;
  S.worldFeedbackAsked = (id) => !!(S.state && (fb().asked[id] || fb().worlds[id]));
  S.setWorldFeedback = function (id, rating, comment) {
    fb().worlds[id] = { rating, comment, at: Date.now() };
    fb().asked[id] = true;
    S.save();
    send("world", id, { rating, comment });
    J.track && J.track("feedback", { kind: "world", world_id: id, rating }, { world_id: id });
  };
  S.skipWorldFeedback = function (id) { fb().asked[id] = true; S.save(); };
  S.finalFeedback = () => (S.state && fb().final) || null;
  S.finalDone = () => !!S.finalFeedback();
  S.setFinalFeedback = function (answers) {
    fb().final = Object.assign({}, answers, { at: Date.now() });
    S.save(true);
    send("final", null, answers);
    const ev = { kind: "final" };
    ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"].forEach((q) => { if (answers[q] != null) ev[q] = answers[q]; });
    J.track && J.track("feedback", ev);
  };

  /* Sent to Supabase when it is on. If that fails the item waits in `unsent` and is retried. */
  function send(kind, world, payload) {
    if (!(J.remote && J.remote.enabled)) return;
    const f = fb();
    f.unsent = (f.unsent || []).filter((u) => !(u.kind === kind && u.world === world));
    f.unsent.push({ kind, world, payload });
    S.flushPending();
  }
  let flushing = false;
  S.flushPending = async function () {
    if (flushing || !S.state || !(J.remote && J.remote.enabled) || !J.remote.token) return;
    flushing = true;
    try {
      const f = fb();
      for (const u of (f.unsent || []).slice()) {
        if (await J.remote.sendFeedback(u.kind, u.world, u.payload)) f.unsent = f.unsent.filter((x) => x !== u);
      }
      const c = S.state.profile;
      if (c.consentPending && (await J.remote.setConsent(c.researchConsent === true))) c.consentPending = false;
      S.save();
    } finally { flushing = false; }
  };

  /* Research consent: true, false, or null (not asked yet) */
  S.consent = () => (S.state && S.state.profile.researchConsent != null ? S.state.profile.researchConsent : null);
  S.setConsent = function (value) {
    S.state.profile.researchConsent = !!value;
    S.state.profile.consentAt = Date.now();
    S.state.profile.consentPending = !!(J.remote && J.remote.enabled);
    S.save();
    S.flushPending();
  };

  /* ---- badges ---- */
  S.award = function (id) {
    if (!S.state || S.state.badges[id]) return false;
    S.state.badges[id] = Date.now();
    S.save();
    J.track && J.track("badge", { badge_id: id });
    return true;
  };

  /* Confidence bets: p = stated probability, c = 1 if right. */
  S.bet = function (p, c) {
    S.state.bets.push([p, c ? 1 : 0]);
    S.save();
    const b = S.state.bets;
    if (b.length >= 8) {
      const brier = b.reduce((s, [pp, cc]) => s + (pp - cc) * (pp - cc), 0) / b.length;
      if (brier <= 0.2) return S.award("calibrated");
    }
    return false;
  };
  S.calibration = function () {
    const b = (S.state && S.state.bets) || [];
    if (!b.length) return null;
    const groups = { 0.5: [0, 0], 0.7: [0, 0], 0.9: [0, 0] };
    b.forEach(([p, c]) => { const g = groups[p]; if (g) { g[0] += c; g[1]++; } });
    const brier = b.reduce((s, [pp, cc]) => s + (pp - cc) * (pp - cc), 0) / b.length;
    return { n: b.length, brier, groups };
  };

  /* ---- evidence log (feeds the judgement record) ---- */
  S.log = function (levelId, lines) {
    S.state.evidence[levelId] = [].concat(lines).filter(Boolean);
    S.save();
  };
})();
