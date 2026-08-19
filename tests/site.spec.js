// MCE 323 interactive modules — automated checks.
//
// Three kinds of test:
//   1. every page loads clean and actually draws something
//   2. the landing page links resolve
//   3. each module reproduces the published answer from the course notes
//
// Run with:  npx playwright test

import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = rel => pathToFileURL(path.join(ROOT, rel)).href;

const PAGES = [
  ['index.html', "don't survive"],
  ['modules/plane-stress.html', 'Plane Stress Transformation'],
  ['modules/beam-diagrams.html', 'Shear and Moment Diagrams'],
  ['modules/failure-envelopes.html', 'Static Failure Envelopes'],
  ['modules/stress-concentration.html', 'Stress Concentration'],
  ['modules/fatigue-criteria.html', 'Fatigue Failure Criteria'],
  ['modules/marin-sn.html', 'Marin Factors'],
  ['modules/shaft-design.html', 'Shaft Sizing'],
  ['modules/bearing-life.html', 'Load, Life and Reliability'],
  ['modules/gear-geometry.html', 'Gear Geometry'],
  ['modules/agma-gear-stress.html', 'AGMA Stress'],
];

/* Collect anything the page complains about. */
function watch(page) {
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));
  return problems;
}

/* Read a data cell by its label, e.g. cell(page, 'σ1') -> 12.07 */
async function cellText(page, key) {
  return page.evaluate(k => {
    const c = [...document.querySelectorAll('.cell')]
      .find(el => el.querySelector('.k')?.textContent.trim() === k);
    return c ? c.querySelector('.v').textContent.trim() : null;
  }, key);
}
async function cellNum(page, key) {
  const t = await cellText(page, key);
  if (t === null) throw new Error(`no cell labelled "${key}"`);
  const m = t.replace(/[−–]/g, '-').match(/-?\d+(\.\d+)?([eE][+-]?\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
const near = (actual, expected, tol) =>
  expect(Math.abs(actual - expected), `expected ≈${expected}, got ${actual}`).toBeLessThanOrEqual(tol);

/* ------------------------------------------------------------------ */
test.describe('every page loads clean', () => {
  for (const [rel, heading] of PAGES) {
    test(`${rel} — no errors, draws content`, async ({ page }) => {
      const problems = watch(page);
      await page.goto(url(rel));
      await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible();

      // every inline SVG must actually have been drawn into
      const empty = await page.evaluate(() =>
        [...document.querySelectorAll('svg[id]')]
          .filter(s => s.childElementCount === 0)
          .map(s => s.id));
      expect(empty, `empty SVG canvases: ${empty.join(', ')}`).toEqual([]);

      // the shared chrome must be present
      await expect(page.locator('.topbar')).toBeVisible();
      await expect(page.locator('.titleblock')).toHaveCount(1);

      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});

/* Labels that land on top of each other are the failure mode these drawings are
   most prone to, and the one that survives code review. Catch it mechanically. */
test.describe('nothing collides', () => {
  for (const [rel] of PAGES) {
    test(`${rel} — no overlapping labels`, async ({ page }) => {
      await page.goto(url(rel));
      await page.waitForTimeout(250);
      const clashes = await page.evaluate(() => {
        const out = [];
        for (const svg of document.querySelectorAll('svg')) {
          const boxes = [...svg.querySelectorAll('text')]
            .filter(t => t.textContent.trim())
            .map(t => ({ t: t.textContent.trim().slice(0, 30), r: t.getBoundingClientRect() }))
            .filter(o => o.r.width > 0 && o.r.height > 0);
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i].r, b = boxes[j].r;
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ox > 2 && oy > 2 &&
                  (ox * oy) / Math.min(a.width * a.height, b.width * b.height) > 0.12)
                out.push(`"${boxes[i].t}" over "${boxes[j].t}"`);
            }
        }
        return out;
      });
      expect(clashes, clashes.join('; ')).toEqual([]);
    });
  }
});

/* Presets move every number on the sheet. That is exactly when labels start to
   land on each other, so walk each one and re-check. */
test.describe('every preset draws cleanly', () => {
  for (const [rel] of PAGES.slice(1)) {
    test(`${rel} — all presets`, async ({ page }) => {
      const problems = watch(page);
      await page.goto(url(rel));
      const n = await page.locator('button.chip').count();
      expect(n, 'module should offer presets').toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const name = (await page.locator('button.chip').nth(i).textContent()).trim();
        await page.locator('button.chip').nth(i).click();
        await page.waitForTimeout(120);
        const clashes = await page.evaluate(() => {
          const out = [];
          for (const svg of document.querySelectorAll('svg')) {
            const boxes = [...svg.querySelectorAll('text')]
              .filter(t => t.textContent.trim())
              .map(t => ({ t: t.textContent.trim().slice(0, 30), r: t.getBoundingClientRect() }))
              .filter(o => o.r.width > 0 && o.r.height > 0);
            for (let i = 0; i < boxes.length; i++)
              for (let j = i + 1; j < boxes.length; j++) {
                const a = boxes[i].r, b = boxes[j].r;
                const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (ox > 2 && oy > 2 &&
                    (ox * oy) / Math.min(a.width * a.height, b.width * b.height) > 0.12)
                  out.push(`"${boxes[i].t}" over "${boxes[j].t}"`);
              }
          }
          return out;
        });
        expect(clashes, `preset "${name}": ${clashes.join('; ')}`).toEqual([]);
      }
      expect(problems, problems.join(String.fromCharCode(10))).toEqual([]);
    });
  }
});

test('landing page lists ten modules and every link resolves', async ({ page }) => {
  await page.goto(url('index.html'));
  const hrefs = await page.$$eval('.cards a.card', els => els.map(e => e.getAttribute('href')));
  expect(hrefs).toHaveLength(10);
  for (const h of hrefs) {
    expect(fs.existsSync(path.join(ROOT, h)), `missing file: ${h}`).toBe(true);
  }
  // each card carries a chapter tag and a drawn thumbnail
  expect(await page.locator('.card .ch').count()).toBe(10);
  const blank = await page.$$eval('.card .thumb svg', s => s.filter(x => x.childElementCount === 0).length);
  expect(blank).toBe(0);
});

/* ------------------------------------------------------------------ */
test.describe('physics matches the course notes', () => {

  test('plane stress — slide 30 state', async ({ page }) => {
    await page.goto(url('modules/plane-stress.html'));
    near(await cellNum(page, 'σ1'), 12.07, 0.02);
    near(await cellNum(page, 'σ2'), -2.07, 0.02);
    near(await cellNum(page, 'τmax'), 7.07, 0.02);
    near(await cellNum(page, 'θp'), 22.5, 0.1);
    near(await cellNum(page, 'σavg'), 5.00, 0.02);
    // the invariant really is invariant
    const inv0 = await cellNum(page, 'σx′ + σy′');
    await page.fill('#th', '61.5');
    await page.dispatchEvent('#th', 'input');
    near(await cellNum(page, 'σx′ + σy′'), inv0, 0.02);
  });

  test('plane stress — worked example 3-4 preset', async ({ page }) => {
    await page.goto(url('modules/plane-stress.html'));
    await page.getByRole('button', { name: 'Worked example 3-4' }).click();
    near(await cellNum(page, 'σ1'), 104.03, 0.05);
    near(await cellNum(page, 'σ2'), -24.03, 0.05);
    near(await cellNum(page, 'τmax'), 64.03, 0.05);
  });

  test('failure envelopes — MSS never exceeds DE', async ({ page }) => {
    await page.goto(url('modules/failure-envelopes.html'));
    near(await cellNum(page, 'n — DE'), 1.43, 0.02);
    near(await cellNum(page, 'n — MSS'), 1.43, 0.02);
    await page.getByRole('button', { name: '(c) 69.2, −29.2' }).click();
    const de = await cellNum(page, 'n — DE');
    const mss = await cellNum(page, 'n — MSS');
    near(de, 1.14, 0.02);
    near(mss, 1.02, 0.02);
    expect(mss, 'MSS must be the conservative one').toBeLessThanOrEqual(de + 1e-9);
  });

  test('fatigue criteria — five criteria at (200, 120)', async ({ page }) => {
    await page.goto(url('modules/fatigue-criteria.html'));
    near(await cellNum(page, 'n — Goodman'), 1.09, 0.02);
    near(await cellNum(page, 'n — Gerber'), 1.34, 0.02);
    near(await cellNum(page, 'n — Soderberg'), 1.00, 0.02);
    near(await cellNum(page, 'n — ASME-ell.'), 1.36, 0.02);
    near(await cellNum(page, 'ny — Langer'), 1.77, 0.02);
  });

  test('fatigue criteria — mean stress reduces every factor', async ({ page }) => {
    await page.goto(url('modules/fatigue-criteria.html'));
    await page.fill('#sm', '0'); await page.dispatchEvent('#sm', 'input');
    const atZero = await cellNum(page, 'n — Goodman');
    await page.fill('#sm', '300'); await page.dispatchEvent('#sm', 'input');
    const atHigh = await cellNum(page, 'n — Goodman');
    expect(atHigh, 'mean stress must hurt').toBeLessThan(atZero);
  });

  test('shaft design — example 7-1 gives n = 1.52 and ny = 4.49', async ({ page }) => {
    await page.goto(url('modules/shaft-design.html'));
    near(await cellNum(page, 'n fatigue'), 1.52, 0.02);
    near(await cellNum(page, 'n yield'), 4.49, 0.03);
    expect(await cellText(page, 'governs')).toBe('FATIGUE');
  });

  test('shaft design — stress goes as 1/d³', async ({ page }) => {
    await page.goto(url('modules/shaft-design.html'));
    await page.fill('#d', '28'); await page.dispatchEvent('#d', 'input');
    const nA = await cellNum(page, 'n fatigue');
    await page.fill('#d', '56'); await page.dispatchEvent('#d', 'input');      // double it
    const nB = await cellNum(page, 'n fatigue');
    near(nB / nA, 8, 0.05);
  });

  test('bearing life — example 11-3 gives C10 = 14.28 kN', async ({ page }) => {
    await page.goto(url('modules/bearing-life.html'));
    near(await cellNum(page, 'C10 catalogue basis'), 14.28, 0.02);
    near(await cellNum(page, 'xD'), 517.5, 0.5);
    // six bearings at 90% give 53%
    near(await cellNum(page, 'system R, 6 bearings'), 53.1, 0.2);
  });

  test('gear geometry — 18 x 36 at module 5', async ({ page }) => {
    await page.goto(url('modules/gear-geometry.html'));
    near(await cellNum(page, 'd pinion'), 90.0, 0.05);
    near(await cellNum(page, 'd gear'), 180.0, 0.05);
    near(await cellNum(page, 'C'), 135.0, 0.05);
    near(await cellNum(page, 'p'), 15.71, 0.02);
    near(await cellNum(page, 'db pinion'), 84.57, 0.1);   // d cos 20
    expect(await cellText(page, 'min teeth')).toBe('18');
  });

  test('gear geometry — undercut warning appears below the limit', async ({ page }) => {
    await page.goto(url('modules/gear-geometry.html'));
    await page.fill('#n1', '12'); await page.dispatchEvent('#n1', 'input');
    await expect(page.locator('#note')).toContainText('Interference');
    await page.selectOption('#phi', '25');
    expect(await cellText(page, 'min teeth')).toBe('12');
  });

  test('AGMA — baseline is Wt/(F·mt·J), and all factors on reproduces example 14-5', async ({ page }) => {
    await page.goto(url('modules/agma-gear-stress.html'));
    near(await cellNum(page, 'Wt'), 644.3, 1.0);
    near(await cellNum(page, 'mt'), 2.887, 0.002);
    near(await cellNum(page, 'σ bending'), 13.89, 0.05);   // every factor still 1
    await page.getByRole('button', { name: 'All factors on' }).click();
    near(await cellNum(page, 'σ bending'), 34.9, 0.4);
    near(await cellNum(page, 'S_F'), 7.1, 0.15);
    near(await cellNum(page, 'S_H'), 2.03, 0.05);
    await expect(page.locator('#verdict')).toContainText('WEAR');
  });

  test('beam diagrams — simply supported point load', async ({ page }) => {
    await page.goto(url('modules/beam-diagrams.html'));
    // L = 600, P = 1000 N at x = 198  ->  RA = 670, RB = 330, Mmax = 132.66 N·m
    near(await cellNum(page, 'RA'), 670, 2);
    near(await cellNum(page, 'RB'), 330, 2);
    near(await cellNum(page, 'M max'), 132.66, 0.5);
    near(await cellNum(page, 'at x ='), 198, 2);
  });

  test('beam diagrams — cantilever with a tip load', async ({ page }) => {
    await page.goto(url('modules/beam-diagrams.html'));
    await page.getByRole('button', { name: 'Cantilever tip load' }).click();
    // L = 400, P = 600 N at the tip  ->  wall moment = 240 N·m
    near(Math.abs(await cellNum(page, 'M at wall')), 240, 1);
    near(await cellNum(page, 'RA'), 600, 1);
  });

  test('stress concentration — plate with a hole, d/w = 0.2', async ({ page }) => {
    await page.goto(url('modules/stress-concentration.html'));
    near(await cellNum(page, 'Kt'), 2.51, 0.02);          // Shigley fig. A-15-1
    near(await cellNum(page, 'σnom'), 50.0, 0.1);         // 10 kN on (100-20)x2.5
    near(await cellNum(page, 'σmax'), 125.4, 0.5);
    // ignoring Kt overstates the safety factor by exactly Kt
    const nIg = await cellNum(page, 'n if you ignore Kt');
    const nHo = await cellNum(page, 'n, honest');
    near(nIg / nHo, 2.51, 0.02);
  });

  test('stress concentration — Kf is always below Kt', async ({ page }) => {
    await page.goto(url('modules/stress-concentration.html'));
    const kt = await cellNum(page, 'Kt');
    const kf = await cellNum(page, 'Kf');
    const q = await cellNum(page, 'q');
    expect(kf).toBeLessThan(kt);
    near(kf, 1 + q * (kt - 1), 0.01);
  });

  test('Marin — polished specimen at Sut 620 gives Se = 310', async ({ page }) => {
    await page.goto(url('modules/marin-sn.html'));
    await page.getByRole('button', { name: 'Polished specimen, Sut 620' }).click();
    near(await cellNum(page, 'S′e'), 310, 0.5);
    near(await cellNum(page, 'Se'), 310, 0.5);      // every correction is 1
    near(await cellNum(page, 'ka'), 1.0, 0.001);
    near(await cellNum(page, 'kb'), 1.0, 0.001);
    near(await cellNum(page, 'f'), 0.86, 0.01);
    // life at 379 MPa, the slide-13 case
    const N = await cellNum(page, 'life at σa');
    expect(N).toBeGreaterThan(6e4);
    expect(N).toBeLessThan(9e4);
  });

  test('Marin — corrections only ever reduce Se', async ({ page }) => {
    await page.goto(url('modules/marin-sn.html'));
    await page.getByRole('button', { name: 'Polished specimen, Sut 620' }).click();
    const clean = await cellNum(page, 'Se');
    await page.selectOption('#surf', '57.7,-0.718');   // hot-rolled
    const rough = await cellNum(page, 'Se');
    expect(rough).toBeLessThan(clean);
    await page.selectOption('#load', 'tors');
    expect(await cellNum(page, 'kc')).toBeCloseTo(0.59, 2);
  });
});

/* ------------------------------------------------------------------ */
test.describe('teaching controls behave', () => {

  const withPredict = [
    'modules/plane-stress.html', 'modules/failure-envelopes.html',
    'modules/fatigue-criteria.html', 'modules/bearing-life.html',
    'modules/beam-diagrams.html', 'modules/stress-concentration.html',
    'modules/marin-sn.html', 'modules/shaft-design.html',
  ];
  for (const rel of withPredict) {
    test(`${rel} — predict mode hides then reveals`, async ({ page }) => {
      await page.goto(url(rel));
      const btn = page.locator('#predict');
      await btn.click();
      await expect(btn).toHaveText('Reveal');
      const hidden = await page.$$eval('.cell .v', v => v.filter(x => x.textContent.trim() === '—').length);
      expect(hidden, 'predict mode should blank the readouts').toBeGreaterThan(0);
      await btn.click();
      await expect(btn).toHaveText('Predict mode');
      const after = await page.$$eval('.cell .v', v => v.filter(x => x.textContent.trim() === '—').length);
      expect(after).toBe(0);
    });
  }

  test('presets change the state on every module that has them', async ({ page }) => {
    for (const [rel] of PAGES.slice(1)) {
      await page.goto(url(rel));
      const chips = page.locator('#presets button');
      const n = await chips.count();
      if (n === 0) continue;
      const before = await page.$$eval('.cell .v', v => v.map(x => x.textContent).join('|'));
      await chips.nth(n - 1).click();
      const after = await page.$$eval('.cell .v', v => v.map(x => x.textContent).join('|'));
      expect(after, `${rel}: last preset changed nothing`).not.toBe(before);
    }
  });

  test('plane stress — jump to θp lands on zero shear', async ({ page }) => {
    await page.goto(url('modules/plane-stress.html'));
    await page.getByRole('button', { name: 'Jump to θp' }).click();
    near(await cellNum(page, 'τx′y′'), 0, 0.01);
    // and σx′ is then the larger principal stress
    near(await cellNum(page, 'σx′'), await cellNum(page, 'σ1'), 0.02);
  });

  test('gear geometry — mesh animation runs and stops', async ({ page }) => {
    await page.goto(url('modules/gear-geometry.html'));
    const btn = page.locator('#run');
    const before = await page.locator('#mesh').innerHTML();
    await btn.click();
    await page.waitForTimeout(350);
    const during = await page.locator('#mesh').innerHTML();
    expect(during, 'the mesh should be turning').not.toBe(before);
    await btn.click();
    await expect(btn).toContainText('Mesh');
  });
});
