import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.AUDIT_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.AUDIT_OUTPUT || 'interactive-rail-evidence';
const failures = [];
const observations = {};
const check = (condition, message) => { if (!condition) failures.push(message); };
const POSTURES = ['human', 'assist', 'agentize', 'productize'];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['laptop', { width: 1280, height: 800 }],
  ['tablet', { width: 820, height: 1180 }],
  ['mobile-390', { width: 390, height: 844 }],
  ['mobile-320', { width: 320, height: 760 }],
];

await fs.mkdir(outputDir, { recursive: true });

async function diagnostics(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__foldEngineDiagnostics || null)));
}

async function waitSettled(page, posture, reduced = false) {
  await page.waitForFunction(expected => window.__foldEngineDiagnostics?.state === expected, posture, { timeout: 6000 });
  if (!reduced) {
    await page.waitForFunction(() => window.__foldEngineDiagnostics?.settled === true, null, { timeout: 8000 });
  }
}

const browser = await chromium.launch({ headless: true });

for (const [name, viewport] of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`));

  try {
    const response = await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
    check(response?.ok(), `${name}: homepage did not return HTTP success`);
    await page.waitForFunction(() => window.__foldEngineDiagnostics?.ready === true, null, { timeout: 10000 });

    const rail = page.locator('.three-fold-disposition');
    const buttons = rail.locator('button.disposition-step');
    check(await rail.getAttribute('role') === 'group', `${name}: rail is not a labeled group`);
    check(Boolean(await rail.getAttribute('aria-label')), `${name}: rail lacks an accessible label`);
    check(await buttons.count() === 4, `${name}: expected four native disposition buttons`);

    const pressed = await buttons.evaluateAll(items => items.map(item => item.getAttribute('aria-pressed')));
    check(pressed.filter(value => value === 'true').length === 1, `${name}: exactly one button must be pressed`);
    check(pressed.every(value => value === 'true' || value === 'false'), `${name}: invalid aria-pressed state`);

    const workflow = (await page.locator('.three-fold-workflow').textContent())?.trim();
    const snapshots = {};
    for (const posture of POSTURES) {
      const button = page.locator(`button[data-disposition="${posture}"]`);
      await button.click();
      await waitSettled(page, posture);
      snapshots[posture] = await diagnostics(page);
      check((await page.locator('.three-fold-workflow').textContent())?.trim() === workflow, `${name}: ${posture} changed workflow`);
      check(await page.locator(`button[data-disposition="${posture}"][aria-pressed="true"]`).count() === 1, `${name}: ${posture} aria-pressed did not synchronize`);
    }

    const choreographies = POSTURES.map(posture => snapshots[posture]?.choreography);
    check(new Set(choreographies).size === 4, `${name}: choreography IDs are not unique (${choreographies.join(', ')})`);
    const vectors = POSTURES.map(posture => JSON.stringify((snapshots[posture]?.targetRotations || []).map(value => Number(value.toFixed(3)))));
    check(new Set(vectors).size === 4, `${name}: final rotation vectors are not unique`);
    const opening = posture => snapshots[posture]?.aggregateOpening ?? -1;
    check(opening('human') > opening('assist'), `${name}: Human-led is not more open than Assist`);
    check(opening('assist') > opening('agentize'), `${name}: Assist is not more open than Agentize`);
    check(opening('agentize') > opening('productize'), `${name}: Productize is not the most compact posture`);
    check((snapshots.agentize?.gateAsymmetry ?? 0) > 0.12, `${name}: Agentize lacks a review-gate asymmetry`);
    check((snapshots.assist?.decisionGap ?? 0) > 0.06, `${name}: Assist lacks a decision gap`);

    const human = page.locator('button[data-disposition="human"]');
    await human.focus();
    await page.keyboard.press('ArrowRight');
    check(await page.locator('button[data-disposition="assist"]:focus').count() === 1, `${name}: ArrowRight focus failed`);
    await page.keyboard.press('End');
    check(await page.locator('button[data-disposition="productize"]:focus').count() === 1, `${name}: End focus failed`);
    await page.keyboard.press('Home');
    check(await page.locator('button[data-disposition="human"]:focus').count() === 1, `${name}: Home focus failed`);
    await page.keyboard.press('Enter');
    await waitSettled(page, 'human');
    check(await page.locator('button[data-disposition="human"][aria-pressed="true"]').count() === 1, `${name}: Enter activation failed`);

    await page.locator('button[data-disposition="human"]').click();
    await page.locator('button[data-disposition="productize"]').click();
    await page.locator('button[data-disposition="agentize"]').click();
    await waitSettled(page, 'agentize');
    check((await diagnostics(page))?.state === 'agentize', `${name}: rapid selection did not settle on final request`);

    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      buttons: [...document.querySelectorAll('.disposition-step')].map(button => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      }),
    }));
    check(geometry.overflow <= 1, `${name}: horizontal overflow ${geometry.overflow}px`);
    geometry.buttons.forEach((button, index) => {
      check(button.left >= -1 && button.right <= viewport.width + 1, `${name}: button ${index + 1} leaves viewport`);
      check(button.width >= 68 && button.height >= 44, `${name}: button ${index + 1} target is undersized`);
    });
    check(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);
    check(failedRequests.length === 0, `${name}: failed requests: ${failedRequests.join(' | ')}`);
    observations[name] = { workflow, snapshots, geometry, consoleErrors, failedRequests };
    await page.locator('.three-fold-stage').screenshot({ path: `${outputDir}/${name}-interactive-rail.png` });
  } catch (error) {
    failures.push(`${name}: audit exception: ${error.message}`);
    observations[name] = { exception: error.stack, consoleErrors, failedRequests };
    await page.screenshot({ path: `${outputDir}/${name}-exception.png`, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}

try {
  const reducedContext = await browser.newContext({ viewport: { width: 820, height: 1180 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await reducedPage.waitForFunction(() => window.__foldEngineDiagnostics?.ready === true, null, { timeout: 10000 });
  await reducedPage.locator('button[data-disposition="agentize"]').click();
  await waitSettled(reducedPage, 'agentize', true);
  const state = await diagnostics(reducedPage);
  check(state?.settled === true, 'reduced: Agentize did not settle immediately');
  check(state?.continuousAnimation === false, 'reduced: continuous animation remained active');
  observations.reduced = state;
  await reducedContext.close();
} catch (error) {
  failures.push(`reduced: audit exception: ${error.message}`);
}

try {
  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.goto(`${baseUrl}/index.html?forceFallback=1`, { waitUntil: 'networkidle' });
  await fallbackPage.locator('button[data-disposition="productize"]').click();
  check(await fallbackPage.locator('button[data-disposition="productize"][aria-pressed="true"]').count() === 1, 'fallback: Productize did not activate');
  check(await fallbackPage.locator('.three-fold-stage[data-state="productize"]').count() === 1, 'fallback: stage state did not update');
  check((await fallbackPage.locator('.three-fold-workflow').textContent())?.trim() === 'Weekly client reporting', 'fallback: posture changed workflow');
  observations.fallback = await diagnostics(fallbackPage);
  await fallbackContext.close();
} catch (error) {
  failures.push(`fallback: audit exception: ${error.message}`);
}

await browser.close();
await fs.writeFile(`${outputDir}/report.json`, JSON.stringify({ failures, observations }, null, 2));

if (failures.length) {
  console.error('Interactive disposition rail audit failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Interactive disposition rail audit passed.');
