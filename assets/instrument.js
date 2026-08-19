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
/* ---------------------------------------------------------------------------
   Math typesetting, without a library.

   Write symbols in a compact spec — "S_ut", "sigma_x'", "C_10", "(S_H)^2" —
   and get back something that reads like an equation editor: the base italic in
   a math face, the subscript smaller and dropped onto the baseline, the
   superscript raised. Subscripts are set upright, which is how Shigley prints
   S_ut, K_t, Y_N and the rest.

   M(spec)              -> HTML, for labels and prose
   SVG.mtext(x,y,spec)  -> an SVG <text> built from tspans
--------------------------------------------------------------------------- */
const MATH_FONT = "Cambria Math,Latin Modern Math,STIX Two Math,Times New Roman,Georgia,serif";

/* split "S_ut" into [["S",""],["ut","sub"]] */
function mparse(spec){
  const out = []; let buf = "", mode = "";
  const push = () => { if (buf) out.push([buf, mode]); buf = ""; };
  for (let i = 0; i < spec.length; i++){
    const c = spec[i];
    if (c === "_" || c === "^"){
      push(); mode = c === "_" ? "sub" : "sup";
      if (spec[i+1] === "{"){                       // _{anything}
        const j = spec.indexOf("}", i+2);
        out.push([spec.slice(i+2, j), mode]); i = j; mode = ""; continue;
      }
      /* otherwise take the whole run: S_ut, C_10, tau_x'y' all work unbraced */
      let j = i + 1;
      while (j < spec.length && /[A-Za-z0-9'′]/.test(spec[j])) j++;
      out.push([spec.slice(i+1, j), mode]); i = j - 1; mode = ""; continue;
    }
    buf += c;
  }
  push();
  return out;
}

const VAR = /(^|[^A-Za-zͰ-Ͽ])([A-Za-zͰ-Ͽ])(?![A-Za-zͰ-Ͽ])/g;
/* italicise lone letters only — "mean stress σ" sets the words upright */
function mvar(t, wrap){
  return String(t).replace(VAR, (_, pre, ch) => pre + wrap(ch));
}
function M(spec){
  return `<span class="mth">` + mparse(spec).map(([t, m]) =>
    m === "sub" ? `<sub>${t}</sub>` : m === "sup" ? `<sup>${t}</sup>`
                : mvar(t, c => `<i>${c}</i>`)
  ).join("") + `</span>`;
}

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
  circle(cx, cy, r, fill, stroke, w = 2, dash){
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${fill || "none"}"`
      + `${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ""}`
      + `${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  },
  rect(x, y, w, h, fill, stroke, sw = 1){
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || "none"}"`
      + `${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}/>`;
  },
  /* text. `mono` switches to the measurement voice. */
  text(x, y, s, o = {}){
    const { col = "#10151b", size = 13, anchor = "middle", weight = 600, mono = false, rot = null, op = 1,
            onfill = false, math = false } = o;
    const fam = math
      ? "Cambria Math,Latin Modern Math,STIX Two Math,Times New Roman,Georgia,serif"
      : mono
      ? "ui-monospace,SF Mono,Cascadia Mono,Consolas,monospace"
      : "Segoe UI,system-ui,-apple-system,sans-serif";
    const tr = rot !== null ? ` transform="rotate(${rot} ${x} ${y})"` : "";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${onfill ? ' class="onfill"' : ""} fill="${col}"`
      + ` font-size="${size}" font-weight="${weight}"${math ? ' font-style="italic"' : ""}`
      + ` text-anchor="${anchor}" font-family="${fam}" opacity="${op}"${tr}>${s}</text>`;
  },
  /* A symbol set as maths: italic base, upright subscript dropped a little and
     smaller, superscript raised. Same spec language as M(). */
  mtext(x, y, spec, o = {}){
    const { col = "#10151b", size = 15, anchor = "middle", weight = 600, rot = null, op = 1 } = o;
    const tr = rot !== null ? ` transform="rotate(${rot} ${x} ${y})"` : "";
    const body = mparse(spec).map(([t, m]) => {
      const esc = String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      if (m === "sub") return `<tspan font-size="${(size*0.62).toFixed(1)}" dy="${(size*0.22).toFixed(1)}" font-style="normal">${esc}</tspan><tspan dy="${(-size*0.22).toFixed(1)}"></tspan>`;
      if (m === "sup") return `<tspan font-size="${(size*0.62).toFixed(1)}" dy="${(-size*0.40).toFixed(1)}" font-style="normal">${esc}</tspan><tspan dy="${(size*0.40).toFixed(1)}"></tspan>`;
      return mvar(esc, c => `<tspan font-style="italic">${c}</tspan>`);
    }).join("");
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${col}" font-size="${size}"`
      + ` font-weight="${weight}" text-anchor="${anchor}" font-family="${MATH_FONT}"`
      + ` opacity="${op}"${tr}>${body}</text>`;
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
  /* Shear arrow: the head is halved along the shaft, which is how a shear
     stress is distinguished from a normal force on a drawing. `side` picks
     which barb survives. */
  shearArrow(x1, y1, x2, y2, col, w = 2.8, head = 13, side = 1){
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < 0.8) return "";
    const ux = dx / L, uy = dy / L;
    const bx = x2 - ux * head, by = y2 - uy * head;
    const px = -uy * side, py = ux * side;
    return SVG.line(x1, y1, bx, by, col, w)
      + `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} `
      + `${(bx + px * head * .46).toFixed(1)},${(by + py * head * .46).toFixed(1)} `
      + `${bx.toFixed(1)},${by.toFixed(1)}" fill="${col}"/>`;
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
  /* axis names carry symbols, so set them as maths; "|" splits the symbol part
     from any plain wording that follows, e.g. "sigma_m|mean stress" */
  const axlab = (x, y, spec, rot) => {
    const [sym, words] = String(spec).split("|");
    return words
      ? SVG.mtext(x, y, sym, { col: "#46545f", size: 15, rot })
      + SVG.text(x, y, "", {})
      : SVG.mtext(x, y, sym, { col: "#46545f", size: 15, rot });
  };
  if (xlabel) g += axlab(l + pw / 2, h - 9, xlabel, null);
  if (ylabel) g += axlab(15, t + ph / 2, ylabel, -90);
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
