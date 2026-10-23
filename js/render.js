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

  R.chart = function (c) {
    const rowH = 38, labelW = 170, barW = 330, padR = 70, top = 28;
    const W = labelW + barW + padR, H = top + c.data.length * rowH + 8;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "chart");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", c.label + ": " + c.data.map((d) => d[0] + " " + d[1]).join(", "));
    const mk = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; svg.appendChild(e); return e; };
    mk("text", { x: 0, y: 14, class: "chart-cap" }, c.label);
    mk("line", { x1: labelW, x2: labelW, y1: top - 6, y2: H - 4, class: "chart-axis" });
    c.data.forEach((d, i) => {
      const y = top + i * rowH;
      const w = Math.max(2, (d[1] / c.max) * barW);
      const hi = i === c.highlight;
      mk("text", { x: labelW - 10, y: y + rowH / 2 + 5, "text-anchor": "end", class: "chart-label" + (hi ? " hi" : "") }, d[0]);
      mk("rect", { x: labelW, y: y + 7, width: w, height: rowH - 14, rx: 3, class: "chart-bar" + (hi ? " hi" : "") });
      const v = c.max <= 1 ? d[1].toFixed(2) : d[1] + (c.unit || "");
      mk("text", { x: labelW + w + 8, y: y + rowH / 2 + 5, class: "chart-val" + (hi ? " hi" : "") }, v);
    });
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
