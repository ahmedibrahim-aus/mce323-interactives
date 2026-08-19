import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const OUT = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });

/* ---- 1. plane stress: one sweep of theta, three views moving together ---- */
{
  const dir = path.join(OUT, 'f_plane');
  fs.mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1.35 });
  await p.goto(pathToFileURL(path.resolve('modules/plane-stress.html')).href);
  await p.waitForTimeout(700);
  const N = 60;
  for (let i = 0; i < N; i++) {
    const th = (180 * i / N).toFixed(2);
    await p.evaluate(t => {
      const el = document.querySelector('#th');
      el.value = t; el.dispatchEvent(new Event('input', { bubbles: true }));
    }, th);
    await p.screenshot({ path: path.join(dir, String(i).padStart(3, '0') + '.png'),
                         clip: { x: 20, y: 316, width: 1400, height: 1230 } });
  }
  await p.close();
  console.log('plane-stress frames:', N);
}

/* ---- 2. gears: exactly one tooth pitch, so the loop is seamless ---------- */
{
  const dir = path.join(OUT, 'f_gear');
  fs.mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1.6 });
  await p.goto(pathToFileURL(path.resolve('modules/gear-geometry.html')).href);
  await p.waitForTimeout(700);
  const mesh = p.locator('#mesh');
  await mesh.scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  const N = 48, pitch = 2 * Math.PI / 18;          // one pinion tooth
  for (let i = 0; i < N; i++) {
    await p.evaluate(v => { psi = v; drawMesh(); }, pitch * i / N);
    await mesh.screenshot({ path: path.join(dir, String(i).padStart(3, '0') + '.png') });
  }
  await p.close();
  console.log('gear frames:', N);
}

await b.close();
