/* ==========================================================================
   Copy limit and paste log. Only active while a level is open.
   - Copying text you typed yourself (inside a text box) never counts, and
     neither do the app's own Copy buttons (marked data-copy-ok).
   - The first `copyAllowance` copies in a level are allowed with a reminder;
     after that copying is blocked. Every attempt is counted per level.
   - Pastes into answer boxes are logged as a length, never the content, and
     blocked only if config.blockPasteInAnswers is true.
   It is a nudge, not a lock: it can't stop screenshots or retyping.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = J.util, h = U.h;
  const G = (J.guard = {});
  let hooks = { level: () => null, toast: () => {} };
  let modal = null;

  /* app.js passes in how to find the open level and how to show a toast. */
  G.init = function (opts) { hooks = Object.assign(hooks, opts); };

  const rec = function () {
    const st = J.store && J.store.state;
    if (!st) return null;
    st.guard = st.guard || { copies: {}, pastes: {} };
    return st.guard;
  };
  const isField = (el) => !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT" || el.isContentEditable);
  const track = (type, payload) => { try { J.track && J.track(type, payload); } catch (e) {} };

  function showModal() {
    if (modal) return;
    const prev = document.activeElement;
    const ok = h("button", { type: "button", class: "btn primary" }, "OK");
    const close = () => { if (!modal) return; document.removeEventListener("keydown", onKey, true); modal.remove(); modal = null; try { prev && prev.focus && prev.focus(); } catch (e) {} };
    const onKey = (e) => { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); close(); } };
    ok.addEventListener("click", close);
    modal = h("div", { class: "modal-overlay" },
      h("div", { class: "modal", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "modal-title", "aria-describedby": "modal-text" },
        h("h2", { id: "modal-title" }, "Copying is switched off"),
        h("p", { id: "modal-text" }, "The point of JUDGE Arena is to practise your own judgement, so the whole task should be done here. Your progress is saved."),
        h("div", { class: "row-end" }, ok)));
    document.body.appendChild(modal);
    document.addEventListener("keydown", onKey, true);
    ok.focus();
  }

  function onCopy(e) {
    const level = hooks.level();
    if (!level || !(J.store && J.store.state)) return;
    const active = document.activeElement;
    if (isField(active)) return; /* text the player typed */
    const target = e.target && e.target.closest ? e.target : active;
    if ((target && target.closest && target.closest("[data-copy-ok]")) || (active && active.closest && active.closest("[data-copy-ok]"))) return;
    const sel = window.getSelection && window.getSelection();
    if (!sel || !String(sel).length) return; /* nothing was selected, nothing is copied */

    const g = rec();
    const allowance = typeof J.config.copyAllowance === "number" ? J.config.copyAllowance : 2;
    const r = (g.copies[level] = g.copies[level] || { allowed: 0, blocked: 0 });
    if (r.allowed < allowance) {
      r.allowed++;
      hooks.toast("Copy " + r.allowed + " of " + allowance + ".", "JUDGE Arena is designed to be done here, without outside tools.");
      track("copy_attempt", { level_id: level, allowed: true, count_so_far: r.allowed + r.blocked });
    } else {
      e.preventDefault();
      r.blocked++;
      if (r.blocked === 1) showModal();
      track("copy_attempt", { level_id: level, allowed: false, count_so_far: r.allowed + r.blocked });
    }
    J.store.save();
  }

  function onPaste(e) {
    const level = hooks.level();
    const t = e.target;
    if (!level || !(J.store && J.store.state) || !t || !t.closest || !t.closest(".level-root")) return;
    if (!(t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (!t.type || t.type === "text")))) return;
    const g = rec();
    let chars = 0;
    try { chars = ((e.clipboardData || window.clipboardData).getData("text") || "").length; } catch (err) {}
    const blocked = !!J.config.blockPasteInAnswers;
    if (blocked) { e.preventDefault(); hooks.toast("Pasting is switched off here — type your own answer."); }
    const r = (g.pastes[level] = g.pastes[level] || { count: 0, chars: 0, blocked: 0 });
    r.count++; r.chars += chars; if (blocked) r.blocked++;
    track("paste", { level_id: level, chars, blocked });
    J.store.save();
  }

  document.addEventListener("copy", onCopy, true);
  document.addEventListener("cut", onCopy, true);
  document.addEventListener("paste", onPaste, true);
})();
