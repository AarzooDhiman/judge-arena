/* ==========================================================================
   Small helpers shared by every screen and level.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = (J.util = {});

  /* Build DOM: h('div', {class:'x', onClick: fn}, child, 'text', [more]) */
  U.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k === "dataset") Object.assign(el.dataset, v);
        else if (k === "value") el.value = v;
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      }
    }
    U.append(el, kids);
    return el;
  };
  U.append = function (el, kids) {
    for (const k of [kids].flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  };
  U.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  /* ---- text measurement ---- */
  U.words = (t) => (t || "").trim().split(/\s+/).filter(Boolean);
  U.wordCount = (t) => U.words(t).length;
  U.numbersIn = (t) => ((t || "").match(/\d+(?:[.,]\d+)*%?/g) || []);
  U.syllables = function (word) {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const m = word.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  };
  /* Flesch reading ease: higher = easier. 60+ is plain English. */
  U.flesch = function (t) {
    const w = U.words(t);
    if (!w.length) return null;
    const sentences = Math.max(1, ((t || "").match(/[.!?]+(\s|$)/g) || []).length);
    const syl = w.reduce((s, x) => s + U.syllables(x), 0);
    return Math.round(206.835 - 1.015 * (w.length / sentences) - 84.6 * (syl / w.length));
  };
  U.reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /* find which listed words / phrases occur (whole words, case-insensitive) */
  U.findTerms = function (text, terms, allowPlural) {
    const found = [];
    for (const t of terms) {
      const re = new RegExp("(^|[^a-z0-9-])" + U.reEscape(t.toLowerCase()) + (allowPlural ? "s?" : "") + "(?=$|[^a-z0-9-])", "i");
      if (re.test(text)) found.push(t);
    }
    return found;
  };
  U.containsAny = (text, list) => list.some((x) => (text || "").toLowerCase().includes(x.toLowerCase()));

  /* ---- hashing (NOT security — just stops casual nickname collisions on a shared device) ---- */
  U.hash = function (s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  };

  /* ---- safe storage ---- */
  U.lsGet = function (k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  U.lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  U.lsDel = function (k) { try { localStorage.removeItem(k); } catch (e) {} };
  U.lsKeys = function (prefix) { try { return Object.keys(localStorage).filter((k) => k.startsWith(prefix)); } catch (e) { return []; } };

  /* ---- environment ---- */
  U.framed = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  U.reduceMotion = (function () { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

  /* ---- countdown: calls onTick(remainingSeconds) and onDone() ---- */
  U.countdown = function (seconds, onTick, onDone) {
    const end = Date.now() + seconds * 1000;
    let stopped = false;
    onTick(seconds);
    const id = setInterval(() => {
      if (stopped) return;
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      onTick(left);
      if (left <= 0) { clearInterval(id); stopped = true; onDone && onDone(); }
    }, 200);
    return { stop() { stopped = true; clearInterval(id); } };
  };

  /* ---- clipboard / file ---- */
  U.copy = async function (text, fallbackEl) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      if (fallbackEl) { fallbackEl.hidden = false; fallbackEl.value = text; fallbackEl.focus(); fallbackEl.select(); }
      return false;
    }
  };
  U.download = function (filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  U.pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  U.clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
})();
