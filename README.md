# MCE 323 — Interactive Modules

Ten browser-based instruments for **MCE 323 Mechanical Design** (Shigley, SI), by
Dr. Ahmed Hanafy Ibrahim. Built to be driven from the front of a lecture theatre on a
projector, and to be opened afterwards by students on their own machines.

**No build step. No dependencies. No internet needed once the page has loaded.**

---

## Publishing on GitHub Pages

1. Create a new repository — `mce323-interactives` is a good name.
2. Copy everything in this folder into it and push:

   ```bash
   cd mce323-interactives
   git init
   git add .
   git commit -m "MCE 323 interactive modules"
   git branch -M main
   git remote add origin https://github.com/<your-username>/mce323-interactives.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.**
4. Wait about a minute. The site appears at
   `https://<your-username>.github.io/mce323-interactives/`

That URL is what you put on iLearn. Every module is linked from the landing page, and each
module also links back.

To update anything later, edit the file and push — Pages redeploys automatically.

---

## What's in here

```
index.html                       landing page
assets/
  site.css                       the whole design system, one file
  instrument.js                  shared SVG, plotting and formatting helpers
modules/
  plane-stress.html              ch. 3   element, θ-sweep and Mohr's circle in sync
  beam-diagrams.html             ch. 3   V and M as the running integral, not a formula
  failure-envelopes.html         ch. 5   MSS, distortion energy, Coulomb–Mohr, Modified Mohr
  stress-concentration.html      ch. 5,6 reading Kt off the chart, then Kt to Kf
  fatigue-criteria.html          ch. 6   Goodman, Gerber, Soderberg, ASME-elliptic, Langer
  marin-sn.html                  ch. 6   each Marin factor takes its bite, then read a life
  shaft-design.html              ch. 7   DE-Goodman sizing, plus the first-cycle yield check
  bearing-life.html              ch. 11  load–life, Weibull reliability, reliability stacking
  gear-geometry.html             ch. 13  involute construction, meshing, interference limit
  agma-gear-stress.html          ch. 14  every factor starts at 1, then switch them on
favicon.svg                      Mohr's circle, the motif the set is built on
.nojekyll                        stops GitHub trying to run Jekyll over the folder
```

Total size is about 190 KB. It will load instantly even on lecture-theatre wifi.

---

## Using them in class

Every module opens on a worked example from the course notes, so it drops straight into a
lecture you already give:

| Module | Opens on |
|---|---|
| Plane stress | The slide-30 state, σx = 10, τ = 5 ccw |
| Beam diagrams | A 1000 N load off-centre on a 600 mm span |
| Failure envelopes | The five stress states from the chapter 5 example |
| Stress concentration | A plate with a central hole, d/w = 0.2 |
| Fatigue criteria | The chapter 7 shaft, Se = 186.9 MPa |
| Marin factors | A polished specimen at Sut = 620 MPa, Se = 310 |
| Shaft sizing | Example 7-1 — and it reproduces n = 1.52 at ⌀27.94 mm |
| Bearing life | Example 11-3 — and it reproduces C₁₀ = 14.28 kN |
| Gear geometry | A standard 18 × 36 set at module 5 |
| AGMA | Example 14-5 geometry, with every factor still at 1 |

**Predict mode** is on most modules. It blanks the readouts so you can pose the question,
take a vote, and only then reveal. That is the predict → attempt → reveal pattern, built into
the tool so it does not depend on remembering to do it.

**Keyboard:** arrow keys nudge the main control, `Shift` takes a larger step, `Space` starts
and stops the animation. Useful when you are standing away from the laptop.

---

## Editing

Everything is plain HTML, CSS and vanilla JavaScript, deliberately. To change a colour or a
type size, edit `assets/site.css` — the tokens are at the top and every module picks them up.

To add a module: copy the closest existing one, change the physics in the `<script>` block,
add a card to the `MODULES` array in `index.html`, and give it the next sheet number in its
title block.

The design rule, if you want to keep things consistent: **monospace carries anything that is a
measurement or an identifier; the sans carries prose.** Colours mean fixed things — `--principal` red for the
governing result, layout-dye blue for the primary quantity, green for shear,
brass for maximum shear and for warnings that are not yet failures.

---

## A caveat worth knowing

These are teaching instruments, not design software. They use the textbook correlations and the
simplifying assumptions of the course — full-depth teeth, grade 1 steel, a single manufacturer's
Weibull parameters, and so on. They are built to make a relationship visible, not to certify a
part. The number a student needs on an assignment should still come from the tables.

---

## Checking it still works

The site ships with a Playwright suite that treats the course notes as the specification.

```
npm install
npx playwright test
```

61 tests over three concerns:

- **Every page loads clean** — no console errors, no failed requests, every SVG actually drawn.
- **Physics matches the course notes** — each module is asserted against its published answer.
  Plane stress reproduces slide 30 (σ1 = 12.07, σ2 = −2.07, τmax = 7.07 at θp = 22.5°); the
  shaft gives Ex 7-1 (n = 1.52, ny = 4.49); the bearing gives Ex 11-3 (C10 = 14.28 kN); AGMA
  reproduces Ex 14-5. Relationships are checked too — MSS never exceeds DE, mean stress always
  lowers the factor of safety, doubling the diameter multiplies n by eight, every Marin factor
  can only reduce Se.
- **Nothing collides, in any state** — labels landing on top of each other is what these
  drawings are prone to, so the suite walks every preset on every module and fails on any
  overlapping pair. This is the check that catches a regression a code review will not.

If you change the physics in a module, change the assertion with it. If you move a label, the
collision sweep will tell you whether it landed somewhere free.
