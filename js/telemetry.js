/* ==========================================================================
   Engagement events. Only when Supabase is on AND the player agreed. Events
   hold counts, timings and scores, never what was typed or chosen. They are
   queued, sent in batches of up to 50 every 20 seconds and when the tab is
   hidden, and the queue is dropped after 3 failed attempts.

   "Active time" counts only while the tab is visible and the player has done
   something (pointer, key or scroll) in the last 60 seconds.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const T = (J.telemetry = {});
  const FLUSH_MS = 20000, IDLE_MS = 60000, BATCH = 50, MAX_FAILS = 3, HIDDEN_MIN_S = 5;
  let hooks = { level: () => null, timersOn: () => true };
  let queue = [], fails = 0, sending = false;
  let sessionId = null, running = false, startedAt = 0, active = 0, lastTouch = 0, hiddenAt = null, ticker = null, flusher = null;
  const entry = (function () { try { const p = new URLSearchParams(location.search); return p.get("t") && p.get("y") ? "qr" : "direct"; } catch (e) { return "direct"; } })();

  T.init = (h) => Object.assign(hooks, h);
  T.enabled = () => !!(J.remote && J.remote.enabled && J.remote.token && J.store && J.store.state && J.store.state.profile.researchConsent === true);
  T.activeS = () => active;
  T.sessionActiveS = () => Math.round(active);

  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));
  const touch = () => { lastTouch = Date.now(); };

  /* ids = { world_id, level_id } go in their own columns; payload holds the rest. */
  J.track = function (type, payload, ids) {
    if (!running || !T.enabled()) return;
    payload = payload || {};
    ids = ids || {};
    queue.push({
      type, session_id: sessionId,
      world_id: ids.world_id || payload.world_id || null,
      level_id: ids.level_id || payload.level_id || null,
      payload, client_ts: new Date().toISOString()
    });
    if (queue.length >= BATCH) T.flush();
  };

  T.flush = async function () {
    if (sending || !queue.length || !T.enabled()) return;
    sending = true;
    const batch = queue.splice(0, BATCH);
    try {
      const r = await J.remote.logEvents(batch);
      if (r && r.ok) fails = 0;
      else if (r && (r.error === "no_consent" || r.error === "payload_too_large" || r.error === "bad_batch")) { queue = []; fails = 0; }
      else throw new Error("send failed");
    } catch (e) {
      fails++;
      if (fails >= MAX_FAILS) { queue = []; fails = 0; } else queue = batch.concat(queue);
    } finally { sending = false; }
    if (J.store) J.store.flushPending();
  };

  T.begin = function () {
    if (running || !T.enabled()) return;
    running = true; sessionId = uuid(); startedAt = Date.now(); active = 0; lastTouch = Date.now(); fails = 0;
    const w = window.innerWidth;
    J.track("session_start", {
      device: w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop", viewport_w: w, entry,
      local_hour: new Date().getHours(), timers_on: !!hooks.timersOn()
    });
    ticker = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastTouch < IDLE_MS) active += 1;
    }, 1000);
    flusher = setInterval(T.flush, FLUSH_MS);
  };

  function endPayload() { return { active_s: Math.round(active), total_s: Math.round((Date.now() - startedAt) / 1000) }; }

  /* Sign out or withdraw consent. */
  T.stop = async function (send) {
    if (!running) return;
    if (send) { J.track("session_end", endPayload()); await T.flush(); }
    running = false; queue = []; clearInterval(ticker); clearInterval(flusher);
  };

  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => document.addEventListener(ev, touch, { passive: true, capture: true }));

  document.addEventListener("visibilitychange", () => {
    if (!running) return;
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); T.flush(); return; }
    const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
    hiddenAt = null;
    touch();
    const level = hooks.level();
    if (level && away > HIDDEN_MIN_S) J.track("tab_hidden", { level_id: level, hidden_s: Math.round(away) });
  });

  window.addEventListener("pagehide", () => {
    if (!running || !T.enabled()) return;
    J.track("session_end", endPayload());
    const batch = queue.splice(0, queue.length);
    J.remote.beacon(batch);
  });
})();
