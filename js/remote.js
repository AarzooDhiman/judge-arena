/* ==========================================================================
   Optional Supabase sync. Off unless config.supabase.enabled is true and a
   url + anonKey are set. Uses the RPC functions in supabase/schema.sql:
   students never get email accounts — just class code + nickname + PIN.
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

  const tokenKey = (cls, nick) => TOKEN_PREFIX + cls.toUpperCase() + ":" + nick.toLowerCase();

  R.signIn = async function (cls, nick, pin) {
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Your PIN must be exactly 4 digits." };
    const { data, error } = await R.client.rpc("judge_login", { p_class: cls, p_nick: nick, p_pin: pin });
    if (error) return { ok: false, error: "Couldn't reach the class database. Check your connection and try again." };
    if (!data || !data.ok) return { ok: false, error: "That nickname is already taken in this class with a different PIN. Try your PIN again, or pick another nickname." };
    R.token = data.token;
    U.lsSet(tokenKey(cls, nick), data.token);
    return { ok: true, state: data.state && data.state.v ? data.state : null };
  };

  R.resume = function () {
    const st = J.store.state;
    if (st) R.token = U.lsGet(tokenKey(st.profile.cls, st.profile.nick));
  };
  R.signOut = function () { R.token = null; };

  R.save = async function (state, xp) {
    if (!R.client || !R.token) return;
    const { error } = await R.client.rpc("judge_save", { p_token: R.token, p_state: state, p_xp: xp });
    if (error) console.warn("Sync failed — progress is still saved on this device.", error.message);
  };

  R.leaderboard = async function (cls) {
    if (!R.client) return [];
    const { data, error } = await R.client.rpc("judge_leaderboard", { p_class: cls });
    return error ? [] : data || [];
  };

  R.classProgress = async function (cls, staffCode) {
    if (!R.client) return { ok: false, error: "Supabase is not enabled." };
    const { data, error } = await R.client.rpc("judge_class_progress", { p_class: cls, p_staff_code: staffCode });
    if (error) return { ok: false, error: error.message.includes("not authorised") ? "That staff code isn't right." : "Couldn't load the class: " + error.message };
    return { ok: true, rows: data || [] };
  };
})();
