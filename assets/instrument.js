/* ==========================================================================
   MCE 323 — shared instrument helpers.
   Small, dependency-free SVG + formatting utilities used by every module so
   the modules look and behave like one instrument family.
   ========================================================================== */
"use strict";

const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const D  = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- numbers ------------------------------------------------------ */
function fmt(v, d = 2){
  if (!isFinite(v)) return "∞";
  const x = Math.abs(v) < 5e-4 ? 0 : v;
  return x.toFixed(d);
}
function sig(v, n = 3){
  if (!isFinite(v)) return "∞";
  if (v === 0) return "0";
  const m = Math.floor(Math.log10(Math.abs(v)));
  return (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3)
    ? v.toExponential(n - 1).replace("e+", "e")
    : v.toFixed(clamp(n - 1 - m, 0, 4));
}

/* ---------- svg primitives ----------------------------------------------- */
const SVG = {
  line(x1, y1, x2, y2, col, w = 1.5, dash, op = 1){
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" `
      + `stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}`
      + `${op !== 1 ? ` opacity="${op}"` : ""} stroke-linecap="round"/>`;
  },
  path(d, col, w = 2, fill = "none", dash){
    return `<path d="${d}" fill="${fill}" stroke="${col}" stroke-width="${w}"`
      + `${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
  },
  circle(cx, cy, r, fill, stroke, w = 2){
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${fill || "none"}"`
      + `${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ""}/>`;
  },
  rect(x, y, w, h, fill, stroke, sw = 1){
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || "none"}"`
      + `${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}/>`;
  },
  /* text. `mono` switches to the measurement voice. */
  text(x, y, s, o = {}){
    const { col = "#10151b", size = 13, anchor = "middle", weight = 600, mono = false, rot = null, op = 1,
            onfill = false } = o;
    const fam = mono
      ? "ui-monospace,SF Mono,Cascadia Mono,Consolas,monospace"
      : "Segoe UI,system-ui,-apple-system,sans-serif";
    const tr = rot !== null ? ` transform="rotate(${rot} ${x} ${y})"` : "";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${onfill ? ' class="onfill"' : ""} fill="${col}"`
      + ` font-size="${size}" font-weight="${weight}"`
      + ` text-anchor="${anchor}" font-family="${fam}" opacity="${op}"${tr}>${s}</text>`;
  },
  /* solid-headed arrow, head sits at (x2,y2) */
  arrow(x1, y1, x2, y2, col, w = 3, head = 10){
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < 0.8) return "";
    const ux = dx / L, uy = dy / L;
    const bx = x2 - ux * head, by = y2 - uy * head, px = -uy, py = ux;
    return SVG.line(x1, y1, bx, by, col, w)
      + `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} `
      + `${(bx + px * head * .40).toFixed(1)},${(by + py * head * .40).toFixed(1)} `
      + `${(bx - px * head * .40).toFixed(1)},${(by - py * head * .40).toFixed(1)}" fill="${col}"/>`;
  },
  /* centreline: the long-dash short-dash of an engineering drawing */
  centre(x1, y1, x2, y2, col = "#8493a0"){
    return SVG.line(x1, y1, x2, y2, col, 1, "14 4 3 4");
  }
};

/* ---------- cartesian frame ---------------------------------------------- */
/* Builds a plot area with axes, ticks and labels. Returns mapping helpers. */
function frame(opt){
  const { w, h, l = 62, r = 20, t = 20, b = 50,
          xmin, xmax, ymin, ymax,
          xlabel = "", ylabel = "", xstep, ystep,
          xfmt = v => String(v), yfmt = v => String(v),
          zeroY = true, zeroX = false } = opt;
  const pw = w - l - r, ph = h - t - b;
  const X = v => l + (v - xmin) / (xmax - xmin) * pw;
  const Y = v => t + ph - (v - ymin) / (ymax - ymin) * ph;
  const cid = "clip" + (++frame._n);

  let g = `<defs><clipPath id="${cid}"><rect x="${l}" y="${t}" width="${pw}" height="${ph}"/></clipPath></defs>`;
  g += SVG.rect(l, t, pw, ph, "#fbfcfd", "#e6eaee", 1);
  const xs = xstep || niceStep(xmax - xmin);
  const ys = ystep || niceStep(ymax - ymin);
  for (let v = Math.ceil(xmin / xs) * xs; v <= xmax + 1e-9; v += xs){
    g += SVG.line(X(v), t, X(v), t + ph, "#eef2f5", 1);
    g += SVG.text(X(v), t + ph + 19, xfmt(v), { col: "#8493a0", size: 11.5, mono: true, weight: 500 });
  }
  for (let v = Math.ceil(ymin / ys) * ys; v <= ymax + 1e-9; v += ys){
    g += SVG.line(l, Y(v), l + pw, Y(v), "#eef2f5", 1);
    g += SVG.text(l - 8, Y(v) + 4, yfmt(v), { col: "#8493a0", size: 11.5, anchor: "end", mono: true, weight: 500 });
  }
  if (zeroY && ymin < 0 && ymax > 0) g += SVG.line(l, Y(0), l + pw, Y(0), "#b9c4ce", 1.5);
  if (zeroX && xmin < 0 && xmax > 0) g += SVG.line(X(0), t, X(0), t + ph, "#b9c4ce", 1.5);
  if (xlabel) g += SVG.text(l + pw / 2, h - 10, xlabel, { col: "#46545f", size: 12.5 });
  if (ylabel) g += SVG.text(14, t + ph / 2, ylabel, { col: "#46545f", size: 12.5, rot: -90 });
  return { g, X, Y, l, t, r, b, pw, ph, cid,
           clip: inner => `<g clip-path="url(#${cid})">${inner}</g>` };
}
frame._n = 0;
function niceStep(span){
  const raw = span / 6, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}
