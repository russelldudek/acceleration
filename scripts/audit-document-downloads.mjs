import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const baseUrl = process.env.AUDIT_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.AUDIT_OUTPUT || 'document-download-evidence';
const failures = [];
const observations = {};
const check = (condition, message) => { if (!condition) failures.push(message); };

const documents = [
  ['resume.html', 'Russell-Dudek-Acceleration-Partners-Resume.pdf', 2],
  ['cover-letter.html', 'Russell-Dudek-Acceleration-Partners-Cover-Letter.pdf', 1],
  ['interview-brief.html', 'Russell-Dudek-Acceleration-Partners-Interview-Thesis-Brief.pdf', 3],
  ['120-day-plan.html', 'Russell-Dudek-Acceleration-Partners-120-Day-Plan.pdf', 3],
  ['hard-objection.html', 'Russell-Dudek-Acceleration-Partners-Hard-Objection-Analysis.pdf', 2],
  ['service-to-product-fold-canvas.html', 'Russell-Dudek-Service-to-Product-Fold-Canvas.pdf', 1],
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const homeResponse = await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  check(homeResponse?.ok(), 'index.html did not return HTTP success');
  const cta = page.locator('.final-cta .hero-actions a');
  check(await cta.count() === 3, 'Final CTA must contain exactly three document links');
  const ctaItems = await cta.evaluateAll(items => items.map(item => ({
    text: item.textContent.trim(),
    href: item.getAttribute('href'),
    classes: item.className,
  })));
  const expectedCta = [
    { text: 'Resume', href: 'resume.html', primary: true },
    { text: 'Cover letter', href: 'cover-letter.html', primary: false },
    { text: 'Interview thesis brief', href: 'interview-brief.html', primary: false },
  ];
  expectedCta.forEach((expected, index) => {
    const actual = ctaItems[index];
    check(actual?.text === expected.text, `Final CTA item ${index + 1} should be ${expected.text}`);
    check(actual?.href === expected.href, `Final CTA ${expected.text} should link to ${expected.href}`);
    check(expected.primary ? actual?.classes.includes('light') : actual?.classes.includes('secondary'), `Final CTA ${expected.text} has the wrong hierarchy`);
  });
  await page.locator('.final-cta').screenshot({ path: `${outputDir}/final-cta.png` });
  await page.close();

  for (const [route, expectedFilename, expectedPages] of documents) {
    const documentPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const response = await documentPage.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle' });
    check(response?.ok(), `${route} did not return HTTP success`);

    const actions = documentPage.locator('.doc-actions');
    check(await actions.count() === 1, `${route}: missing document actions`);
    check(await actions.locator('button').count() === 0, `${route}: Print button remains`);
    const downloadLink = actions.locator('a.download');
    check(await downloadLink.count() === 1, `${route}: expected one Download PDF link`);
    const downloadAttribute = await downloadLink.getAttribute('download');
    check(downloadAttribute === expectedFilename, `${route}: download filename should be ${expectedFilename}`);
    check((await downloadLink.textContent())?.trim() === 'Download PDF', `${route}: download control label changed`);

    if (route === 'resume.html') {
      check(await actions.locator('a[href="cover-letter.html"]').count() === 1, 'resume.html: View Cover Letter is missing');
    }
    if (route === 'cover-letter.html') {
      check(await actions.locator('a[href="resume.html"]').count() === 1, 'cover-letter.html: View Resume is missing');
    }

    if (await downloadLink.count() === 1 && downloadAttribute) {
      const [download] = await Promise.all([
        documentPage.waitForEvent('download'),
        downloadLink.click(),
      ]);
      check(download.suggestedFilename() === expectedFilename, `${route}: browser suggested ${download.suggestedFilename()} instead of ${expectedFilename}`);
      const savedPath = path.join(outputDir, expectedFilename);
      await download.saveAs(savedPath);
      const bytes = await fs.readFile(savedPath);
      check(bytes.subarray(0, 5).toString('ascii') === '%PDF-', `${route}: downloaded file is not a PDF`);
      const info = execFileSync('pdfinfo', [savedPath], { encoding: 'utf8' });
      const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
      const size = info.match(/^Page size:\s+(.+)$/m)?.[1] || '';
      check(pages === expectedPages, `${route}: expected ${expectedPages} PDF pages, found ${pages}`);
      check(/612 x 792 pts|letter/i.test(size), `${route}: PDF is not US Letter (${size})`);
      observations[route] = { expectedFilename, pages, size, bytes: bytes.length };
    }

    await documentPage.screenshot({ path: `${outputDir}/${route.replace('.html', '')}-actions.png`, fullPage: false });
    await documentPage.close();
  }
} catch (error) {
  failures.push(`Audit exception: ${error.stack || error.message}`);
} finally {
  await browser.close();
}

await fs.writeFile(`${outputDir}/report.json`, JSON.stringify({ failures, observations }, null, 2));
if (failures.length) {
  console.error('Document download audit failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Document download audit passed.');
