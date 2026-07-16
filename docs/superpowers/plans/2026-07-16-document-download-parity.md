# Document Download Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the closing CTA read Resume -> Cover letter -> Interview thesis brief, remove every Print control, make every PDF control a one-click same-origin download, and regenerate the two-page resume PDF directly from the HTML print layout so the download matches the web document.

**Architecture:** Keep the existing HTML document routes as the single layout source of truth. Use Playwright/Chromium in GitHub Actions to print `resume.html` with `printBackground: true` and US Letter dimensions, replace the existing resume PDF with the generated file, then render the PDF to images and audit page count and composition. Document actions remain web-only and use native anchor downloads.

**Tech Stack:** Static HTML/CSS, GitHub Actions, Node.js, Playwright Chromium, Poppler (`pdfinfo`, `pdftoppm`), GitHub Pages.

## Global Constraints

- Closing CTA order is Resume, Cover letter, Interview thesis brief.
- Resume is the filled primary button; Cover letter and Interview thesis brief are outlined.
- Every document route removes the Print button.
- Every PDF link uses the native `download` attribute with a human-readable filename.
- Resume and cover-letter reciprocal web navigation remains visible and deployment-safe.
- Resume PDF is generated from `resume.html`, not ReportLab or a separately maintained template.
- Resume PDF remains exactly two US Letter pages.
- Cover letter remains exactly one page; no content or PDF regeneration is required unless an audit finds a defect.
- Web-only controls remain hidden from print/PDF output.
- Completion requires exact-file publication and live one-click-download checks.

---

### Task 1: Add a failing document-delivery audit

**Files:**
- Create: `scripts/audit-document-downloads.mjs`
- Create: `.github/workflows/document-download-audit.yml`

**Interfaces:**
- Consumes document routes and PDF paths.
- Produces a JSON report plus screenshots and a failing CI gate before implementation.

- [ ] Assert the final CTA contains exactly three links in the approved order and hierarchy.
- [ ] Assert every `.doc-actions` region has zero `<button>` elements and exactly one `a.download` link.
- [ ] Assert every download link contains a `download` attribute ending in `.pdf` and resolves with HTTP 200.
- [ ] Assert Resume and Cover Letter reciprocal navigation remains present.
- [ ] Assert the resume PDF has exactly two pages and US Letter media boxes.
- [ ] Assert the cover-letter PDF has exactly one page.
- [ ] Run against the feature branch and verify the current source fails for missing Resume CTA, Print controls, missing `download` attributes, and resume PDF parity marker.

---

### Task 2: Correct CTA and document action markup

**Files:**
- Modify: `index.html`
- Modify: `resume.html`
- Modify: `cover-letter.html`
- Modify: `interview-brief.html`
- Modify: `120-day-plan.html`
- Modify: `hard-objection.html`
- Modify: `service-to-product-fold-canvas.html`

**Interfaces:**
- Produces native one-click PDF downloads and the approved CTA hierarchy.

- [ ] Replace the closing CTA with:

```html
<div class="hero-actions" style="justify-content:center">
  <a class="button light" href="resume.html">Resume</a>
  <a class="button secondary" href="cover-letter.html">Cover letter</a>
  <a class="button secondary" href="interview-brief.html">Interview thesis brief</a>
</div>
```

- [ ] Remove every `<button onclick="window.print()">Print</button>` from document routes.
- [ ] Add native downloads, for example:

```html
<a class="download"
   href="docs/russell-dudek-acceleration-partners-resume.pdf"
   download="Russell-Dudek-Acceleration-Partners-Resume.pdf">Download PDF</a>
```

- [ ] Use equivalent human-readable filenames for all other documents.
- [ ] Preserve Candidate Vision and reciprocal Resume/Cover Letter links.

---

### Task 3: Generate the resume PDF from the HTML source

**Files:**
- Create: `scripts/generate-resume-pdf.mjs`
- Modify: `.github/workflows/document-download-audit.yml`
- Replace: `docs/russell-dudek-acceleration-partners-resume.pdf`

**Interfaces:**
- Consumes `resume.html`, `brand-tokens.css`, `styles.css`, and local assets.
- Produces `docs/russell-dudek-acceleration-partners-resume.pdf`.

- [ ] Start a local static server in CI.
- [ ] Use Chromium `page.pdf` with:

```js
await page.pdf({
  path: outputPath,
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
```

- [ ] Verify the generated file is exactly two pages with `pdfinfo`.
- [ ] Render pages with `pdftoppm -png -r 160` and retain CI evidence.
- [ ] Compare extracted text against the HTML's key headings and experience names.
- [ ] Commit the generated PDF binary to the feature branch through a GitHub Actions writer step.

---

### Task 4: Visual parity and live publication audit

**Files:**
- Modify: `.github/workflows/document-download-audit.yml`

**Interfaces:**
- Produces final screenshots, PDF page renders, and public-file verification.

- [ ] Capture the HTML resume in print media at full-page scale and both rendered PDF pages.
- [ ] Check that page-one and page-two section order, header system, colors, and major modules correspond to the HTML source.
- [ ] Verify no clipped text, overlaps, blank pages, or large accidental unused page-one region.
- [ ] Open every document route and click its download link with Playwright `expect_download`; assert the suggested filename matches the `download` attribute and the saved file begins with `%PDF-`.
- [ ] Merge only after the branch audit passes.
- [ ] Run an audit-only workflow against GitHub Pages and compare `index.html`, all document HTML routes, and the regenerated resume PDF byte-for-byte with `main`.

---

## Self-Review

- Spec coverage: CTA order, primary hierarchy, print removal, direct download, reciprocal navigation, HTML-derived resume generation, page count, visual inspection, and live publication all map to explicit tasks.
- Placeholder scan: no TODO/TBD/deferred implementation remains.
- Type consistency: document filenames and route names match the current repository paths.
- Scope: no résumé content claims, cover-letter prose, site thesis, or other campaign artifacts change.
