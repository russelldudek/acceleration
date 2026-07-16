import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.RESUME_BASE_URL || 'http://127.0.0.1:4173';
const outputPath = process.env.RESUME_PDF_OUTPUT || 'docs/russell-dudek-acceleration-partners-resume.pdf';

await fs.mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  const response = await page.goto(`${baseUrl}/resume.html`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`resume.html returned HTTP ${response?.status()}`);
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts?.ready);
  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
} finally {
  await browser.close();
}

const bytes = await fs.readFile(outputPath);
if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
  throw new Error('Generated resume is not a PDF file.');
}
console.log(`Generated ${outputPath} from resume.html (${bytes.length} bytes).`);
