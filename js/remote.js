/* ==========================================================================
   Optional Supabase sync. Off unless config.supabase.enabled is true and a
   url + anonKey are set. Uses the functions in supabase/schema.sql. Students
   never get email accounts: a cohort, an anonymous player code and a PIN.

   What is sent: a progress summary (never answers or drafts), feedback, and,
   only for players who agreed, engagement events (never answer content).
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = J.util;
  const cfg = (J.config && J.config.supabase) || {};
  const R = (J.remote = { enabled: !!(cfg.enabled && cfg.url && cfg.anonKey), client: null, token: null });
  const TOKEN_PREFIX = "judge-arena:v1:token:";
  const SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

  R.init = function () {
    if (!R.enabled) return Promise.resolve(false);
    return new Promise((resolve) => {
      const ready = () => {
        try { R.client = window.supabase.createClient(cfg.url, cfg.anonKey); resolve(true); }
        catch (e) { console.warn("Supabase init failed", e); R.enabled = false; resolve(false); }
      };
      if (window.supabase) return ready();
      const s = document.createElement("script");
      s.src = SDK;
      s.onload = ready;
      s.onerror = () => { console.warn("Could not load the Supabase library — running in this-device mode."); R.enabled = false; resolve(false); };
      document.head.appendChild(s);
    });
  };

  const tokenKey = (cohort, code) => TOKEN_PREFIX + cohort + ":" + code.toUpperCase();
  const rpc = async (name, args) => {
    try { return await R.client.rpc(name, args); } catch (e) { return { data: null, error: e }; }
  };

  R.register = async function (cohort, pin) {
    const { data, error } = await rpc("judge_register", { p_cohort: cohort, p_pin: pin });
    if (error || !data || !data.ok) {
      console.warn("judge_register failed", error || data);
      let msg = "Couldn't create your player code. Check your connection and try again.";
      if (data && data.error === "invalid") msg = "That trimester and year isn't set up in the class database. Ask your instructor.";
      else if (data && data.error === "busy") msg = "The server is busy. Please try again in a moment.";
      else if (error && (error.code === "PGRST202" || error.status === 404)) msg = "The class database isn't set up yet. Ask your instructor.";
      return { ok: false, error: msg };
    }
    R.token = data.token;
    U.lsSet(tokenKey(cohort, data.player_code), data.token);
    return { ok: true, code: data.player_code };
  };

  /* Returns { ok, progress, consent (true/false/null), feedback } */
  R.signIn = async function (cohort, code, pin) {
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Your PIN must be exactly 4 digits." };
    const { data, error } = await rpc("judge_login", { p_cohort: cohort, p_player_code: code, p_pin: pin });
    if (error) return { ok: false, error: "Couldn't reach the class database. Check your connection and try again." };
    if (data && data.error === "deleted") return { ok: false, error: "This player code was erased by its owner and can no longer be used. Create a new player." };
    if (!data || !data.ok) return { ok: false, error: "That player code and PIN don't match for this trimester and year." };
    R.token = data.token;
    U.lsSet(tokenKey(cohort, code), data.token);
    return { ok: true, progress: data.progress || {}, consent: data.research_consent == null ? null : !!data.research_consent, feedback: data.feedback || {} };
  };

  R.resume = function () {
    const st = J.store.state;
    if (st) R.token = U.lsGet(tokenKey(st.profile.cohort, st.profile.code));
  };
  R.signOut = function () { R.token = null; };

  /* progress = { levels: {id: {done, best, max, stars, attempts}}, badges: [ids], worlds_done: n } */
  R.save = async function (progress, xp) {
    if (!R.client || !R.token) return;
    const { error } = await rpc("judge_save", { p_token: R.token, p_progress: progress, p_xp: xp });
    if (error) console.warn("Sync failed — progress is still saved on this device.", error.message);
  };

  /* Erase this player's data on the server. The instructor then sees the player marked as deleted. */
  R.erase = async function () {
    if (!R.client || !R.token) return false;
    const { data, error } = await rpc("judge_erase", { p_token: R.token });
    return !error && !!(data && data.ok);
  };

  R.setConsent = async function (value) {
    if (!R.client || !R.token) return false;
    const { error } = await rpc("judge_set_consent", { p_token: R.token, p_consent: !!value });
    return !error;
  };

  /* kind: "world" (world = "w1".."w5") or "final" (world = null). The comment text goes here and nowhere else. */
  R.sendFeedback = async function (kind, world, payload) {
    if (!R.client || !R.token) return false;
    const { data, error } = await rpc("judge_feedback", { p_token: R.token, p_kind: kind, p_world: world, p_payload: payload });
    return !error && !!(data && data.ok);
  };

  /* Batch of at most 50 events. Returns { ok, error } */
  R.logEvents = async function (events) {
    if (!R.client || !R.token) return { ok: false, error: "no_session" };
    const { data, error } = await rpc("judge_log_events", { p_token: R.token, p_events: events });
    if (error) return { ok: false, error: "network" };
    return data || { ok: false, error: "unknown" };
  };

  /* Last-chance send when the page is closing. */
  R.beacon = function (events) {
    if (!R.token || !events.length) return false;
    const url = cfg.url.replace(/\/$/, "") + "/rest/v1/rpc/judge_log_events";
    const body = JSON.stringify({ p_token: R.token, p_events: events });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url + "?apikey=" + encodeURIComponent(cfg.anonKey), new Blob([body], { type: "application/json" }))) return true;
    } catch (e) {}
    try {
      fetch(url, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey }, body });
      return true;
    } catch (e) { return false; }
  };

  /* The top players across every cohort: [{ player_code (shortened), xp }] */
  R.leaderboard = async function (limit) {
    if (!R.client) return [];
    const { data, error } = await rpc("judge_leaderboard", { p_limit: limit || 10 });
    return error ? [] : data || [];
  };

  /* ---- instructor ---- */
  const staffCall = async (name, cohort, staffCode, what) => {
    if (!R.client) return { ok: false, error: "Supabase is not enabled." };
    const { data, error } = await rpc(name, { p_cohort: cohort, p_staff_code: staffCode });
    if (error) return { ok: false, error: String(error.message || "").includes("not authorised") ? "That staff code isn't right." : "Couldn't load " + what + ": " + (error.message || "network error") };
    return { ok: true, data };
  };
  R.classProgress = async function (cohort, staffCode) {
    const r = await staffCall("judge_class_progress", cohort, staffCode, "the cohort");
    return r.ok ? { ok: true, rows: r.data || [] } : r;
  };
  R.feedbackSummary = (cohort, staffCode) => staffCall("judge_feedback_summary", cohort, staffCode, "the feedback");
  R.exportEvents = (cohort, staffCode) => staffCall("judge_export_events", cohort, staffCode, "the events");
  R.exportSummary = (cohort, staffCode) => staffCall("judge_export_summary", cohort, staffCode, "the summary");
})();
