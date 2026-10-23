/* ==========================================================================
   Level engines. Each engine draws one level type into `root` and calls
   ctx.finish({score, max, summary, lesson}) when the player is done.

   ctx = { finish, award(badgeId), bet(p, correct), log(lines), timers, levelId }
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const U = J.util, R = J.render, h = U.h;
  const E = (J.engines = {});
  const C = (J.ui = {});

  /* ---------------- shared components ---------------- */
  C.btn = (label, onClick, cls, attrs) => h("button", Object.assign({ type: "button", class: "btn " + (cls || "primary"), onClick }, attrs || {}), label);
  C.progress = (i, n, label) => h("div", { class: "progress" },
    h("div", { class: "progress-text" }, (label || "Item") + " " + (i + 1) + " of " + n),
    h("div", { class: "progress-bar" }, h("span", { style: { width: (100 * i) / n + "%" } })));
  C.seg = function (options, onChange, name, cls) {
    const wrap = h("div", { class: "seg " + (cls || ""), role: "group", "aria-label": name || "" });
    options.forEach(([val, label]) => {
      const b = h("button", { type: "button", "aria-pressed": "false" }, label);
      b.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        onChange(val);
      });
      wrap.appendChild(b);
    });
    return wrap;
  };
  C.scale5 = (name, onChange) => h("div", { class: "scale-wrap" },
    C.seg([1, 2, 3, 4, 5].map((v) => [v, String(v)]), onChange, name, "scale"),
    h("div", { class: "scale-ends" }, h("span", null, "Poor"), h("span", null, "Excellent")));
  C.confidence = (onChange) => C.seg([[1, "Unsure"], [2, "Fairly sure"], [3, "Certain"]], onChange, "How sure are you?", "chips");
  C.CONF_P = { 1: 0.5, 2: 0.7, 3: 0.9 };
  C.pts = (n) => h("span", { class: "pts " + (n > 0 ? "plus" : n < 0 ? "minus" : "zero") }, (n > 0 ? "+" : "") + n);
  C.list = (items, cls) => h("ul", { class: cls || "list" }, items.map((x) => h("li", null, x)));
  C.step = (n, text) => h("h3", { class: "step-h" }, h("span", { class: "step-n" }, n), text);
  C.tag = (text, cls) => h("span", { class: "tag " + (cls || "") }, text);
  C.textarea = (id, placeholder, rows, value) => h("textarea", { id, placeholder: placeholder || "", rows: rows || 4, value: value || "" });
  C.field = (label, control, hint) => h("label", { class: "field" }, h("span", { class: "field-label" }, label, hint ? h("span", { class: "hint" }, hint) : null), control);
  C.meter = (label) => {
    const val = h("span", { class: "meter-val" }, "—");
    const el = h("div", { class: "meter" }, h("span", { class: "meter-dot" }), h("span", { class: "meter-label" }, label), val);
    return { el, set(text, state) { val.textContent = text; el.dataset.state = state; } };
  };
  C.timer = function (seconds, onDone, quiet) {
    const fill = h("span");
    const txt = h("span", { class: "timer-txt" }, seconds + "s");
    const el = h("div", { class: "timer" + (quiet ? " quiet" : "") }, h("div", { class: "timer-bar" }, fill), txt);
    let t = null;
    return {
      el,
      start() {
        t = U.countdown(seconds, (left) => {
          txt.textContent = left > 0 ? left + "s" : "Time";
          fill.style.width = (100 * left) / seconds + "%";
          el.dataset.low = left <= Math.min(10, seconds / 4) ? "1" : "";
        }, onDone);
      },
      stop() { t && t.stop(); }
    };
  };
  C.reveal = (title, ...kids) => h("div", { class: "reveal" }, h("div", { class: "reveal-title" }, title), kids);
  C.projectTag = (p) => (p ? C.tag(p, "project") : null);
  C.lesson = (text) => (text ? h("div", { class: "lesson" }, h("strong", null, "Takeaway"), " ", text) : null);
  C.scrollTop = (root) => { try { root.scrollIntoView({ block: "start", behavior: U.reduceMotion ? "auto" : "smooth" }); } catch (e) {} };

  /* Run a list of items one at a time, collecting score. */
  function sequence(root, items, showFn, endFn) {
    let i = 0, score = 0, max = 0;
    const api = {
      add(s, m) { score += s; max += m; },
      next() { i++; if (i < items.length) { U.clear(root); showFn(items[i], i, api); C.scrollTop(root); } else endFn(score, max); },
      get i() { return i; }
    };
    U.clear(root);
    showFn(items[0], 0, api);
    return api;
  }

  /* ======================= WORLD 1 ======================= */

  E.rate = function (root, L, ctx) {
    const byOrigin = {};
    let originRight = 0;
    sequence(root, L.items, (it, i, seq) => {
      const ans = { crit: {}, origin: null, chips: 0 };
      const lock = C.btn("Lock in my judgement", reveal, "primary", { disabled: true });
      const check = () => { lock.disabled = !(L.criteria.every((c) => ans.crit[c.id]) && ans.origin && ans.chips); };
      const panel = h("div", { class: "controls" },
        C.step(1, "Rate the quality"),
        L.criteria.map((c) => C.field(c.label, C.scale5(c.label, (v) => { ans.crit[c.id] = v; check(); }), c.hint)),
        C.step(2, "Where did it come from?"),
        C.seg([["ai", "AI"], ["human", "Human"], ["ai-assisted", "AI-assisted"]], (v) => { ans.origin = v; check(); }, "Origin", "origin"),
        C.step(3, "Bet on your guess"),
        C.confidence((v) => { ans.chips = v; check(); }),
        h("p", { class: "hint" }, "Right and certain earns most. Wrong and certain costs most."),
        lock);
      root.append(C.progress(i, L.items.length, "Artefact"),
        h("div", { class: "split" },
          h("div", { class: "artefact-col" }, h("div", { class: "artefact-head" }, C.tag(R.kindLabel[it.kind]), C.projectTag(it.project), h("span", { class: "artefact-label" }, it.label)), R.artefact(it)),
          panel));

      function reveal() {
        let pts = 0;
        const rows = L.criteria.map((c) => {
          const y = ans.crit[c.id], e = it.expert[c.id], d = Math.abs(y - e), p = d === 0 ? 4 : d === 1 ? 2 : 0;
          pts += p;
          return h("tr", null, h("td", null, c.label), h("td", { class: "num" }, y), h("td", { class: "num" }, e), h("td", { class: "num" }, C.pts(p)));
        });
        const right = ans.origin === it.origin;
        if (right) originRight++;
        const op = right ? 2 * ans.chips : -ans.chips;
        pts += op;
        ctx.bet(C.CONF_P[ans.chips], right);
        const mine = L.criteria.reduce((s, c) => s + ans.crit[c.id], 0) / L.criteria.length;
        const exp = L.criteria.reduce((s, c) => s + it.expert[c.id], 0) / L.criteria.length;
        (byOrigin[it.origin] = byOrigin[it.origin] || []).push([mine, exp]);
        seq.add(Math.max(0, pts), L.criteria.length * 4 + 6);
        U.clear(panel);
        panel.append(
          C.reveal("Quality: you vs examiner",
            h("div", { class: "table-wrap" }, h("table", { class: "mini" }, h("thead", null, h("tr", null, h("th", null, ""), h("th", null, "You"), h("th", null, "Examiner"), h("th", null, "Points"))), h("tbody", null, rows)))),
          C.reveal("Origin",
            h("p", { class: "origin-line" }, "It was ", h("strong", { class: "origin-badge o-" + it.origin }, R.originLabel[it.origin]), ". You said ", R.originLabel[ans.origin], " (", ["", "unsure", "fairly sure", "certain"][ans.chips], ") ", C.pts(op))),
          h("div", { class: "proscons" },
            h("div", null, h("div", { class: "pc-h good" }, "What works"), C.list(it.pros)),
            h("div", null, h("div", { class: "pc-h bad" }, "What doesn't"), C.list(it.cons))),
          h("div", { class: "row-end" }, h("span", { class: "sum" }, "This artefact: ", C.pts(Math.max(0, pts))), C.btn(i + 1 < L.items.length ? "Next artefact" : "See my results", seq.next)));
      }
    }, (score, max) => {
      const lines = Object.entries(byOrigin).map(([o, arr]) => {
        const m = arr.reduce((s, x) => s + x[0], 0) / arr.length, e = arr.reduce((s, x) => s + x[1], 0) / arr.length;
        return R.originLabel[o] + " examples: you rated them " + m.toFixed(1) + "/5 on average; the examiner, " + e.toFixed(1) + "/5.";
      });
      ctx.log([L.title + ": guessed origin right on " + originRight + "/" + L.items.length + "; quality ratings within one point of the examiner on most criteria."]);
      ctx.finish({
        score, max,
        summary: ["You named the origin correctly " + originRight + " times out of " + L.items.length + "."].concat(lines),
        lesson: "Origin told you very little about quality. There was excellent AI work and weak human work. The skill that matters is judging the work in front of you — not guessing where it came from."
      });
    });
  };

  E.duel = function (root, L, ctx) {
    let right = 0;
    sequence(root, L.duels, (d, i, seq) => {
      const ans = { pick: null, reason: null, chips: 0 };
      const lock = C.btn("Lock in", reveal, "primary", { disabled: true });
      const check = () => { lock.disabled = !(ans.pick && ans.reason && ans.chips); };
      const side = (key, x) => h("div", { class: "duel-side", dataset: { side: key } },
        h("div", { class: "duel-label" }, key.toUpperCase()),
        x.kind === "slide" ? R.slide(x.content, { small: true }) : x.kind === "code" ? R.code(x.content) : h("div", { class: "doc" }, h("p", null, x.content)));
      const sides = h("div", { class: "duel" }, side("a", d.a), side("b", d.b));
      const reasonSel = h("select", { id: L.id + "-" + d.id + "-reason" }, h("option", { value: "" }, "Choose the main reason…"), L.reasons.map((r) => h("option", { value: r.id }, r.label)));
      reasonSel.addEventListener("change", () => { ans.reason = reasonSel.value || null; check(); });
      const panel = h("div", { class: "controls wide" },
        h("div", { class: "control-row" },
          C.field("Which is better?", C.seg([["a", "A is better"], ["b", "B is better"]], (v) => { ans.pick = v; check(); }, "Pick", "pick")),
          C.field("Main reason", reasonSel),
          C.field("How sure?", C.confidence((v) => { ans.chips = v; check(); }))),
        lock);
      root.append(C.progress(i, L.duels.length, "Duel"), h("p", { class: "prompt" }, d.prompt), sides, panel);

      function reveal() {
        const ok = ans.pick === d.better, rOk = ans.reason === d.reason;
        if (ok) right++;
        ctx.bet(C.CONF_P[ans.chips], ok);
        let pts = (ok ? 6 : 0) + (ok && rOk ? 4 : 0) + (ok ? ans.chips : -ans.chips);
        pts = Math.max(0, pts);
        seq.add(pts, 13);
        sides.querySelector('[data-side="' + d.better + '"]').classList.add("winner");
        sides.querySelectorAll(".duel-side").forEach((s) => {
          const o = d[s.dataset.side].origin;
          s.querySelector(".duel-label").append(" ", h("span", { class: "origin-badge o-" + o }, R.originLabel[o]));
        });
        const reasonLabel = L.reasons.find((r) => r.id === d.reason).label;
        U.clear(panel);
        panel.append(C.reveal(ok ? "Yes — " + d.better.toUpperCase() + " is better" : "Not this time — " + d.better.toUpperCase() + " is better",
          h("p", null, h("strong", null, "Main reason: "), reasonLabel, rOk && ok ? " (you got the reason too)" : ""),
          h("p", null, d.why)),
          h("div", { class: "row-end" }, h("span", { class: "sum" }, "This duel: ", C.pts(pts)), C.btn(i + 1 < L.duels.length ? "Next duel" : "See my results", seq.next)));
      }
    }, (score, max) => {
      ctx.log([L.title + ": picked the stronger version in " + right + "/" + L.duels.length + " duels."]);
      ctx.finish({ score, max, summary: ["You picked the stronger version " + right + " times out of " + L.duels.length + ". Look at the origin labels: the better version was sometimes AI, sometimes human."], lesson: "Good work states its point, fits its own project, and stays consistent. None of those depend on who — or what — wrote it." });
    });
  };

  /* ======================= WORLD 2 ======================= */

  E.hunt = function (root, L, ctx) {
    const types = !L.flawTypes || L.flawTypes === "default" ? J.FLAW_TYPES : L.flawTypes;
    const typeLabel = (id) => (types.find((t) => t.id === id) || {}).label || id;
    const flags = {};
    const segEls = {};
    let active = null;

    const counter = h("span", { class: "flag-count" }, "0 flags");
    const submit = C.btn("Submit my flags", evaluate);
    const sheetText = h("p", { class: "sheet-text" });
    const sheetTypes = h("div", { class: "sheet-types" });
    const removeBtn = C.btn("Remove flag", () => { delete flags[active]; paint(active); close(); }, "ghost small");
    const sheet = h("div", { class: "sheet", hidden: true, role: "dialog", "aria-label": "Choose the problem" },
      h("div", { class: "sheet-inner" },
        h("div", { class: "sheet-head" }, h("strong", null, "What's wrong here?"), C.btn("Cancel", () => close(), "ghost small")),
        sheetText, sheetTypes, removeBtn));

    function open(id, text) {
      active = id;
      sheetText.textContent = text.trim() ? "“" + text.trim() + "”" : "(blank line)";
      U.clear(sheetTypes);
      types.forEach((t) => sheetTypes.appendChild(h("button", { type: "button", class: "type-btn" + (flags[id] === t.id ? " on" : ""), onClick: () => { flags[id] = t.id; paint(id); close(); } }, t.label)));
      removeBtn.hidden = !flags[id];
      sheet.hidden = false;
      const first = sheetTypes.querySelector("button");
      first && first.focus();
    }
    const segText = (id) => { const el = segEls[id]; if (!el) return ""; const c = el.querySelector("code"); return (c ? c.textContent : el.firstChild.textContent).trim(); };
    function close() { sheet.hidden = true; const el = segEls[active]; active = null; el && el.focus(); }
    function paint(id) {
      const el = segEls[id];
      el.classList.toggle("flagged", !!flags[id]);
      const old = el.querySelector(".flag-tag");
      old && old.remove();
      if (flags[id]) el.appendChild(h("span", { class: "flag-tag" }, typeLabel(flags[id])));
      const n = Object.keys(flags).length;
      counter.textContent = n + (n === 1 ? " flag" : " flags");
    }

    const panels = L.panels.map((p) => {
      let body;
      if (!p.flaggable) {
        body = p.kind === "output" ? h("pre", { class: "output" }, p.text) : h("div", { class: "doc small" }, p.text.split("\n\n").map((x) => h("p", null, x)));
      } else if (p.kind === "code") {
        body = h("div", { class: "code-lines" }, p.segments.map((s, n) => {
          const b = h("button", { type: "button", class: "hseg code-line", dataset: { id: s.id } }, h("span", { class: "ln" }, n + 1), h("code", { html: R.highlight(s.text) || "&nbsp;" }));
          b.addEventListener("click", () => open(s.id, s.text));
          segEls[s.id] = b;
          return b;
        }));
      } else {
        body = h("div", { class: "doc flow" }, h("p", null, p.segments.map((s) => {
          const b = h("button", { type: "button", class: "hseg sentence", dataset: { id: s.id } }, s.text);
          b.addEventListener("click", () => open(s.id, s.text));
          segEls[s.id] = b;
          return [b, " "];
        })));
      }
      return h("section", { class: "panel panel-" + p.kind }, h("div", { class: "panel-title" }, p.title, p.flaggable ? C.tag("click to flag", "hint-tag") : null), body);
    });

    U.clear(root);
    root.append(
      h("div", { class: "brief" }, C.projectTag(L.project), h("p", null, L.brief), h("p", { class: "brief-count" }, h("strong", null, L.flaws.length + " problems"), " are hidden in here. Every false flag costs 4 points.")),
      h("div", { class: "hunt-grid" + (L.variant === "context" ? " context" : "") }, panels),
      h("div", { class: "actionbar" }, counter, submit),
      sheet);

    function evaluate() {
      const segToFlaw = {};
      L.flaws.forEach((f) => f.segs.forEach((s) => (segToFlaw[s] = f)));
      let score = 0, found = 0, typeRight = 0, falseFlags = 0;
      const results = L.flaws.map((f) => {
        const flagged = f.segs.filter((s) => flags[s]);
        const hit = flagged.length > 0;
        const tRight = hit && flagged.some((s) => flags[s] === f.type);
        if (hit) { found++; score += 10; }
        if (tRight) { typeRight++; score += 4; }
        return { f, hit, tRight, yourType: hit ? flags[flagged[0]] : null };
      });
      const falseList = Object.keys(flags).filter((s) => !segToFlaw[s]);
      falseFlags = falseList.length;
      score = Math.max(0, score - 4 * falseFlags);
      const max = 14 * L.flaws.length;

      Object.entries(segEls).forEach(([id, el]) => {
        el.disabled = true;
        if (segToFlaw[id]) el.classList.add(flags[id] ? "is-hit" : "is-missed");
        else if (flags[id]) el.classList.add("is-false");
      });
      sheet.hidden = true;

      const perfect = found === L.flaws.length && falseFlags === 0;
      if (perfect) ctx.award(L.variant === "context" ? "context-detective" : "sharp-eye");
      ctx.log([L.title + ": found " + found + "/" + L.flaws.length + " problems (" + typeRight + " correctly named), " + falseFlags + " false flag" + (falseFlags === 1 ? "" : "s") + ".",
        "Problems I now check for: " + Array.from(new Set(results.filter((r) => r.hit).map((r) => typeLabel(r.f.type)))).join("; ") + "."]);

      const bar = root.querySelector(".actionbar");
      U.clear(bar);
      const out = h("div", { class: "hunt-results" },
        h("div", { class: "score-strip" },
          h("div", null, h("b", null, found + "/" + L.flaws.length), " found"),
          h("div", null, h("b", null, typeRight), " named correctly"),
          h("div", null, h("b", null, falseFlags), " false flag" + (falseFlags === 1 ? "" : "s"))),
        h("div", { class: "legend" }, h("span", { class: "lg hit" }, "Found"), h("span", { class: "lg missed" }, "Missed"), h("span", { class: "lg false" }, "False flag")),
        results.map((r) => h("div", { class: "flaw-card " + (r.hit ? "hit" : "missed") },
          h("div", { class: "flaw-head" }, h("span", { class: "flaw-status" }, r.hit ? "Found" : "Missed"), h("strong", null, typeLabel(r.f.type)),
            r.hit && !r.tRight ? h("span", { class: "hint" }, "You called it: " + typeLabel(r.yourType)) : null),
          h("p", { class: "flaw-quote" }, "“" + segText(r.f.segs[0]) + "”"),
          h("p", null, r.f.why))),
        falseList.length ? h("div", { class: "flaw-card false" }, h("div", { class: "flaw-head" }, h("span", { class: "flaw-status" }, "False flags"), h("strong", null, "These were fine")),
          C.list(falseList.map((s) => "“" + segText(s) + "”"))) : null,
        C.lesson(L.lesson),
        h("div", { class: "row-end" }, C.btn("Finish level", () => ctx.finish({
          score, max,
          summary: ["Found " + found + " of " + L.flaws.length + " problems; " + typeRight + " named correctly; " + falseFlags + " false flag" + (falseFlags === 1 ? "" : "s") + "."],
          lesson: L.lesson || "Every number traces to an output. Every citation says what you cite it for. Every claim stays inside the evidence."
        }))));
      bar.after(out);
      bar.remove();
      C.scrollTop(out);
    }
  };

  E.court = function (root, L, ctx) {
    const ans = {};
    const submit = C.btn("Deliver my verdicts", evaluate, "primary", { disabled: true });
    const check = () => { submit.disabled = !L.claims.every((c) => ans[c.id] && ans[c.id].verdict && (ans[c.id].verdict === "unsupported" || ans[c.id].cell)); };
    const cellOpts = L.cells.map((c) => [c.id, c.title]);
    const claimEls = L.claims.map((c, n) => {
      ans[c.id] = { verdict: null, cell: null };
      const sel = h("select", { id: L.id + "-" + c.id + "-cell" }, h("option", { value: "" }, "Which cell is the evidence?"), cellOpts.map(([id, t]) => h("option", { value: id }, t)));
      const evid = C.field("Evidence", sel);
      evid.hidden = true;
      sel.addEventListener("change", () => { ans[c.id].cell = sel.value || null; check(); });
      const card = h("div", { class: "claim", dataset: { id: c.id } },
        h("div", { class: "claim-text" }, h("span", { class: "claim-n" }, n + 1), "“" + c.text + "”"),
        C.seg([["supported", "Supported"], ["contradicted", "Contradicted"], ["unsupported", "No evidence"]], (v) => { ans[c.id].verdict = v; evid.hidden = v === "unsupported"; check(); }, "Verdict", "verdict"),
        evid);
      return card;
    });
    U.clear(root);
    root.append(
      h("div", { class: "brief" }, C.projectTag(L.project), h("p", null, L.brief)),
      h("div", { class: "court" },
        h("div", { class: "claims" }, claimEls),
        h("aside", { class: "cells" }, h("div", { class: "panel-title" }, "Notebook outputs"), L.cells.map((c) => h("div", { class: "cell" }, h("div", { class: "cell-title" }, c.title), h("pre", { class: "output" }, c.text))))),
      h("div", { class: "actionbar" }, h("span", { class: "hint" }, "Supported or contradicted needs a cell. 'No evidence' needs none."), submit));

    function evaluate() {
      let score = 0, right = 0;
      L.claims.forEach((c, n) => {
        const a = ans[c.id];
        let p = 0;
        if (a.verdict === c.verdict) { right++; p = c.verdict === "unsupported" ? 10 : 6 + (c.cells.includes(a.cell) ? 4 : 0); }
        score += p;
        const el = claimEls[n];
        el.querySelectorAll("button, select").forEach((x) => (x.disabled = true));
        el.classList.add(a.verdict === c.verdict ? "ok" : "no");
        const vLabel = { supported: "Supported", contradicted: "Contradicted", unsupported: "No evidence" };
        el.append(h("div", { class: "claim-reveal" }, h("strong", null, vLabel[c.verdict] + (c.cells.length ? " — " + c.cells.map((id) => L.cells.find((x) => x.id === id).title).join(" + ") : "")), " ", C.pts(p), h("p", null, c.why)));
      });
      const max = 10 * L.claims.length;
      ctx.log([L.title + ": " + right + "/" + L.claims.length + " verdicts right — checked every claim against a notebook cell."]);
      const bar = root.querySelector(".actionbar");
      U.clear(bar);
      bar.append(h("span", { class: "sum" }, right + "/" + L.claims.length + " verdicts right"), C.btn("Finish level", () => ctx.finish({
        score, max,
        summary: [right + " of " + L.claims.length + " verdicts were right."],
        lesson: "This is code–report alignment: every claim in your report should point to a cell that produced it. If there's no cell, it doesn't go in."
      })));
      C.scrollTop(root);
    }
  };

  /* ======================= WORLD 3 ======================= */

  E.diet = function (root, L, ctx) {
    let keptKeyAll = true;
    const headlines = [];
    sequence(root, L.slides, (s, i, seq) => {
      const kept = new Set();
      const keptTxt = h("span", { class: "kept-count" }, "Kept 0 of 3");
      const headline = h("input", { id: L.id + "-" + s.id + "-headline", type: "text", placeholder: "Write the slide title as the finding…", autocomplete: "off" });
      const mWords = C.meter("15 words or fewer"), mNums = C.meter("At most one number");
      const submit = C.btn("Serve the slide", reveal, "primary", { disabled: true });
      const update = () => {
        const w = U.wordCount(headline.value), n = U.numbersIn(headline.value).length;
        mWords.set(w + " words", !w ? "" : w <= 15 ? "ok" : "bad");
        mNums.set(n + (n === 1 ? " number" : " numbers"), !w ? "" : n <= 1 ? "ok" : "bad");
        submit.disabled = kept.size === 0 || w < 3;
      };
      headline.addEventListener("input", update);
      const slideEl = R.slide(s.slide, {
        tokens: true,
        onToken(id, b) {
          if (kept.has(id)) kept.delete(id);
          else if (kept.size < 3) kept.add(id);
          else { keptTxt.classList.add("shake"); setTimeout(() => keptTxt.classList.remove("shake"), 400); return; }
          b.setAttribute("aria-pressed", kept.has(id) ? "true" : "false");
          keptTxt.textContent = "Kept " + kept.size + " of 3";
          update();
        }
      });
      root.append(C.progress(i, L.slides.length, "Slide"),
        h("div", { class: "rq" }, h("span", { class: "rq-label" }, "Research question"), C.projectTag(s.project), h("p", null, s.question)),
        h("div", { class: "split diet" },
          h("div", { class: "artefact-col" }, h("p", { class: "hint" }, "Tap the numbers you'd keep. Everything else goes to the appendix."), slideEl),
          h("div", { class: "controls" }, C.step(1, "Keep at most three numbers"), keptTxt,
            C.step(2, "Rewrite the title as the finding"), headline, h("div", { class: "meters" }, mWords.el, mNums.el), submit)));
      update();

      function reveal() {
        let pts = 0;
        const top3 = Object.values(s.points).filter((v) => v > 0).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
        kept.forEach((id) => (pts += s.points[id] || 0));
        pts = Math.max(0, pts);
        const w = U.wordCount(headline.value), n = U.numbersIn(headline.value).length;
        const hp = (w <= 15 ? 5 : 0) + (n <= 1 ? 5 : 0);
        const total = pts + hp;
        if (!kept.has(s.key)) keptKeyAll = false;
        headlines.push("“" + headline.value.trim() + "” (" + s.project + ")");
        seq.add(total, top3 + 10);
        slideEl.querySelectorAll(".num-token").forEach((b) => {
          b.disabled = true;
          const v = s.points[b.dataset.id] || 0;
          if (b.dataset.id === s.key) b.classList.add("key");
          else if (v > 0) b.classList.add("good");
          else if (v < 0) b.classList.add("trap");
        });
        const ctrl = root.querySelector(".controls");
        U.clear(ctrl);
        ctrl.append(
          C.reveal(kept.has(s.key) ? "You kept the number that answers the question" : "You missed the number that answers the question",
            h("div", { class: "legend" }, h("span", { class: "lg key" }, "Answers the question"), h("span", { class: "lg good" }, "Useful support"), h("span", { class: "lg trap" }, "Trap or appendix")),
            h("p", null, s.why)),
          C.reveal("Your headline", h("p", { class: "quote" }, "“" + headline.value.trim() + "”"), h("p", { class: "hint" }, w + " words, " + n + " number" + (n === 1 ? "" : "s") + " ", C.pts(hp))),
          C.reveal("One way to write it", h("p", { class: "quote" }, "“" + s.modelHeadline + "”")),
          h("div", { class: "row-end" }, h("span", { class: "sum" }, "This slide: ", C.pts(total)), C.btn(i + 1 < L.slides.length ? "Next slide" : "See my results", seq.next)));
      }
    }, (score, max) => {
      if (keptKeyAll) ctx.award("three-numbers");
      ctx.log([L.title + ": cut crowded slides to three numbers and rewrote titles as findings.", "Headlines I wrote: " + headlines.join("; ")]);
      ctx.finish({ score, max, summary: ["Your headlines:"].concat(headlines), lesson: "Every number on a slide is a number you'll be tempted to read aloud. Keep the ones that answer the question; make the title say what they mean." });
    });
  };

  E.jargon = function (root, L, ctx) {
    let rewrites = [];
    sequence(root, L.paragraphs, (p, i, seq) => {
      const banned = J.BANNED_WORDS;
      const orig = h("div", { class: "doc jail" }, h("p", { html: markBanned(p.original, banned) }));
      const ta = C.textarea(L.id + "-" + p.id + "-rewrite", "", 8, p.original);
      const mW = C.meter("Words (target " + p.targetWords + ")"), mB = C.meter("Banned words"), mT = C.meter("One name for the thing"), mF = C.meter("Facts kept"), mR = C.meter("Readability");
      const bannedList = h("p", { class: "meter-detail" }), termList = h("p", { class: "meter-detail" });
      const factList = h("ul", { class: "facts" }, p.facts.map((f) => h("li", { dataset: { label: f.label } }, f.label)));
      const submit = C.btn("Submit my rewrite", reveal);
      function measure() {
        const t = ta.value;
        const w = U.wordCount(t);
        const b = U.findTerms(t, banned, false);
        const terms = U.findTerms(t, p.synonyms, true);
        const facts = p.facts.map((f) => U.containsAny(t, f.any));
        const fr = U.flesch(t);
        mW.set(w + " / " + p.targetWords, w <= p.targetWords ? "ok" : w <= p.targetWords * 1.25 ? "warn" : "bad");
        mB.set(b.length ? b.length + " found" : "none", b.length ? "bad" : "ok");
        bannedList.textContent = b.length ? "Still in: " + b.join(", ") : "";
        mT.set(terms.length + (terms.length === 1 ? " term" : " terms"), terms.length <= 1 ? "ok" : terms.length === 2 ? "warn" : "bad");
        termList.textContent = terms.length > 1 ? "You call it: " + terms.join(", ") + ". Pick one." : "";
        const kept = facts.filter(Boolean).length;
        mF.set(kept + " / " + p.facts.length, kept === p.facts.length ? "ok" : kept >= p.facts.length - 1 ? "warn" : "bad");
        factList.querySelectorAll("li").forEach((li, k) => li.classList.toggle("on", facts[k]));
        mR.set(fr == null ? "—" : fr + (fr >= 50 ? " (plain)" : fr >= 30 ? " (dense)" : " (very dense)"), fr == null ? "" : fr >= 50 ? "ok" : fr >= 30 ? "warn" : "bad");
        return { w, b, terms, kept, fr };
      }
      ta.addEventListener("input", measure);
      root.append(C.progress(i, L.paragraphs.length, "Paragraph"),
        h("div", { class: "split jargon" },
          h("div", { class: "artefact-col" }, h("div", { class: "artefact-head" }, C.tag("Original"), C.projectTag(p.project), h("span", { class: "artefact-label" }, p.label)), orig,
            h("p", { class: "hint" }, "Highlighted words are on the banned list. Rewrite it so a classmate could read it once and explain it back.")),
          h("div", { class: "controls" }, C.field("Your rewrite", ta), h("div", { class: "meters" }, mW.el, mB.el, mT.el, mF.el, mR.el), bannedList, termList,
            h("div", { class: "facts-wrap" }, h("span", { class: "field-label" }, "Facts you must keep"), factList), submit)));
      measure();

      function reveal() {
        const m = measure();
        const wp = m.w <= p.targetWords ? 25 : m.w <= p.targetWords * 1.25 ? 12 : 0;
        const bp = Math.max(0, 25 - 5 * m.b.length);
        const tp = m.terms.length <= 1 ? 20 : m.terms.length === 2 ? 10 : 0;
        const fp = Math.round((30 * m.kept) / p.facts.length);
        const total = wp + bp + tp + fp;
        if (total === 100) ctx.award("plain-speaker");
        rewrites.push(p.label + ": " + U.wordCount(p.original) + " → " + m.w + " words, " + m.kept + "/" + p.facts.length + " facts kept");
        seq.add(total, 100);
        ta.disabled = true;
        const ctrl = root.querySelector(".controls");
        submit.remove();
        ctrl.append(
          C.reveal("Score",
            h("div", { class: "table-wrap" }, h("table", { class: "mini" }, h("tbody", null,
              h("tr", null, h("td", null, "Length"), h("td", { class: "num" }, C.pts(wp))),
              h("tr", null, h("td", null, "Banned words"), h("td", { class: "num" }, C.pts(bp))),
              h("tr", null, h("td", null, "Consistent terms"), h("td", { class: "num" }, C.pts(tp))),
              h("tr", null, h("td", null, "Facts kept"), h("td", { class: "num" }, C.pts(fp))))))),
          C.reveal("One plain version", h("p", { class: "quote" }, p.model)),
          C.lesson(p.lesson),
          h("div", { class: "row-end" }, h("span", { class: "sum" }, "This paragraph: ", C.pts(total)), C.btn(i + 1 < L.paragraphs.length ? "Next paragraph" : "See my results", seq.next)));
      }
    }, (score, max) => {
      ctx.log([L.title + ": rewrote inflated paragraphs into plain, consistent English.", ...rewrites]);
      ctx.finish({ score, max, summary: rewrites, lesson: "Jargon isn't just hard to read. It's where unproven claims hide. When you cut it, check whether a claim went with it — and whether it deserved to." });
    });
  };
  function markBanned(text, banned) {
    let out = U.esc(text);
    banned.slice().sort((a, b) => b.length - a.length).forEach((w) => {
      out = out.replace(new RegExp("(^|[^a-z0-9>-])(" + U.reEscape(w) + ")(?=$|[^a-z0-9-])", "gi"), '$1<mark class="banned">$2</mark>');
    });
    return out;
  }

  E.flash = function (root, L, ctx) {
    const markers = ["so ", "so,", "which means", "this means", "that means", "because", "therefore", "shows", "matters", "the point", "which is why", "means", "the price", "the cost"];
    const notes = [];
    sequence(root, L.slides, (s, i, seq) => {
      const showFor = ctx.timers ? L.seconds : 30;
      const stage = h("div", { class: "flash-stage" });
      root.append(C.progress(i, L.slides.length, "Slide"),
        h("div", { class: "brief" }, C.projectTag(s.project), h("p", null, "You'll see a slide for ", h("strong", null, showFor + " seconds"), ". Then it disappears and you write what you'd SAY about it — as if you were presenting, with no notes.")),
        stage);
      stage.append(h("div", { class: "flash-ready" }, C.btn("Show me the slide", go)));

      function go() {
        U.clear(stage);
        const t = C.timer(showFor, hide);
        stage.append(t.el, R.slide(s.slide), h("div", { class: "row-end" }, C.btn("I've got it — hide it", () => { t.stop(); hide(); }, "ghost")));
        t.start();
      }
      function hide() {
        U.clear(stage);
        const ta = C.textarea(L.id + "-" + s.id + "-say", "What would you say to the room? Two to four sentences.", 6);
        const wt = C.timer(L.writeSeconds, null, !ctx.timers);
        stage.append(h("div", { class: "flash-hidden" }, h("p", { class: "flash-gone" }, "The slide is gone."), ctx.timers ? wt.el : null, C.field("What you'd say", ta), h("div", { class: "row-end" }, C.btn("Submit", () => { wt.stop(); score(ta.value); }))));
        if (ctx.timers) wt.start();
        ta.focus();
      }
      function score(text) {
        const nums = U.numbersIn(text).length, w = U.wordCount(text);
        const hasMarker = U.containsAny(text, markers), hasKey = U.containsAny(text, s.keywords);
        const p1 = nums <= 2 ? 10 : nums <= 4 ? 5 : 0, p2 = hasMarker ? 10 : 0, p3 = hasKey ? 10 : 0, p4 = w >= 20 && w <= 100 ? 10 : w >= 10 ? 5 : 0;
        const total = p1 + p2 + p3 + p4;
        seq.add(total, 40);
        notes.push(s.project + ": " + w + " words, " + nums + " numbers recited");
        U.clear(stage);
        stage.append(
          h("div", { class: "split" },
            h("div", { class: "artefact-col" }, h("p", { class: "hint" }, "Here's the slide again."), R.slide(s.slide, { small: true })),
            h("div", { class: "controls" },
              C.reveal("You said", h("p", { class: "quote" }, text.trim() ? "“" + text.trim() + "”" : "(nothing)")),
              h("div", { class: "table-wrap" }, h("table", { class: "mini" }, h("tbody", null,
                h("tr", null, h("td", null, "Numbers recited: " + nums + " (2 or fewer is best)"), h("td", { class: "num" }, C.pts(p1))),
                h("tr", null, h("td", null, "Said what it means (so, because, which means…)"), h("td", { class: "num" }, C.pts(p2))),
                h("tr", null, h("td", null, "Named the key idea"), h("td", { class: "num" }, C.pts(p3))),
                h("tr", null, h("td", null, "Length: " + w + " words (20–100)"), h("td", { class: "num" }, C.pts(p4)))))),
              C.reveal("One way to say it", h("p", { class: "quote" }, s.model)),
              C.lesson(s.lesson),
              h("div", { class: "row-end" }, h("span", { class: "sum" }, "This slide: ", C.pts(total)), C.btn(i + 1 < L.slides.length ? "Next slide" : "See my results", seq.next)))));
      }
    }, (score, max) => {
      ctx.log([L.title + ": explained slides from memory, focusing on meaning over numbers.", ...notes]);
      ctx.finish({ score, max, summary: notes, lesson: "In the viva the report isn't in front of you. If you can't say what a slide means after ten seconds, your audience can't either — and you'll end up reading it aloud." });
    });
  };

  /* ======================= WORLD 4 ======================= */

  E.whynot = function (root, L, ctx) {
    const kept = [];
    sequence(root, L.cases, (c, i, seq) => {
      const id = (k) => L.id + "-" + c.id + "-" + k;
      const alt1 = h("input", { id: id("alt1"), type: "text", placeholder: "e.g. logistic regression" }), why1 = C.textarea(id("why1"), "Why not? Use facts from the project.", 3);
      const alt2 = h("input", { id: id("alt2"), type: "text", placeholder: "e.g. a neural network" }), why2 = C.textarea(id("why2"), "Why not? Use facts from the project.", 3);
      const submit = C.btn("Defend it", evaluate, "primary", { disabled: true });
      const check = () => { submit.disabled = !(alt1.value.trim() && alt2.value.trim() && U.wordCount(why1.value) >= 5 && U.wordCount(why2.value) >= 5); };
      [alt1, why1, alt2, why2].forEach((x) => x.addEventListener("input", check));
      const form = h("div", { class: "controls" },
        C.step(1, "First alternative you rejected"), C.field("Alternative", alt1), C.field("Why not", why1),
        C.step(2, "Second alternative you rejected"), C.field("Alternative", alt2), C.field("Why not", why2), submit);
      root.append(C.progress(i, L.cases.length, "Decision"),
        h("div", { class: "split" },
          h("div", { class: "artefact-col" },
            h("div", { class: "decision" }, C.projectTag(c.project), h("p", { class: "decision-text" }, c.decision)),
            h("div", { class: "facts-card" }, h("div", { class: "panel-title" }, "What you know about this project"), C.list(c.facts)),
            h("p", { class: "hint" }, "An examiner will ask: why not something else? 'It's more accurate' or 'it's state-of-the-art' won't survive the next question.")),
          form));

      function evaluate() {
        const all = [why1.value, why2.value].join(" ");
        const hits = c.factKeys.filter((f) => U.containsAny(all, f.any));
        const generic = U.findTerms(all, J.GENERIC_PHRASES, false);
        const fp = Math.min(4, hits.length) * 8, gp = Math.max(-12, -4 * generic.length), fill = 10;
        [alt1, why1, alt2, why2].forEach((x) => (x.disabled = true));
        submit.remove();
        const self1 = h("input", { type: "checkbox", id: id("self1") }), self2 = h("input", { type: "checkbox", id: id("self2") });
        const finish = C.btn(i + 1 < L.cases.length ? "Next decision" : "See my results", () => {
          const sp = (self1.checked ? 4 : 0) + (self2.checked ? 4 : 0);
          const total = Math.max(0, fp + gp + fill + sp);
          seq.add(total, 50);
          kept.push(c.project + ": rejected " + alt1.value.trim() + " and " + alt2.value.trim() + " using " + hits.length + " project facts");
          seq.next();
        });
        form.append(
          C.reveal("Your reasoning used " + hits.length + " project fact" + (hits.length === 1 ? "" : "s"),
            hits.length ? C.list(hits.map((x) => x.label), "list ticks") : h("p", null, "None of the project's facts appeared in your reasons. Look at the list on the left — those are what make a reason specific."),
            generic.length ? h("p", { class: "warn-text" }, "Generic phrases spotted: " + generic.join(", ") + " ", C.pts(gp)) : null),
          C.reveal("A typical AI answer to the same question", h("p", { class: "quote ai" }, c.aiAnswer), h("p", { class: "hint" }, "Fluent. Plausible. Could be pasted into any project.")),
          C.reveal("What a strong answer sounds like", h("p", { class: "quote" }, c.expert)),
          C.reveal("Be honest with yourself",
            h("label", { class: "check" }, self1, " My reason for rejecting ", h("strong", null, alt1.value.trim()), " only makes sense for THIS project"),
            h("label", { class: "check" }, self2, " My reason for rejecting ", h("strong", null, alt2.value.trim()), " only makes sense for THIS project")),
          h("div", { class: "row-end" }, finish));
      }
    }, (score, max) => {
      ctx.log([L.title + ": defended model choices against alternatives using project-specific facts.", ...kept]);
      ctx.finish({ score, max, summary: kept, lesson: "A reason is specific if it would be wrong for a different project. 'XGBoost handles our 18% missing lab values' is specific. 'XGBoost is powerful' is not." });
    });
  };

  E.roulette = function (root, L, ctx) {
    const rounds = L.rounds || 3, secs = L.seconds || 60;
    let project = L.caseProject || null, partner = true, r = 0, score = 0;
    const faced = [];
    const pool = U.shuffle(J.VIVA_QUESTIONS);
    setup();

    function setup() {
      U.clear(root);
      if (L.caseProject) { start(); return; }
      const own = h("input", { id: L.id + "-own", type: "text", placeholder: "Your project's title" });
      const choices = Object.keys(J.CASE_SUMMARIES).filter((k) => k !== "Late or Not?");
      let pick = null;
      const go = C.btn("Start the viva", () => { project = pick === "own" ? own.value.trim() || "My project" : pick; start(); }, "primary", { disabled: true });
      const chk = () => { go.disabled = !pick || (pick === "own" && !own.value.trim()); };
      own.addEventListener("input", chk);
      root.append(h("div", { class: "brief" },
        h("p", null, "Work in pairs if you can. One of you answers out loud — no notes, no laptop, no report. The other listens and scores you on four things. Then swap."),
        C.step(1, "Which project are you defending?"),
        C.seg([["own", "My own project"]].concat(choices.map((k) => [k, k])), (v) => { pick = v; own.hidden = v !== "own"; chk(); }, "Project", "projects"),
        own,
        C.step(2, "How are you playing?"),
        C.seg([["pair", "With a partner"], ["solo", "On my own (self-score)"]], (v) => (partner = v === "pair"), "Mode", "mode"),
        h("div", { class: "row-end" }, go)));
      own.hidden = true;
    }
    function start() { r = 0; round(); }
    function round() {
      U.clear(root);
      const q = L.fixedQuestions ? L.fixedQuestions[r] : pool[r % pool.length];
      const wheel = h("div", { class: "wheel" }, h("span", { class: "wheel-tag" }, "?"), h("p", { class: "wheel-q" }, "Spin to get your question"));
      const summary = project && J.CASE_SUMMARIES[project] ? h("div", { class: "facts-card" }, h("div", { class: "panel-title" }, project), h("p", null, J.CASE_SUMMARIES[project]), h("p", { class: "hint" }, "Read this once, then put it away.")) : h("div", { class: "facts-card" }, h("div", { class: "panel-title" }, "Defending: " + project));
      const spin = C.btn("Spin", doSpin);
      root.append(C.progress(r, rounds, "Round"), summary, wheel, h("div", { class: "row-end" }, spin));
      function doSpin() {
        spin.remove();
        const qs = J.VIVA_QUESTIONS;
        let n = 0;
        const steps = U.reduceMotion ? 0 : 14;
        const tick = () => {
          if (n < steps) {
            const x = qs[Math.floor(Math.random() * qs.length)];
            wheel.querySelector(".wheel-q").textContent = x.q;
            wheel.querySelector(".wheel-tag").textContent = x.tag;
            n++;
            setTimeout(tick, 40 + n * 12);
          } else land();
        };
        wheel.classList.add("spinning");
        tick();
      }
      function land() {
        wheel.classList.remove("spinning");
        wheel.classList.add("landed");
        wheel.querySelector(".wheel-q").textContent = q.q;
        wheel.querySelector(".wheel-tag").textContent = q.tag;
        const t = C.timer(secs, null, !ctx.timers);
        const done = C.btn("Answer finished", () => { t.stop(); scoreIt(); });
        root.append(h("p", { class: "hint center" }, partner ? "Answerer: speak now. Partner: listen — don't help." : "Say your answer out loud. Really out loud."), ctx.timers ? t.el : null, h("div", { class: "row-end" }, done));
        if (ctx.timers) t.start();
      }
      function scoreIt() {
        U.clear(root);
        const boxes = J.VIVA_CHECKLIST.map((c) => { const b = h("input", { type: "checkbox", id: L.id + "-r" + r + "-" + c.id }); return { c, b }; });
        root.append(C.progress(r, rounds, "Round"),
          h("div", { class: "wheel landed small" }, h("span", { class: "wheel-tag" }, q.tag), h("p", { class: "wheel-q" }, q.q)),
          C.reveal(partner ? "Partner: tick what they did" : "Be honest: tick what you did", boxes.map(({ c, b }) => h("label", { class: "check" }, b, " ", c.label))),
          h("div", { class: "row-end" }, C.btn(r + 1 < rounds ? "Next round" : "Finish the viva", () => {
            const ticks = boxes.filter((x) => x.b.checked).length;
            score += ticks * 5;
            if (boxes.find((x) => x.c.id === "honest").b.checked) ctx.award("honest-idk");
            faced.push(q.q + " — " + ticks + "/4");
            r++;
            if (r < rounds) round(); else end();
          })));
      }
    }
    function end() {
      ctx.log([L.title + ": answered " + rounds + " viva questions out loud, without notes, on " + project + ".", ...faced]);
      ctx.finish({ score, max: rounds * 20, summary: faced, lesson: "Answer the question that was asked, make it about your project, and say what numbers mean. 'I'm not sure — here's how I'd check' is a strong answer, not a weak one." });
    }
  };

  /* ======================= WORLD 5 ======================= */

  E.thinkfirst = function (root, L, ctx) {
    const defended = [];
    let onlyTotal = 0;
    sequence(root, L.problems, (pb, i, seq) => {
      const id = (k) => L.id + "-" + pb.id + "-" + k;
      const head = h("div", { class: "decision" }, C.projectTag(pb.project), h("p", { class: "decision-text" }, pb.problem));
      const stage = h("div", { class: "stage" });
      root.append(C.progress(i, L.problems.length, "Problem"), head, stage);
      phase1();

      function phase1() {
        const ta = C.textarea(id("mine"), "Your approach. One idea per line.", 7);
        const t = C.timer(L.thinkSeconds, null, !ctx.timers);
        const lock = C.btn("Lock my answer", () => { t.stop(); phase2(ta.value); }, "primary", { disabled: true });
        ta.addEventListener("input", () => (lock.disabled = U.wordCount(ta.value) < 8));
        stage.append(C.step(1, "Before you see any AI answer: what would YOU do?"), h("p", { class: "hint" }, "No searching, no prompting. Your first thoughts are the point. Once locked, you can't edit them."), ctx.timers ? t.el : null, ta, h("div", { class: "row-end" }, lock));
        if (ctx.timers) t.start();
      }
      function phase2(mine) {
        U.clear(stage);
        const myPoints = mine.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map((x) => x.replace(/^[-*•\d.)\s]+/, "").trim()).filter((x) => U.wordCount(x) >= 3).slice(0, 8);
        const tags = {};
        const cont = C.btn("Next: compare with my ideas", () => phase3(myPoints, tags), "primary", { disabled: true });
        stage.append(
          h("div", { class: "locked" }, h("span", { class: "field-label" }, "Your locked answer"), C.list(myPoints.length ? myPoints : [mine.trim()])),
          C.step(2, "Here's what an AI suggested. Judge each point."),
          h("div", { class: "ai-points" }, pb.aiPoints.map((a) => h("div", { class: "ai-point" }, h("p", null, a.text),
            C.seg([["useful", "Useful"], ["generic", "Generic"], ["wrong", "Wrong here"]], (v) => { tags[a.id] = v; cont.disabled = Object.keys(tags).length < pb.aiPoints.length; }, "Judge", "tags")))),
          h("div", { class: "row-end" }, cont));
      }
      function phase3(myPoints, tags) {
        U.clear(stage);
        const marks = {};
        const items = myPoints.length ? myPoints : ["(your answer)"];
        const final = C.textarea(id("final"), "Your final decision, now you've seen both.", 3);
        const defend = h("input", { id: id("defend"), type: "text", placeholder: "One sentence you'd defend in a viva" });
        const done = C.btn("Submit", () => reveal(myPoints, tags, marks, final.value, defend.value), "primary", { disabled: true });
        const chk = () => { done.disabled = Object.keys(marks).length < items.length || U.wordCount(final.value) < 5 || U.wordCount(defend.value) < 5; };
        [final, defend].forEach((x) => x.addEventListener("input", chk));
        stage.append(
          C.step(3, "Your ideas: did the AI have them too?"),
          h("div", { class: "ai-points" }, items.map((p, k) => h("div", { class: "ai-point mine" }, h("p", null, p),
            C.seg([["both", "AI had this too"], ["only", "Only me"]], (v) => { marks[k] = v; chk(); }, "Compare", "tags")))),
          C.step(4, "Decide — and own it"),
          C.field("Final decision", final), C.field("The line you'd defend", defend), h("div", { class: "row-end" }, done));
      }
      function reveal(myPoints, tags, marks, final, defend) {
        U.clear(stage);
        let agree = 0;
        pb.aiPoints.forEach((a) => { if (tags[a.id] === a.tag) agree++; });
        const only = Object.values(marks).filter((v) => v === "only").length;
        onlyTotal += only;
        const total = agree * 4 + Math.min(16, only * 4) + (U.wordCount(defend) >= 10 ? 10 : 5);
        seq.add(total, 50);
        defended.push("“" + defend.trim() + "”");
        const label = { useful: "Useful", generic: "Generic", wrong: "Wrong here" };
        stage.append(
          C.reveal("How you judged the AI: " + agree + "/" + pb.aiPoints.length + " match the examiner",
            pb.aiPoints.map((a) => h("div", { class: "ai-point judged " + (tags[a.id] === a.tag ? "ok" : "no") },
              h("p", null, a.text), h("p", { class: "hint" }, h("strong", null, label[a.tag]), " — ", a.why, tags[a.id] !== a.tag ? " (you said " + label[tags[a.id]] + ")" : "")))),
          C.reveal("Ideas only you had: " + only, only ? h("p", null, "Those are the ideas worth putting in your report — they came from you, not from the average of the internet.") : h("p", null, "That's fine this time. Notice how close your first thoughts were to the AI's — and push one step further next time.")),
          C.reveal("Ideas people have had that the AI didn't suggest", C.list(pb.humanExamples)),
          h("div", { class: "row-end" }, h("span", { class: "sum" }, "This problem: ", C.pts(total)), C.btn(i + 1 < L.problems.length ? "Next problem" : "See my results", seq.next)));
        C.scrollTop(stage);
      }
    }, (score, max) => {
      if (onlyTotal >= 2) ctx.award("own-thinker");
      ctx.log([L.title + ": wrote my own approach before seeing AI suggestions; " + onlyTotal + " idea" + (onlyTotal === 1 ? "" : "s") + " the AI didn't have.", "Lines I'd defend: " + defended.join(" ")]);
      ctx.finish({ score, max, summary: ["Ideas only you had: " + onlyTotal].concat(defended.map((d) => "You'd defend: " + d)), lesson: "Think first, then prompt. Seeing the AI's answer first anchors you to it — you'll edit its ideas instead of having your own." });
    });
  };

  E.offmap = function (root, L, ctx) {
    const kept = [];
    let offMap = false;
    sequence(root, L.questions, (qn, i, seq) => {
      const id = (k) => L.id + "-" + qn.id + "-" + k;
      const tas = [0, 1, 2].map((k) => C.textarea(id("idea" + k), "Idea " + (k + 1) + (k ? " (optional)" : ""), 2));
      const go = C.btn("Reveal the AI answers", () => phase2(), "primary", { disabled: true });
      tas.forEach((t) => t.addEventListener("input", () => (go.disabled = !tas.some((x) => U.wordCount(x.value) >= 5))));
      root.append(C.progress(i, L.questions.length, "Question"),
        h("div", { class: "decision" }, C.projectTag(qn.project), h("p", { class: "decision-text" }, qn.question)),
        h("div", { class: "controls wide" }, C.step(1, "Your ideas — up to three"), h("p", { class: "hint" }, "Rare ideas score more. Obvious ones still score a little. Invalid ones score nothing — so make them good."), tas, h("div", { class: "row-end" }, go)));

      function phase2() {
        const ideas = tas.map((t) => t.value.trim()).filter((x) => U.wordCount(x) >= 5);
        tas.forEach((t) => (t.disabled = true));
        go.remove();
        const maxCount = Math.max(...qn.themes.map((t) => t.count));
        const table = h("div", { class: "themes" }, qn.themes.map((t) => h("div", { class: "theme" },
          h("span", { class: "theme-label" }, t.label),
          h("span", { class: "theme-bar" }, h("span", { style: { width: (100 * t.count) / maxCount + "%" } })),
          h("span", { class: "theme-n" }, t.count + "/" + qn.runs))));
        const rows = ideas.map((idea, k) => {
          const sel = h("select", { id: id("map" + k) }, h("option", { value: "" }, "Which AI answer is this closest to?"), qn.themes.map((t) => h("option", { value: t.id }, t.label)), h("option", { value: "none" }, "Not on the list"));
          const just = C.textarea(id("just" + k), "Why is this a valid, useful idea? (at least 12 words)", 2);
          const valid = h("input", { type: "checkbox", id: id("valid" + k) });
          const extra = h("div", { class: "offmap-extra" }, just, h("label", { class: "check" }, valid, " I'd stand behind this idea in front of the class"));
          extra.hidden = true;
          sel.addEventListener("change", () => (extra.hidden = sel.value !== "none"));
          return { idea, sel, just, valid, el: h("div", { class: "ai-point mine" }, h("p", null, idea), sel, extra) };
        });
        const score = C.btn("Score my ideas", () => {
          let pts = 0;
          const lines = rows.map((r) => {
            let p = 0, note;
            if (r.sel.value === "none") {
              const ok = U.wordCount(r.just.value) >= 12 && r.valid.checked;
              p = ok ? 10 : 0;
              note = ok ? "Off the map" : "Off the map, but not justified yet";
              if (ok) offMap = true;
            } else if (r.sel.value) {
              const t = qn.themes.find((x) => x.id === r.sel.value);
              p = Math.max(1, Math.round(10 * (1 - t.count / qn.runs)));
              note = "Matches “" + t.label + "” (" + t.count + "/" + qn.runs + " AI runs)";
            } else note = "Not matched";
            pts += p;
            kept.push("“" + r.idea + "” — " + note);
            return h("li", null, h("strong", null, r.idea), " — ", note, " ", C.pts(p));
          });
          pts = Math.min(30, pts);
          seq.add(pts, 30);
          score.remove();
          area.append(C.reveal("Your ideas", h("ul", { class: "list" }, lines)),
            h("p", { class: "hint" }, "In class, the room votes on whether off-the-map ideas really are valid. Be ready to explain yours."),
            h("div", { class: "row-end" }, h("span", { class: "sum" }, "This question: ", C.pts(pts)), C.btn(i + 1 < L.questions.length ? "Next question" : "See my results", seq.next)));
        }, "primary", { disabled: !rows.length });
        const area = h("div", { class: "controls wide" },
          C.step(2, "What AI usually says"), h("p", { class: "hint" }, L.runsNote), table,
          C.step(3, "Map each of your ideas"), rows.map((r) => r.el), h("div", { class: "row-end" }, score));
        root.append(area);
        C.scrollTop(area);
      }
    }, (score, max) => {
      if (offMap) ctx.award("off-the-map");
      ctx.log([L.title + ": generated my own ideas before seeing what AI typically suggests.", ...kept]);
      ctx.finish({ score, max, summary: kept, lesson: "The common answers are common because they're the average. They're often right — and they're what every other submission says. Marks above average come from the ideas off the map." });
    });
  };

  E.constraints = function (root, L, ctx) {
    const rounds = L.rounds || 2;
    let r = 0, score = 0;
    const log = [];
    const choices = ["My own project"].concat(Object.keys(J.CASE_SUMMARIES).filter((k) => k !== "Late or Not?"));
    round();

    function draw() {
      return { audience: U.shuffle(L.decks.audience)[0], format: U.shuffle(L.decks.format)[0], twist: U.shuffle(L.decks.twist)[0] };
    }
    function round() {
      U.clear(root);
      let hand = draw(), redraws = 1, project = null;
      const cardsEl = h("div", { class: "cards" });
      const paint = () => {
        U.clear(cardsEl);
        [["Audience", hand.audience], ["Format", hand.format.text], ["Twist", hand.twist]].forEach(([k, v], n) => {
          const card = h("div", { class: "card-draw", style: { animationDelay: n * 120 + "ms" } }, h("span", { class: "card-kind" }, k), h("p", null, v));
          cardsEl.appendChild(card);
        });
      };
      paint();
      const redraw = C.btn("Redraw (1 left)", () => { if (redraws-- > 0) { hand = draw(); paint(); redraw.disabled = true; redraw.textContent = "No redraws left"; check(); } }, "ghost small");
      const ta = C.textarea(L.id + "-r" + r + "-text", "Explain the project under these rules.", 6);
      const own = h("input", { type: "text", id: L.id + "-r" + r + "-own", placeholder: "Your project's title" });
      own.hidden = true;
      const fm = C.meter("Format rule");
      const submit = C.btn("Done", rubric, "primary", { disabled: true });
      const fmtOk = () => formatCheck(hand.format.check, ta.value);
      function check() {
        const ok = fmtOk();
        fm.set(hand.format.check ? (ok ? "met" : "not yet") : "you judge this one", hand.format.check ? (ok ? "ok" : "bad") : "");
        submit.disabled = !project || (project === "My own project" && !own.value.trim()) || U.wordCount(ta.value) < 8;
      }
      ta.addEventListener("input", check);
      own.addEventListener("input", check);
      root.append(C.progress(r, rounds, "Round"),
        h("div", { class: "brief" }, h("p", null, "Three cards set the rules. Explain a project to that audience, in that format, with that twist. No AI could have written your answer, because no AI drew your cards.")),
        cardsEl, h("div", { class: "row-end" }, redraw),
        h("div", { class: "controls wide" },
          C.field("Project", C.seg(choices.map((c) => [c, c]), (v) => { project = v; own.hidden = v !== "My own project"; check(); }, "Project", "projects")), own,
          C.field("Your explanation", ta), h("div", { class: "meters" }, fm.el), h("div", { class: "row-end" }, submit)));
      check();

      function rubric() {
        const ok = hand.format.check ? fmtOk() : true;
        ta.disabled = true;
        submit.remove();
        const boxes = L.rubric.map((x) => ({ x, b: h("input", { type: "checkbox", id: L.id + "-r" + r + "-" + x.id }) }));
        root.append(C.reveal(L.rubric.length ? "Check your own work (or swap with a partner)" : "", boxes.map(({ x, b }) => h("label", { class: "check" }, b, " ", x.label))),
          h("div", { class: "row-end" }, C.btn(r + 1 < rounds ? "Next round" : "See my results", () => {
            const pts = (ok ? 10 : 0) + boxes.filter((x) => x.b.checked).length * 5 + 5;
            score += pts;
            log.push(hand.audience + " / " + hand.format.text + " / " + hand.twist);
            r++;
            if (r < rounds) round(); else end();
          })));
      }
    }
    function end() {
      ctx.log([L.title + ": explained projects under random constraints:", ...log]);
      ctx.finish({ score, max: rounds * 30, summary: log, lesson: "Constraints force choices, and choices are where your understanding shows. If you can explain it with zero numbers to a 14-year-old, you can explain it to an examiner." });
    }
  };
  function formatCheck(kind, text) {
    const t = text.trim();
    if (!t) return false;
    if (kind === "nodigits") return !/\d/.test(t);
    if (kind === "max50") return U.wordCount(t) <= 50;
    if (kind === "threesteps") { const lines = t.split(/\n+/).filter((x) => /^\s*\d[.)]/.test(x)); return lines.length === 3; }
    if (kind === "questions") { const s = t.split(/(?<=[.!?])\s+/).filter(Boolean); return s.length > 0 && s.every((x) => x.trim().endsWith("?")); }
    return true;
  }

  /* ======================= RECORD & BOSS ======================= */

  J.RECORD_FIELDS = [
    { id: "project", label: "Which work is this record for?", hint: "Your own coursework, or the boss project", rows: 1 },
    { id: "delegated", label: "What I delegated to AI", hint: "Which tasks, and why those were safe to hand over" },
    { id: "kept", label: "What I kept human-led", hint: "Which decisions you made yourself, and why" },
    { id: "checked", label: "What I checked", hint: "Numbers against outputs? Citations against sources? How?" },
    { id: "changed", label: "What I changed", hint: "What you fixed or rejected in the AI's output" },
    { id: "defend", label: "What I would defend", hint: "The claim you'd stand behind in a viva, and the evidence for it" }
  ];

  J.recordText = function (st) {
    const rec = st.record || {};
    const lines = ["JUDGEMENT RECORD — " + (J.config.appName || "JUDGE Arena"), "Player: " + st.profile.nick + " (class " + st.profile.cls + ")", "Date: " + new Date().toLocaleDateString("en-GB"), ""];
    J.RECORD_FIELDS.forEach((f) => lines.push(f.label.toUpperCase(), (rec[f.id] || "—").trim(), ""));
    lines.push("EVIDENCE FROM PRACTICE");
    Object.values(st.evidence || {}).forEach((arr) => arr.forEach((l) => lines.push("• " + l)));
    return lines.join("\n");
  };

  /* Renders the judgement record form. opts.onDone(score, max) when used as a stage. */
  J.recordForm = function (root, opts) {
    opts = opts || {};
    const st = J.store.state;
    st.record = st.record || {};
    if (opts.defaultProject && !st.record.project) st.record.project = opts.defaultProject;
    const inputs = {};
    const ev = Object.values(st.evidence || {}).flat();
    const fallback = h("textarea", { class: "copy-fallback", rows: 8, readonly: true, hidden: true, "aria-label": "Record text to copy" });
    const status = h("span", { class: "hint", role: "status" });
    const save = () => { J.RECORD_FIELDS.forEach((f) => (st.record[f.id] = inputs[f.id].value)); J.store.save(); };
    U.clear(root);
    root.append(
      h("div", { class: "brief" }, h("p", null, "This is the one-page record you'll attach to coursework. It turns what you practised here into evidence: what you handed to AI, what you kept, what you checked, what you changed, and what you'd defend."),
        opts.stage ? h("p", { class: "hint" }, "Write it for 'Late or Not?' now — then do the same for your own project.") : null),
      h("div", { class: "record" },
        h("div", { class: "record-form" }, J.RECORD_FIELDS.map((f) => {
          const el = f.rows === 1 ? h("input", { type: "text", id: "rec-" + f.id, value: st.record[f.id] || "" }) : C.textarea("rec-" + f.id, "", 3, st.record[f.id] || "");
          el.addEventListener("input", () => { save(); status.textContent = "Saved on this device"; });
          inputs[f.id] = el;
          return C.field(f.label, el, f.hint);
        })),
        h("aside", { class: "record-evidence" }, h("div", { class: "panel-title" }, "Evidence from your practice"),
          ev.length ? C.list(ev, "list small") : h("p", { class: "hint" }, "Play some levels and your evidence collects here."))),
      h("div", { class: "actionbar" }, status,
        C.btn("Copy as text", async () => { save(); const ok = await U.copy(J.recordText(st), fallback); status.textContent = ok ? "Copied" : "Select the text below and copy it"; }, "ghost"),
        U.framed ? null : C.btn("Download .txt", () => { save(); U.download("judgement-record-" + st.profile.nick + ".txt", J.recordText(st)); }, "ghost"),
        U.framed ? null : C.btn("Print", () => { save(); window.print(); }, "ghost"),
        opts.onDone ? C.btn("Submit my record", () => {
          save();
          const filled = J.RECORD_FIELDS.filter((f) => U.wordCount(st.record[f.id]) >= (f.rows === 1 ? 1 : 10)).length;
          if (filled < J.RECORD_FIELDS.length) { status.textContent = "Each section needs at least 10 words (the first just needs a title). " + filled + "/" + J.RECORD_FIELDS.length + " done."; return; }
          opts.onDone(filled * 10, J.RECORD_FIELDS.length * 10);
        }) : null),
      fallback);
  };

  E.record = function (root, L, ctx) {
    J.recordForm(root, { stage: true, defaultProject: "Late or Not?", onDone: (s, m) => ctx.finish({ score: s, max: m, summary: ["Judgement record complete."] }) });
  };

  E.boss = function (root, L, ctx) {
    let k = 0, score = 0, max = 0;
    const summary = [];
    const pips = h("div", { class: "pips" }, L.stages.map((s, n) => h("span", { class: "pip", dataset: { n } }, s.title.replace(/^Stage \d+ — /, ""))));
    const stageRoot = h("div");
    U.clear(root);
    root.append(pips, stageRoot);
    run();
    function run() {
      pips.querySelectorAll(".pip").forEach((p, n) => { p.dataset.state = n < k ? "done" : n === k ? "now" : ""; });
      const st = L.stages[k];
      U.clear(stageRoot);
      stageRoot.append(h("h2", { class: "stage-title" }, st.title));
      const inner = h("div");
      stageRoot.append(inner);
      const sub = Object.assign({}, ctx, {
        finish(res) {
          score += res.score; max += res.max;
          summary.push(st.title + ": " + res.score + "/" + res.max);
          k++;
          if (k < L.stages.length) {
            U.clear(stageRoot);
            stageRoot.append(C.reveal(st.title + " complete", h("p", null, "Stage score: ", h("strong", null, res.score + " / " + res.max)), res.lesson ? h("p", { class: "hint" }, res.lesson) : null),
              h("div", { class: "row-end" }, C.btn("On to " + L.stages[k].title.replace(/^Stage \d+ — /, ""), run)));
            C.scrollTop(stageRoot);
          } else {
            ctx.award("name-on-it");
            ctx.finish({ score, max, summary, lesson: "You checked the evidence, cut the noise, said it plainly, defended it out loud and recorded your judgement. That's the whole standard — now do it on your own project." });
          }
        }
      });
      sub.log = (lines) => ctx.log(lines, st.id);
      E[st.type](inner, st, sub);
      C.scrollTop(stageRoot);
    }
  };
})();
