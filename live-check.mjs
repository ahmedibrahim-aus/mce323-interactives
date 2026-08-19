import { chromium } from 'playwright';

const BASE = 'https://ahmedibrahim-aus.github.io/mce323-interactives';
const PAGES = [
  ['/', "don't survive"],
  ['/modules/plane-stress.html', 'Plane Stress Transformation'],
  ['/modules/beam-diagrams.html', 'Shear and Moment Diagrams'],
  ['/modules/failure-envelopes.html', 'Static Failure Envelopes'],
  ['/modules/stress-concentration.html', 'Stress Concentration'],
  ['/modules/fatigue-criteria.html', 'Fatigue Failure Criteria'],
  ['/modules/marin-sn.html', 'Marin Factors'],
  ['/modules/shaft-design.html', 'Shaft Sizing'],
  ['/modules/bearing-life.html', 'Load, Life and Reliability'],
  ['/modules/gear-geometry.html', 'Gear Geometry'],
  ['/modules/agma-gear-stress.html', 'AGMA Stress'],
];

// a published answer from the course notes, per module
const SPOT = {
  '/modules/plane-stress.html':     ['σ1', 12.07],
  '/modules/shaft-design.html':     ['n fatigue', 1.52],
  '/modules/bearing-life.html':     ['C10 catalog basis', 14.28],
  '/modules/agma-gear-stress.html': ['σ bending', 13.89],
  '/modules/beam-diagrams.html':    ['M max', 132.66],
};

const b = await chromium.launch({ channel: 'chrome' });
let fails = 0;

for (const [rel, heading] of PAGES) {
  const page = await b.newPage({ viewport: { width: 1600, height: 1100 } });
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));

  const res = await page.goto(BASE + rel, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const notes = [];
  if (res.status() !== 200) notes.push(`HTTP ${res.status()}`);

  const hasHeading = await page.locator('h1, h2').filter({ hasText: heading }).count();
  if (!hasHeading) notes.push('heading missing');

  const empty = await page.evaluate(() =>
    [...document.querySelectorAll('svg[id]')].filter(s => !s.childElementCount).map(s => s.id));
  if (empty.length) notes.push('empty SVG: ' + empty.join(','));

  if (SPOT[rel]) {
    const [key, want] = SPOT[rel];
    const got = await page.evaluate(k => {
      const c = [...document.querySelectorAll('.cell')]
        .find(el => el.querySelector('.k')?.textContent.trim() === k);
      return c ? c.querySelector('.v').textContent.trim() : null;
    }, key);
    const num = got && parseFloat(got.replace(/[−–]/g, '-').match(/-?\d+(\.\d+)?/)?.[0]);
    if (!(Math.abs(num - want) < 0.05)) notes.push(`${key}: expected ${want}, got ${got}`);
    else notes.push(`${key} = ${got} ✓`);
  }

  if (problems.length) notes.push(...problems);
  const bad = notes.some(n => !n.endsWith('✓'));
  if (bad) fails++;
  console.log(`${bad ? 'FAIL' : ' ok '}  ${rel.padEnd(38)} ${notes.join(' | ')}`);
  await page.close();
}

await b.close();
console.log(fails ? `\n${fails} live page(s) failed` : '\nALL 11 LIVE PAGES OK');
process.exit(fails ? 1 : 0);
