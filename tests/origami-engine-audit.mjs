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
  check(await page.locator('.origami-engine').count() === 1, `${name}: missing Precision Origami Engine`);
  check(await page.locator('.fold-sheet').count() === 0, `${name}: superseded fold-sheet remains`);
  check(await page.locator('.origami-face').count() === 4, `${name}: expected four evidence faces`);
  check(await page.locator('.origami-core').count() === 1, `${name}: missing recurring-workflow core`);
  check(await page.locator('.disposition-rail').count() === 1, `${name}: missing integrated disposition rail`);

  const geometry = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - viewportWidth;
    const faces = [...document.querySelectorAll('.origami-face')].map(face => {
      const rect = face.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        visible: getComputedStyle(face).visibility !== 'hidden' && getComputedStyle(face).opacity !== '0',
      };
    });
    const engine = document.querySelector('.origami-engine')?.getBoundingClientRect();
    const rail = document.querySelector('.disposition-rail')?.getBoundingClientRect();
    const core = document.querySelector('.origami-core')?.getBoundingClientRect();
    const grid = document.querySelector('.origami-sheet');
    return {
      overflow,
      faces,
      railGap: engine && rail ? Math.abs(rail.top - engine.bottom) : 999,
      coreWidth: core?.width || 0,
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
    };
  });

  check(geometry.overflow <= 1, `${name}: horizontal overflow ${geometry.overflow}px`);
  geometry.faces.forEach((face, index) => {
    check(face.visible, `${name}: face ${index + 1} is hidden`);
    check(face.width >= (name === 'mobile' ? 155 : 190), `${name}: face ${index + 1} too narrow (${face.width}px)`);
    check(face.height >= (name === 'mobile' ? 185 : 190), `${name}: face ${index + 1} too short (${face.height}px)`);
    check(face.left >= -1 && face.right <= viewport.width + 1, `${name}: face ${index + 1} leaves viewport`);
  });
  check(geometry.coreWidth >= (name === 'mobile' ? 330 : 250), `${name}: workflow core lacks visual authority`);
  check(geometry.railGap < 110, `${name}: disposition rail is detached from engine`);
  if (name === 'mobile') check(geometry.gridColumns === 2, `mobile: expected two-column top-down evidence layout`);

  await page.locator('[data-scenario="discovery"]').click();
  check((await page.locator('.origami-workflow-name').textContent())?.trim() === 'Publisher discovery', `${name}: hero workflow did not update`);
  check(await page.locator('[data-disposition="productize"][aria-current="true"]').count() === 1, `${name}: productize disposition did not activate`);
  check(await page.locator('.origami-engine[data-result="productize"]').count() === 1, `${name}: engine posture did not update`);

  await page.locator('.scenario-reset').click();
  check((await page.locator('.origami-workflow-name').textContent())?.trim() === 'Weekly client reporting', `${name}: reset did not restore baseline workflow`);
  check(await page.locator('[data-disposition="assist"][aria-current="true"]').count() === 1, `${name}: reset did not restore Assist`);

  await page.locator('[data-scenario="reporting"]').focus();
  await page.keyboard.press('ArrowRight');
  check(await page.locator('[data-scenario="discovery"]:focus').count() === 1, `${name}: scenario keyboard navigation failed`);

  check(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);
  check(failedRequests.length === 0, `${name}: failed requests: ${failedRequests.join(' | ')}`);

  await page.screenshot({ path: `${outputDir}/${name}-origami-engine.png`, fullPage: true });
  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
const reducedMotion = await reducedPage.locator('.origami-face').first().evaluate(el => {
  const style = getComputedStyle(el);
  return { transitionDuration: style.transitionDuration, animationName: style.animationName };
});
check(reducedMotion.transitionDuration === '0s', `reduced motion: transition duration is ${reducedMotion.transitionDuration}`);
check(reducedMotion.animationName === 'none', `reduced motion: animation remains ${reducedMotion.animationName}`);
await reducedPage.screenshot({ path: `${outputDir}/reduced-motion-origami-engine.png`, fullPage: true });
await reducedContext.close();

await browser.close();

if (failures.length) {
  console.error(`Precision Origami Engine audit failed with ${failures.length} finding(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Precision Origami Engine audit passed.');
