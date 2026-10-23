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
    "sharp-eye": { name: "Sharp Eye", mark: "SE", desc: "Found every planted flaw with zero false flags." },
    "three-numbers": { name: "Three Numbers Max", mark: "3N", desc: "Kept the number that answers the question on every slide." },
    "plain-speaker": { name: "Plain Speaker", mark: "PS", desc: "Every Jargon Jail meter green on a paragraph." },
    "honest-idk": { name: "Honest “I don't know”", mark: "IK", desc: "Handled uncertainty honestly in a viva round." },
    "own-thinker": { name: "Own Thinker", mark: "OT", desc: "Had two or more ideas the AI didn't." },
    "context-detective": { name: "Context Detective", mark: "CD", desc: "Caught every place the AI's plan broke on missing context." },
    "off-the-map": { name: "Off the Map", mark: "OM", desc: "A valid idea no AI run produced." },
    "name-on-it": { name: "Your Name Is On It", mark: "YN", desc: "Beat the boss and wrote your judgement record." }
  };

  const S = (J.store = { state: null });

  S.key = (cls, nick) => PREFIX + "p:" + cls.toUpperCase() + ":" + nick.toLowerCase();

  S.blank = (cls, nick, pinHash) => ({
    v: 1,
    profile: { cls: cls.toUpperCase(), nick, pinHash, created: Date.now() },
    levels: {}, badges: {}, bets: [], evidence: {}, record: {},
    settings: { timers: true },
    instructor: false, unlockAll: false, updated: Date.now()
  });

  S.validClass = function (code) {
    const c = (code || "").trim().toUpperCase();
    if (!c) return null;
    const hit = (J.config.classes || []).find((x) => x.code.toUpperCase() === c);
    if (hit) return hit;
    if (J.config.allowAnyClass) return { code: c, label: c };
    return null;
  };

  /* Returns {ok, error} */
  S.login = async function (cls, nick, pin) {
    cls = cls.trim().toUpperCase(); nick = nick.trim();
    const pinHash = U.hash(cls + "|" + nick.toLowerCase() + "|" + pin);
    if (J.remote && J.remote.enabled) {
      const r = await J.remote.signIn(cls, nick, pin);
      if (!r.ok) return r;
      const local = U.lsGet(S.key(cls, nick));
      let st = r.state || local || S.blank(cls, nick, pinHash);
      if (local && r.state && (local.updated || 0) > (r.state.updated || 0)) st = local;
      st.profile.pinHash = pinHash;
      S.state = st;
    } else {
      const existing = U.lsGet(S.key(cls, nick));
      if (existing && existing.profile.pinHash !== pinHash) {
        return { ok: false, error: "That nickname is already used in this class on this device, with a different PIN. Try your PIN again, or pick another nickname." };
      }
      S.state = existing || S.blank(cls, nick, pinHash);
    }
    U.lsSet(PREFIX + "session", { cls, nick });
    S.save(true);
    return { ok: true };
  };

  S.resume = function () {
    const s = U.lsGet(PREFIX + "session");
    if (!s) return false;
    const st = U.lsGet(S.key(s.cls, s.nick));
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
    U.lsSet(S.key(S.state.profile.cls, S.state.profile.nick), S.state);
    if (J.remote && J.remote.enabled) {
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(() => J.remote.save(S.state, S.totalXP()), now ? 0 : 1200);
    }
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

  /* ---- badges ---- */
  S.award = function (id) {
    if (!S.state || S.state.badges[id]) return false;
    S.state.badges[id] = Date.now();
    S.save();
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
