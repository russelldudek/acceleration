import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.AUDIT_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.AUDIT_OUTPUT || 'audit-evidence';
await fs.mkdir(outputDir, { recursive: true });

const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['laptop', { width: 1280, height: 800 }],
  ['tablet', { width: 820, height: 1180 }],
  ['mobile', { width: 390, height: 844 }],
];

const browser = await chromium.launch({ headless: true });
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function readDiagnostics(page) {
  return page.evaluate(() => {
    const diagnostics = window.__foldEngineDiagnostics;
    if (!diagnostics) return null;
    return JSON.parse(JSON.stringify(diagnostics));
  });
}

for (const [name, viewport] of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`));

  const response = await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  check(response?.ok(), `${name}: index did not return HTTP success`);
  check(await page.locator('.three-fold-stage').count() === 1, `${name}: missing Three.js fold stage`);
  check(await page.locator('canvas.three-fold-canvas').count() === 1, `${name}: missing WebGL canvas`);
  check(await page.locator('.three-fold-fallback').count() === 1, `${name}: missing semantic fallback`);
  check(await page.locator('.three-fold-label').count() === 4, `${name}: expected four semantic evidence labels`);
  check(await page.locator('.fold-sheet').count() === 0, `${name}: superseded fold-sheet remains`);
  check(await page.locator('.origami-sheet').count() === 0, `${name}: CSS paper-grid implementation remains`);
  check(await page.locator('.three-fold-disposition').count() === 1, `${name}: missing integrated disposition base`);

  let diagnosticsReady = true;
  try {
    await page.waitForFunction(() => window.__foldEngineDiagnostics?.ready === true, null, { timeout: 5000 });
  } catch {
    diagnosticsReady = false;
  }
  check(diagnosticsReady, `${name}: Three.js diagnostics never became ready`);

  const baseline = await readDiagnostics(page);
  check(baseline?.renderer === 'three', `${name}: renderer is not Three.js`);
  check(baseline?.meshCount === 4, `${name}: expected four hinged meshes`);
  check(baseline?.state === 'assist', `${name}: baseline state is not Assist`);
  check(baseline?.fallbackActive === false, `${name}: WebGL fallback is unexpectedly active`);
  check(Array.isArray(baseline?.rotations) && baseline.rotations.length === 4, `${name}: missing baseline hinge rotations`);

  const geometry = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const stage = document.querySelector('.three-fold-stage')?.getBoundingClientRect();
    const canvas = document.querySelector('.three-fold-canvas')?.getBoundingClientRect();
    const disposition = document.querySelector('.three-fold-disposition')?.getBoundingClientRect();
    const labels = [...document.querySelectorAll('.three-fold-label')].map(label => {
      const rect = label.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        visible: getComputedStyle(label).visibility !== 'hidden' && getComputedStyle(label).opacity !== '0',
      };
    });
    return {
      overflow: document.documentElement.scrollWidth - viewportWidth,
      stage,
      canvas,
      disposition,
      labels,
    };
  });

  check(geometry.overflow <= 1, `${name}: horizontal overflow ${geometry.overflow}px`);
  check(geometry.stage && geometry.stage.width >= (name === 'mobile' ? 340 : 560), `${name}: stage lacks visual authority`);
  check(geometry.canvas && geometry.canvas.width >= (name === 'mobile' ? 340 : 560), `${name}: canvas is undersized`);
  check(geometry.disposition && geometry.stage && geometry.disposition.top >= geometry.stage.top, `${name}: disposition is detached from the object`);
  geometry.labels.forEach((label, index) => {
    check(label.visible, `${name}: evidence label ${index + 1} is hidden`);
    check(label.width >= 86, `${name}: evidence label ${index + 1} is too narrow`);
    check(label.left >= -1 && label.right <= viewport.width + 1, `${name}: evidence label ${index + 1} leaves viewport`);
  });

  await page.locator('[data-scenario="discovery"]').click();
  await page.waitForFunction(() => window.__foldEngineDiagnostics?.state === 'productize');
  if (!baseline?.reducedMotion) {
    await page.waitForFunction(() => window.__foldEngineDiagnostics?.settled === true, null, { timeout: 5000 });
  }
  const productize = await readDiagnostics(page);
  check((await page.locator('.three-fold-workflow').textContent())?.trim() === 'Publisher discovery', `${name}: workflow label did not update`);
  check(await page.locator('[data-disposition="productize"][aria-current="true"]').count() === 1, `${name}: Productize disposition did not activate`);
  check(productize?.state === 'productize', `${name}: 3D engine did not enter Productize`);
  check(productize?.rotations?.length === 4, `${name}: Productize rotations missing`);

  const rotationDelta = baseline?.rotations && productize?.rotations
    ? baseline.rotations.reduce((sum, value, index) => sum + Math.abs(value - productize.rotations[index]), 0)
    : 0;
  check(rotationDelta > 0.35, `${name}: scenario changed text but not meaningful fold geometry (${rotationDelta})`);

  await page.locator('.scenario-reset').click();
  await page.waitForFunction(() => window.__foldEngineDiagnostics?.state === 'assist');
  check((await page.locator('.three-fold-workflow').textContent())?.trim() === 'Weekly client reporting', `${name}: reset did not restore baseline workflow`);
  check(await page.locator('[data-disposition="assist"][aria-current="true"]').count() === 1, `${name}: reset did not restore Assist`);

  await page.locator('[data-scenario="reporting"]').focus();
  await page.keyboard.press('ArrowRight');
  check(await page.locator('[data-scenario="discovery"]:focus').count() === 1, `${name}: scenario keyboard navigation failed`);

  check(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);
  check(failedRequests.length === 0, `${name}: failed requests: ${failedRequests.join(' | ')}`);

  await page.locator('.three-fold-stage').screenshot({ path: `${outputDir}/${name}-three-fold-hero.png` });
  await page.screenshot({ path: `${outputDir}/${name}-three-fold-page.png`, fullPage: true });
  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
let reducedReady = true;
try {
  await reducedPage.waitForFunction(() => window.__foldEngineDiagnostics?.ready === true, null, { timeout: 5000 });
} catch {
  reducedReady = false;
}
check(reducedReady, 'reduced motion: Three.js engine did not initialize');
await reducedPage.locator('[data-scenario="discovery"]').click();
await reducedPage.waitForFunction(() => window.__foldEngineDiagnostics?.state === 'productize');
const reduced = await readDiagnostics(reducedPage);
check(reduced?.reducedMotion === true, 'reduced motion: preference was not detected');
check(reduced?.settled === true, 'reduced motion: geometry did not resolve immediately');
check(reduced?.continuousAnimation === false, 'reduced motion: continuous animation remains active');
await reducedPage.locator('.three-fold-stage').screenshot({ path: `${outputDir}/reduced-motion-three-fold-hero.png` });
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 820, height: 900 } });
await fallbackContext.addInitScript(() => {
  Object.defineProperty(window, 'WebGLRenderingContext', { configurable: true, value: undefined });
  Object.defineProperty(window, 'WebGL2RenderingContext', { configurable: true, value: undefined });
});
const fallbackPage = await fallbackContext.newPage();
await fallbackPage.goto(`${baseUrl}/index.html?forceFallback=1`, { waitUntil: 'networkidle' });
check(await fallbackPage.locator('.three-fold-stage[data-fallback="true"]').count() === 1, 'fallback: stage did not expose fallback state');
check(await fallbackPage.locator('.three-fold-fallback[aria-hidden="false"]').count() === 1, 'fallback: semantic fallback is not visible');
check(await fallbackPage.locator('.three-fold-label').count() === 4, 'fallback: evidence labels are missing');
await fallbackPage.locator('.three-fold-stage').screenshot({ path: `${outputDir}/fallback-three-fold-hero.png` });
await fallbackContext.close();

await browser.close();

if (failures.length) {
  console.error(`Three-dimensional Fold audit failed with ${failures.length} finding(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Three-dimensional Fold audit passed.');