/* polyline through f(x) sampled n times across [a,b] */
function curve(f, a, b, X, Y, n = 240){
  let d = "";
  for (let i = 0; i <= n; i++){
    const x = a + (b - a) * i / n, y = f(x);
    if (!isFinite(y)) { d = ""; continue; }
    d += (d ? " L " : "M ") + X(x).toFixed(1) + " " + Y(y).toFixed(1);
  }
  return d;
}

/* ---------- data cells --------------------------------------------------- */
function cells(target, list){
  $(target).innerHTML = list.map(c => {
    const cls = c.tone || "plain";
    return `<div class="cell ${cls}"><div class="k">${c.k}</div>`
      + `<div class="v">${c.v}</div>${c.n ? `<div class="n">${c.n}</div>` : ""}</div>`;
  }).join("");
}
function callout(target, html, tone){
  const el = $(target);
  if (!html){ el.className = "callout"; el.innerHTML = ""; return; }
  el.className = "callout show" + (tone ? " " + tone : "");
  el.innerHTML = html;
}

/* ---------- page chrome -------------------------------------------------- */
function mountTopbar(o){
  const { code = "MCE 323", name = "Mechanical Design", back = true } = o || {};
  document.body.insertAdjacentHTML("afterbegin",
    `<div class="topbar">
       <span class="code">${code}</span>
       <span class="name">${name}</span>
       <span class="spacer"></span>
       ${back ? `<a class="back" href="../index.html">&larr; All modules</a>` : ""}
       <span class="inst">A. H. Ibrahim</span>
     </div>`);
}
function titleblock(o){
  const { sheet, title, ch, rev = "A", date = "2026" } = o;
  return `<div class="titleblock">
    <div class="row r2">
      <div class="c"><span class="lab">Title</span><span class="big">${title}</span></div>
      <div class="c"><span class="lab">Sheet</span><span class="big">${sheet}</span></div>
    </div>
    <div class="row r3">
      <div class="c"><span class="lab">Course</span>MCE 323</div>
      <div class="c"><span class="lab">Reference</span>Shigley ch. ${ch}</div>
      <div class="c"><span class="lab">Rev</span>${rev}</div>
    </div>
    <div class="row r2">
      <div class="c"><span class="lab">Drawn by</span>Dr. Ahmed Hanafy Ibrahim</div>
      <div class="c"><span class="lab">Date</span>${date}</div>
    </div>
  </div>`;
}

/* ---------- keyboard ------------------------------------------------------ */
/* Arrow keys nudge a range input; Shift takes a bigger step; Space toggles. */
function keyboard(rangeId, onChange, onSpace){
  addEventListener("keydown", e => {
    const tag = e.target.tagName;
    if (tag === "INPUT" && e.target.type === "number") return;
    if (tag === "SELECT") return;
    const el = $(rangeId);
    const base = parseFloat(el.step) || 1;
    const step = e.shiftKey ? base * 10 : base;
    if (e.key === "ArrowRight" || e.key === "ArrowUp"){
      el.value = clamp(parseFloat(el.value) + step, +el.min, +el.max); onChange(); e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown"){
      el.value = clamp(parseFloat(el.value) - step, +el.min, +el.max); onChange(); e.preventDefault();
    } else if (e.code === "Space" && onSpace){
      onSpace(); e.preventDefault();
    }
  });
}

/* ---------- animation loop ------------------------------------------------ */
function sweeper(btn, stepFn, label){
  const name = label || ($(btn).textContent.replace(/^[^A-Za-z]*/, "").trim() || "Sweep");
  let on = false, raf = null, last = 0;
  const tick = ts => {
    if (!on) return;
    if (!last) last = ts;
    stepFn((ts - last) / 1000);
    last = ts;
    raf = requestAnimationFrame(tick);
  };
  const toggle = () => {
    on = !on;
    $(btn).textContent = on ? "❚❚  Pause" : "▶  " + name;
    $(btn).classList.toggle("active", on);
    if (on){ last = 0; raf = requestAnimationFrame(tick); }
    else if (raf) cancelAnimationFrame(raf);
  };
  $(btn).addEventListener("click", toggle);
  return { toggle, running: () => on };
}
