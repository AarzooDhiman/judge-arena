/* ==========================================================================
   Renderers for artefacts: report text, code, slides, charts.
   ========================================================================== */
(function () {
  const J = (window.JUDGE = window.JUDGE || {});
  const { h, esc } = J.util;
  const R = (J.render = {});

  R.highlight = function (code) {
    try {
      if (window.hljs && code.trim()) return window.hljs.highlight(code, { language: "python", ignoreIllegals: true }).value;
    } catch (e) {}
    return esc(code);
  };

  R.code = function (code) {
    const pre = h("pre", { class: "code" });
    pre.appendChild(h("code", { html: R.highlight(code) }));
    return h("div", { class: "code-wrap" }, pre);
  };

  R.report = function (paras) {
    return h("div", { class: "doc" }, [].concat(paras).map((p) => h("p", null, p)));
  };

  /* Slide text may contain [[id|text]] number tokens (used by Number Diet). */
  R.tokenText = function (text, opts) {
    const out = [];
    const re = /\[\[(\w+)\|([^\]]+)\]\]/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (opts && opts.tokens) {
        const tokId = m[1];
        const b = h("button", { class: "num-token", type: "button", dataset: { id: tokId }, "aria-pressed": "false" }, m[2]);
        b.addEventListener("click", () => opts.onToken(tokId, b));
        out.push(b);
      } else out.push(m[2]);
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  /* Horizontal bar chart (inline SVG).
     c = { label, max, unit, data: [[label, value], ...], highlight: index }
     Optional: highlights [indexes]; marks [[index, "tag text"]] shown under a row's label;
     labelW / barW / padR; second [0-100 percentages] drawn as a thin second bar under each bar,
     with secondLabel as its caption. */
  R.chart = function (c) {
    const labelW = c.labelW || 170, barW = c.barW || 330, padR = c.padR || 70, top = 28;
    const second = c.second || null;
    const marks = {};
    (c.marks || []).forEach(([i, t]) => (marks[i] = t));
    const his = c.highlights || (c.highlight != null ? [c.highlight] : []);
    const maxChars = Math.floor((labelW - 14) / 7);
    const wrap = (t) => {
      const out = [];
      let line = "";
      String(t).split(" ").forEach((w) => {
        if (line && (line + " " + w).length > maxChars) { out.push(line); line = w; } else line = line ? line + " " + w : w;
      });
      if (line) out.push(line);
      return out;
    };
    const lines = c.data.map((d, i) => wrap(d[0]).concat(marks[i] ? [null] : []));
    const rh = lines.map((l) => Math.max(second ? 46 : 38, l.length * 16 + 14));
    const capLines = second && c.secondLabel ? 1 : 0;
    const H = top + rh.reduce((a, b) => a + b, 0) + 8 + capLines * 20;
    const W = labelW + barW + padR;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "chart");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", c.label + ": " + c.data.map((d, i) => d[0] + " " + d[1] + (marks[i] ? " (" + marks[i] + ")" : "")).join(", "));
    const mk = (tag, attrs, text, parent) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; (parent || svg).appendChild(e); return e; };
    mk("text", { x: 0, y: 14, class: "chart-cap" }, c.label);
    mk("line", { x1: labelW, x2: labelW, y1: top - 6, y2: H - 4 - capLines * 20, class: "chart-axis" });
    let y = top;
    c.data.forEach((d, i) => {
      const h = rh[i], mid = y + h / 2;
      const w = Math.max(2, (d[1] / c.max) * barW);
      const hi = his.includes(i);
      const t = mk("text", { x: labelW - 10, y: mid - ((lines[i].length - 1) * 16) / 2 + 5, "text-anchor": "end", class: "chart-label" + (hi ? " hi" : "") });
      lines[i].forEach((ln, k) => {
        const ts = document.createElementNS(ns, "tspan");
        ts.setAttribute("x", labelW - 10);
        ts.setAttribute("dy", k ? 16 : 0);
        if (ln === null) { ts.setAttribute("class", "chart-tag"); ts.textContent = marks[i]; } else ts.textContent = ln;
        t.appendChild(ts);
      });
      const bh = second ? h - 24 : h - 14;
      mk("rect", { x: labelW, y: y + 7, width: w, height: bh, rx: 3, class: "chart-bar" + (hi ? " hi" : "") });
      const v = c.max <= 1 ? d[1].toFixed(2) : d[1] + (c.unit || "");
      mk("text", { x: labelW + w + 8, y: y + 7 + bh / 2 + 5, class: "chart-val" + (hi ? " hi" : "") }, v);
      if (second) {
        const pct = second[i] || 0;
        const w2 = Math.max(2, (pct / 100) * barW);
        mk("rect", { x: labelW, y: y + 7 + bh + 3, width: w2, height: 6, rx: 2, class: "chart-bar2" });
        mk("text", { x: labelW + w2 + 8, y: y + 7 + bh + 10, class: "chart-val2" }, Math.round(pct) + "%");
      }
      y += h;
    });
    if (capLines) mk("text", { x: labelW, y: H - 6, class: "chart-cap2" }, "Thin bar: " + c.secondLabel);
    return svg;
  };

  R.slide = function (s, opts) {
    opts = opts || {};
    const el = h("div", { class: "slide" + (opts.small ? " small" : "") });
    el.appendChild(h("div", { class: "slide-title" }, R.tokenText(s.title, opts)));
    const body = h("div", { class: "slide-body" });
    if (s.chart) body.appendChild(h("div", { class: "slide-chart" }, R.chart(s.chart)));
    if (s.table) {
      body.appendChild(h("div", { class: "table-wrap" }, h("table", { class: "slide-table" },
        h("thead", null, h("tr", null, s.table.head.map((x) => h("th", null, x)))),
        h("tbody", null, s.table.rows.map((r) => h("tr", null, r.map((x) => h("td", null, x)))))
      )));
    }
    if (s.bullets && s.bullets.length) body.appendChild(h("ul", { class: "slide-bullets" }, s.bullets.map((b) => h("li", null, R.tokenText(b, opts)))));
    el.appendChild(body);
    if (s.footer) el.appendChild(h("div", { class: "slide-foot" }, s.footer));
    return h("div", { class: "slide-frame" }, el);
  };

  /* Any artefact item: {kind:'report'|'code'|'slide'|'text', content} */
  R.artefact = function (item, opts) {
    switch (item.kind) {
      case "report": return R.report(item.content);
      case "code": return R.code(item.content);
      case "slide": return R.slide(item.content, opts);
      case "text": return h("div", { class: "doc" }, h("p", null, item.content));
      default: return h("div", { class: "doc" }, h("p", null, String(item.content)));
    }
  };

  R.kindLabel = { report: "Report", code: "Code", slide: "Slide", text: "Text" };
  R.originLabel = { ai: "AI", human: "Human", "ai-assisted": "AI-assisted" };
})();
