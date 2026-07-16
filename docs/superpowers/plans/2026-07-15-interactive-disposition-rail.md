# Interactive Disposition Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Human-led / Assist / Agentize / Productize rail into an accessible four-button comparison control whose selections preserve the current workflow while producing posture-specific copy, evidence framing, final geometry, and unique Three.js choreography.

**Architecture:** Keep workflow selection and posture override as independent state in `app.js`. Add a pure posture-profile module that owns copy, evidence framing, geometry, and choreography identifiers; `app.js` resolves the effective view state and dispatches it to the renderer. The Three.js engine remains DOM-agnostic and executes one of four posture-specific motion paths while exposing diagnostics for browser tests.

**Tech Stack:** Static HTML/CSS/JavaScript, ES modules, locally vendored Three.js r170, Playwright browser audits, GitHub Actions, GitHub Pages.

## Global Constraints

- The selected workflow remains fixed when a disposition button is activated.
- Workflow selection clears `postureOverride` and restores the workflow's recommended posture.
- Reset restores Weekly client reporting and Assist.
- The four controls are native `<button>` elements in one labeled group.
- Active buttons use `aria-pressed="true"`; inactive buttons use `aria-pressed="false"`.
- Pointer, Enter, Space, Left, Right, Home, and End interactions must work.
- Human-led, Assist, Agentize, and Productize require materially different final geometry and choreography.
- Repeated activation replays the selected choreography for standard motion and is a no-op for reduced motion.
- Rapid activation cancels the active motion and transitions from current hinge positions without snapping.
- Reduced motion applies final geometry immediately with no continuous animation.
- WebGL fallback keeps all disposition buttons functional and updates semantic information state.
- No new workflows, employer claims, résumé content, PDFs, or navigation are introduced.
- The rail must not create clipping or horizontal overflow at 390 px or 320 px.
- Completion requires exact-file verification and live GitHub Pages browser audits against `main`.

---

## File Structure

- Create `three-fold/postures.js`: pure posture profiles and state-resolution helpers; no renderer or DOM code.
- Modify `index.html`: replace passive disposition `<div>` elements with semantic buttons and a labeled control group.
- Modify `app.js`: own `workflowState` and `postureOverride`, synchronize five UI surfaces, manage rail keyboard behavior, and dispatch resolved renderer state.
- Modify `three-fold/engine.js`: accept resolved posture profiles, execute four unique choreographies, cancel active sequences safely, and expose diagnostics.
- Modify `three-fold.js`: extend fallback handling and diagnostics fields for posture/choreography state.
- Modify `styles.css`: button reset, clickable affordance, focus-visible styling, selected styling, compact mobile layout, and fallback posture states.
- Modify `scripts/audit-three-fold.mjs`: assert semantics, keyboard behavior, workflow preservation, unique choreography identifiers, geometry differences, rapid selection, reduced motion, fallback, and responsive bounds.
- Modify `.github/workflows/audit-three-fold.yml`: exact-file gate includes `three-fold/postures.js` and continues to run the browser audit.

---

### Task 1: Add the failing browser contract

**Files:**
- Modify: `scripts/audit-three-fold.mjs`

**Interfaces:**
- Consumes: `window.__foldEngineDiagnostics`, `.three-fold-disposition`, `.disposition-step`, `.three-fold-workflow`.
- Produces: regression assertions that later tasks must satisfy.

- [ ] **Step 1: Replace passive-rail assertions with semantic button assertions**

Add these checks after the existing disposition/stage structure checks:

```js
const rail = page.locator('.three-fold-disposition');
const postureButtons = rail.locator('button.disposition-step');
check(await rail.getAttribute('role') === 'group', `${name}: disposition rail is not a labeled group`);
check((await rail.getAttribute('aria-label'))?.length > 0, `${name}: disposition rail lacks an accessible label`);
check(await postureButtons.count() === 4, `${name}: expected four native posture buttons`);
check(await postureButtons.filter({ has: page.locator('[aria-pressed="true"]') }).count() <= 1, `${name}: multiple posture buttons appear selected`);
```

Use direct per-button checks because nested locator filtering is not reliable for the button itself:

```js
const pressedStates = await postureButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-pressed')));
check(pressedStates.filter(value => value === 'true').length === 1, `${name}: exactly one posture button must be pressed`);
check(pressedStates.every(value => value === 'true' || value === 'false'), `${name}: invalid aria-pressed values`);
```

- [ ] **Step 2: Add a helper that activates every posture and records diagnostics**

Add above the viewport loop:

```js
const POSTURES = ['human', 'assist', 'agentize', 'productize'];

async function activatePosture(page, posture, reducedMotion = false) {
  const button = page.locator(`[data-disposition="${posture}"]`);
  await button.click();
  await page.waitForFunction(
    expected => window.__foldEngineDiagnostics?.state === expected,
    posture,
    { timeout: 5000 },
  );
  if (!reducedMotion) {
    await page.waitForFunction(() => window.__foldEngineDiagnostics?.settled === true, null, { timeout: 6000 });
  }
  return readDiagnostics(page);
}
```

- [ ] **Step 3: Add workflow-preservation and unique-state assertions**

Inside the ready-diagnostics branch, before scenario-reset tests:

```js
const originalWorkflow = (await page.locator('.three-fold-workflow').textContent())?.trim();
const postureSnapshots = {};

for (const posture of POSTURES) {
  postureSnapshots[posture] = await activatePosture(page, posture, Boolean(baseline?.reducedMotion));
  check(
    (await page.locator('.three-fold-workflow').textContent())?.trim() === originalWorkflow,
    `${name}: ${posture} changed the workflow label`,
  );
  check(
    await page.locator(`[data-disposition="${posture}"][aria-pressed="true"]`).count() === 1,
    `${name}: ${posture} did not synchronize aria-pressed`,
  );
}

const choreographyIds = POSTURES.map(posture => postureSnapshots[posture]?.choreography);
check(new Set(choreographyIds).size === 4, `${name}: posture choreographies are not unique (${choreographyIds.join(', ')})`);

const rotationKeys = POSTURES.map(posture => JSON.stringify(postureSnapshots[posture]?.targetRotations?.map(value => Number(value.toFixed(3)))));
check(new Set(rotationKeys).size === 4, `${name}: posture final rotation vectors are not unique`);
```

- [ ] **Step 4: Add semantic geometry assertions**

```js
const opening = posture => postureSnapshots[posture]?.aggregateOpening ?? 0;
check(opening('human') > opening('assist'), `${name}: Human-led is not more open than Assist`);
check(opening('assist') > opening('agentize'), `${name}: Assist is not more open than Agentize`);
check(opening('agentize') > opening('productize'), `${name}: Productize is not the most compact posture`);
check((postureSnapshots.agentize?.gateAsymmetry ?? 0) > 0.12, `${name}: Agentize lacks deliberate review-gate asymmetry`);
check((postureSnapshots.assist?.decisionGap ?? 0) > 0.1, `${name}: Assist lacks a decision gap`);
check(
  Math.abs((postureSnapshots.assist?.decisionGap ?? 0) - (postureSnapshots.agentize?.gateAsymmetry ?? 0)) > 0.04,
  `${name}: Assist and Agentize asymmetries are visually indistinct`,
);
```

- [ ] **Step 5: Add keyboard and rapid-selection assertions**

```js
const humanButton = page.locator('[data-disposition="human"]');
await humanButton.focus();
await page.keyboard.press('ArrowRight');
check(await page.locator('[data-disposition="assist"]:focus').count() === 1, `${name}: rail ArrowRight navigation failed`);
await page.keyboard.press('End');
check(await page.locator('[data-disposition="productize"]:focus').count() === 1, `${name}: rail End navigation failed`);
await page.keyboard.press('Home');
check(await page.locator('[data-disposition="human"]:focus').count() === 1, `${name}: rail Home navigation failed`);
await page.keyboard.press('Enter');
check(await page.locator('[data-disposition="human"][aria-pressed="true"]').count() === 1, `${name}: rail Enter activation failed`);

await page.locator('[data-disposition="human"]').click();
await page.locator('[data-disposition="productize"]').click();
await page.locator('[data-disposition="agentize"]').click();
await page.waitForFunction(() => window.__foldEngineDiagnostics?.state === 'agentize' && window.__foldEngineDiagnostics?.settled === true, null, { timeout: 7000 });
check((await readDiagnostics(page))?.state === 'agentize', `${name}: rapid selections did not settle on the final request`);
```

- [ ] **Step 6: Add fallback and reduced-motion button checks**

For the forced-fallback context:

```js
await fallbackPage.locator('[data-disposition="productize"]').click();
check(await fallbackPage.locator('[data-disposition="productize"][aria-pressed="true"]').count() === 1, 'fallback: Productize button did not activate');
check(await fallbackPage.locator('.three-fold-stage[data-state="productize"]').count() === 1, 'fallback: stage state did not update');
check((await fallbackPage.locator('.three-fold-workflow').textContent())?.trim() === 'Weekly client reporting', 'fallback: posture changed workflow');
```

For reduced motion:

```js
await reducedPage.locator('[data-disposition="agentize"]').click();
const reducedDiagnostics = await readDiagnostics(reducedPage);
check(reducedDiagnostics?.state === 'agentize', 'reduced: Agentize did not apply');
check(reducedDiagnostics?.settled === true, 'reduced: posture did not settle immediately');
check(reducedDiagnostics?.continuousAnimation === false, 'reduced: continuous animation is active');
```

- [ ] **Step 7: Run the current test to verify it fails for missing interactivity**

Run:

```bash
npm install --no-save playwright@1.55.0
python3 -m http.server 4173 >/tmp/acceleration-http.log 2>&1 &
AUDIT_URL=http://127.0.0.1:4173 AUDIT_OUTPUT=audit-evidence node scripts/audit-three-fold.mjs
```

Expected: FAIL messages include missing native posture buttons, missing unique choreography diagnostics, or inability to activate a posture.

- [ ] **Step 8: Commit the red contract**

```bash
git add scripts/audit-three-fold.mjs
git commit -m "test: require interactive posture rail"
```

---

### Task 2: Add the pure posture interpretation module

**Files:**
- Create: `three-fold/postures.js`

**Interfaces:**
- Consumes: workflow state shaped as `{ key, label, result, heroEvidence, evidence }`.
- Produces: `POSTURE_PROFILES`, `resolveFoldState(workflowState, postureOverride)`, and `normalizePosture(value)`.

- [ ] **Step 1: Create posture profiles with copy and geometry**

```js
export const POSTURE_IDS = ['human', 'assist', 'agentize', 'productize'];

export const POSTURE_PROFILES = {
  human: {
    id: 'human',
    decision: 'Human-led',
    choreography: 'open-forum',
    explanation: 'AI prepares context, but relationship judgment, nuance, and the consequential decision remain visibly human-owned.',
    evidenceFrame: {
      outcome: 'Use AI to improve preparation without transferring the decision.',
      reuse: 'Reuse retrieval and templates; preserve contextual interpretation.',
      trust: 'Human authority remains the primary control surface.',
      proof: 'Measure preparation quality and decision support, not autonomous output.',
    },
    geometry: {
      angles: { outcome: 0.15, reuse: 0.13, trust: -0.17, proof: -0.14 },
      rotation: [-0.01, -0.04, 0.01],
      scale: 1.03,
      position: [0, 0.05, 0.08],
    },
  },
  assist: {
    id: 'assist',
    decision: 'Assist',
    choreography: 'deliberate-handoff',
    explanation: 'AI prepares and synthesizes the work; an expert reviews the evidence and owns the consequential decision.',
    evidenceFrame: {
      outcome: 'Convert preparation time into more strategic expert capacity.',
      reuse: 'Standardize recurring preparation while preserving configuration.',
      trust: 'Keep output structured, reviewable, and explicitly approved.',
      proof: 'Track time saved, quality, rework, and adoption before expanding scope.',
    },
    geometry: {
      angles: { outcome: 0.48, reuse: 0.52, trust: -0.42, proof: -0.34 },
      rotation: [-0.04, 0.08, -0.018],
      scale: 1,
      position: [0, 0, 0],
    },
  },
  agentize: {
    id: 'agentize',
    decision: 'Agentize',
    choreography: 'controlled-enclosure',
    explanation: 'Bounded autonomy handles defined work while thresholds, escalation, monitoring, and human override remain explicit.',
    evidenceFrame: {
      outcome: 'Delegate repeatable monitoring and preparation within a bounded mandate.',
      reuse: 'Encode shared rules while isolating client-specific thresholds.',
      trust: 'Leave a visible review gate for escalation and override.',
      proof: 'Measure precision, exceptions, overrides, and recovery behavior.',
    },
    geometry: {
      angles: { outcome: 0.82, reuse: 0.8, trust: -0.55, proof: -0.84 },
      rotation: [-0.09, -0.12, 0.035],
      scale: 0.96,
      position: [0.08, 0.02, 0.14],
    },
  },
  productize: {
    id: 'productize',
    decision: 'Productize',
    choreography: 'locked-capability',
    explanation: 'The workflow becomes a configurable, owned capability with standard interfaces, adoption evidence, and controlled variation.',
    evidenceFrame: {
      outcome: 'Package the value proposition as a repeatable client capability.',
      reuse: 'Design configuration boundaries and reusable interfaces.',
      trust: 'Define ownership, controls, release policy, and support expectations.',
      proof: 'Track adoption, unit economics, quality, and scaled outcome delivery.',
    },
    geometry: {
      angles: { outcome: 1.14, reuse: 1.11, trust: -1.09, proof: -1.12 },
      rotation: [-0.16, 0.02, 0],
      scale: 0.91,
      position: [0, -0.02, 0.48],
    },
  },
};
```

- [ ] **Step 2: Add safe normalization and state resolution**

```js
let warnedUnknownPosture = false;

export function normalizePosture(value) {
  if (POSTURE_IDS.includes(value)) return value;
  if (!warnedUnknownPosture) {
    console.warn(`Unknown Fold posture "${value}"; falling back to Assist.`);
    warnedUnknownPosture = true;
  }
  return 'assist';
}

export function resolveFoldState(workflowState, postureOverride = null) {
  const posture = normalizePosture(postureOverride || workflowState.result);
  const profile = POSTURE_PROFILES[posture];
  return {
    ...workflowState,
    recommendedPosture: workflowState.result,
    postureOverride,
    result: posture,
    decision: profile.decision,
    note: profile.explanation,
    choreography: profile.choreography,
    postureProfile: profile,
    heroEvidence: { ...profile.evidenceFrame },
    evidence: Object.fromEntries(
      Object.entries(workflowState.evidence).map(([id, [strength]]) => [id, [strength, profile.evidenceFrame[id]]]),
    ),
  };
}
```

- [ ] **Step 3: Validate the module directly**

Run:

```bash
node --input-type=module - <<'NODE'
import { POSTURE_IDS, POSTURE_PROFILES, resolveFoldState } from './three-fold/postures.js';
const workflow = { key: 'reporting', label: 'Weekly client reporting', result: 'assist', evidence: { outcome:['strong'], reuse:['strong'], trust:['strong'], proof:['develop'] } };
const resolved = POSTURE_IDS.map(id => resolveFoldState(workflow, id));
if (new Set(resolved.map(item => item.choreography)).size !== 4) process.exit(1);
if (new Set(resolved.map(item => JSON.stringify(item.postureProfile.geometry.angles))).size !== 4) process.exit(1);
console.log('posture profiles: PASS');
NODE
```

Expected: `posture profiles: PASS`.

- [ ] **Step 4: Commit**

```bash
git add three-fold/postures.js
git commit -m "feat: define Fold posture profiles"
```

---

### Task 3: Convert the passive rail into accessible controls

**Files:**
- Modify: `index.html:73-78`
- Modify: `styles.css` disposition rail section

**Interfaces:**
- Consumes: posture IDs `human`, `assist`, `agentize`, `productize`.
- Produces: native buttons addressable through `[data-disposition]` and `aria-pressed`.

- [ ] **Step 1: Replace the rail markup**

Use this structure while preserving the existing SVGs and copy:

```html
<div class="three-fold-disposition" role="group" aria-label="Compare operating postures for the current workflow">
  <button type="button" class="disposition-step" data-disposition="human" aria-pressed="false">
    <!-- existing Human-led SVG -->
    <span><strong>Human-led</strong><small>Context remains decisive</small></span>
  </button>
  <button type="button" class="disposition-step" data-disposition="assist" aria-pressed="true">
    <!-- existing Assist SVG -->
    <span><strong>Assist</strong><small>AI prepares; experts decide</small></span>
  </button>
  <button type="button" class="disposition-step" data-disposition="agentize" aria-pressed="false">
    <!-- existing Agentize SVG -->
    <span><strong>Agentize</strong><small>Bounded autonomy + review</small></span>
  </button>
  <button type="button" class="disposition-step" data-disposition="productize" aria-pressed="false">
    <!-- existing Productize SVG -->
    <span><strong>Productize</strong><small>Reusable capability at scale</small></span>
  </button>
</div>
```

- [ ] **Step 2: Add button-reset and interaction styles**

```css
.disposition-step {
  appearance: none;
  width: 100%;
  border: 1px solid transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
}

.disposition-step:hover:not([aria-pressed="true"]) {
  color: var(--text);
  background: rgba(139, 219, 226, .055);
  border-color: rgba(139, 219, 226, .12);
}

.disposition-step:focus-visible {
  outline: 3px solid #f8fbfc;
  outline-offset: 3px;
  box-shadow: 0 0 0 6px rgba(84, 187, 203, .34);
}

.disposition-step[aria-pressed="true"] {
  color: #061723;
  background: linear-gradient(135deg, #9fe6ef, #67bfd1);
  border-color: rgba(255,255,255,.34);
  box-shadow: 0 12px 30px rgba(42, 154, 179, .24);
}
```

Keep the existing responsive grid but ensure at `max-width: 520px` the rail becomes two columns, and at `max-width: 350px` one column:

```css
@media (max-width: 520px) {
  .three-fold-disposition { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 350px) {
  .three-fold-disposition { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Run a static semantic check**

```bash
python3 - <<'PY'
from pathlib import Path
html = Path('index.html').read_text()
assert html.count('<button type="button" class="disposition-step"') == 4
assert 'role="group"' in html
assert html.count('aria-pressed=') == 4
print('disposition markup: PASS')
PY
```

Expected: `disposition markup: PASS`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: make disposition rail accessible controls"
```

---

### Task 4: Implement workflow-preserving posture state in the scenario controller

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `resolveFoldState(workflowState, postureOverride)` from `three-fold/postures.js`.
- Produces: `window.__foldScenarioState`, `foldscenariochange`, and resolved DOM state.

- [ ] **Step 1: Import the resolver and define state variables**

At the top:

```js
import { POSTURE_IDS, resolveFoldState } from './three-fold/postures.js';

let workflowKey = 'reporting';
let postureOverride = null;
```

Ensure `index.html` loads `app.js` with `type="module"`.

- [ ] **Step 2: Split scenario selection from resolved-view rendering**

Replace `applyScenario` with:

```js
function buildWorkflowState(key) {
  const data = scenarios[key];
  if (!data) return null;
  return {
    key,
    label: data.label,
    result: data.result,
    decision: data.decision,
    note: data.note,
    heroEvidence: data.heroEvidence,
    evidence: data.evidence,
  };
}

function renderResolvedState({ announce = true } = {}) {
  const workflowState = buildWorkflowState(workflowKey);
  if (!workflowState) return;
  const resolved = resolveFoldState(workflowState, postureOverride);

  document.querySelectorAll('.scenario').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.scenario === workflowKey));
  });

  const stage = document.querySelector('.three-fold-stage');
  if (stage) stage.dataset.state = resolved.result;

  const workflowName = document.querySelector('.three-fold-workflow');
  if (workflowName) workflowName.textContent = workflowState.label;

  document.querySelectorAll('.disposition-step').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.disposition === resolved.result));
  });

  document.querySelector('.decision-result')?.replaceChildren(resolved.decision);
  document.querySelector('.decision-note')?.replaceChildren(resolved.note);
  document.querySelector('.scenario-title')?.replaceChildren(workflowState.label);

  Object.entries(resolved.evidence).forEach(([id, [strength, text]]) => {
    updateEngineEvidence(id, strength, resolved.heroEvidence[id] || text);
    const detail = document.querySelector(`[data-evidence="${id}"]`);
    if (!detail) return;
    detail.dataset.state = strength;
    detail.querySelector('strong')?.replaceChildren(text);
  });

  if (announce) {
    document.querySelector('#lab-live')?.replaceChildren(
      `${workflowState.label}: comparing ${resolved.decision}. ${resolved.note}`,
    );
  }

  window.__foldScenarioState = resolved;
  window.dispatchEvent(new CustomEvent('foldscenariochange', { detail: resolved }));
}

function selectWorkflow(key) {
  if (!scenarios[key]) return;
  workflowKey = key;
  postureOverride = null;
  renderResolvedState();
}

function selectPosture(posture) {
  if (!POSTURE_IDS.includes(posture)) return;
  postureOverride = posture;
  renderResolvedState();
}
```

- [ ] **Step 3: Wire pointer and keyboard controls**

```js
document.querySelectorAll('.scenario').forEach(button => {
  button.addEventListener('click', () => selectWorkflow(button.dataset.scenario));
});

document.querySelector('.scenario-reset')?.addEventListener('click', () => {
  workflowKey = 'reporting';
  postureOverride = null;
  renderResolvedState();
});

const dispositionButtons = [...document.querySelectorAll('button.disposition-step')];
dispositionButtons.forEach(button => {
  button.addEventListener('click', () => selectPosture(button.dataset.disposition));
});

document.addEventListener('keydown', event => {
  const active = document.activeElement;
  if (active?.classList.contains('disposition-step')) {
    const index = dispositionButtons.indexOf(active);
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % dispositionButtons.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + dispositionButtons.length) % dispositionButtons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = dispositionButtons.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      dispositionButtons[nextIndex].focus();
      return;
    }
  }
  // retain existing scenario keyboard behavior below
});
```

Native Enter and Space activation require no custom listener.

- [ ] **Step 4: Initialize without announcing twice**

```js
renderResolvedState({ announce: false });
```

- [ ] **Step 5: Run the browser audit**

Run the Task 1 audit command.

Expected: semantic/button/workflow-preservation checks pass; choreography/geometry diagnostics may still fail until Task 5.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html
git commit -m "feat: preserve workflow while comparing postures"
```

---

### Task 5: Implement four unique Three.js posture choreographies

**Files:**
- Modify: `three-fold/engine.js`
- Modify: `three-fold.js`

**Interfaces:**
- Consumes: resolved state containing `postureProfile.geometry`, `choreography`, `result`, and evidence strengths.
- Produces diagnostics fields `choreography`, `aggregateOpening`, `gateAsymmetry`, `decisionGap`, `targetRotations`, `phase`, `settled`, and `state`.

- [ ] **Step 1: Extend diagnostics defaults**

In `three-fold.js`:

```js
choreography: 'deliberate-handoff',
aggregateOpening: 0,
gateAsymmetry: 0,
decisionGap: 0,
```

In fallback activation, listen for `foldscenariochange` and synchronize state:

```js
window.addEventListener('foldscenariochange', event => {
  const nextState = event.detail;
  if (!nextState) return;
  stage.dataset.state = nextState.result;
  diagnostics.state = nextState.result;
  diagnostics.choreography = nextState.choreography;
  diagnostics.settled = true;
  diagnostics.continuousAnimation = false;
});
```

- [ ] **Step 2: Replace angle derivation with profile geometry**

In `engine.js`, replace `STATE_ANGLES` use with:

```js
const targetFor = (panel, nextState) => {
  const configured = nextState.postureProfile?.geometry?.angles?.[panel.id];
  if (Number.isFinite(configured)) return configured;
  const evidence = nextState.evidence?.[panel.id]?.[0] || 'develop';
  return panel.sign * 0.52 * (STRENGTH_SCALE[evidence] ?? STRENGTH_SCALE.develop);
};
```

Add:

```js
function finalAssemblyFor(nextState) {
  const geometry = nextState.postureProfile?.geometry;
  return {
    rotation: geometry?.rotation || [-0.04, 0.08, -0.018],
    scale: geometry?.scale ?? 1,
    position: geometry?.position || [0, 0, 0],
  };
}
```

- [ ] **Step 3: Add choreography timing profiles**

```js
const CHOREOGRAPHIES = {
  'open-forum': {
    refoldDuration: 320,
    holdDuration: 90,
    unfoldDuration: 900,
    delays: [0, 35, 20, 55],
    mode: 'broad-open',
  },
  'deliberate-handoff': {
    refoldDuration: 380,
    holdDuration: 120,
    unfoldDuration: 1120,
    delays: [0, 75, 230, 330],
    mode: 'handoff',
  },
  'controlled-enclosure': {
    refoldDuration: 410,
    holdDuration: 110,
    unfoldDuration: 1180,
    delays: [100, 0, 260, 60],
    mode: 'guarded',
  },
  'locked-capability': {
    refoldDuration: 520,
    holdDuration: 260,
    unfoldDuration: 760,
    delays: [0, 0, 0, 0],
    mode: 'lock',
  },
};
```

- [ ] **Step 4: Store current positions and cancel safely**

At sequence start:

```js
const choreography = CHOREOGRAPHIES[nextState.choreography] || CHOREOGRAPHIES['deliberate-handoff'];
const finalAssembly = finalAssemblyFor(nextState);
animation = {
  startTime: performance.now(),
  starts: panels.map(panel => panel.group.rotation[panel.axis]),
  closed: panels.map(closedFor),
  finals: panels.map(panel => panel.finalTarget),
  assemblyStart: {
    rotation: [system.rotation.x, system.rotation.y, system.rotation.z],
    scale: system.scale.x,
    position: [system.position.x, system.position.y, system.position.z],
  },
  finalAssembly,
  ...choreography,
};
```

Assigning a new `animation` object cancels the active sequence while preserving current values as the next start state.

- [ ] **Step 5: Implement posture-specific interpolation**

Use a helper:

```js
function panelProgress(animation, elapsed, index) {
  const local = elapsed - animation.refoldDuration - animation.holdDuration - animation.delays[index];
  return THREE.MathUtils.clamp(local / animation.unfoldDuration, 0, 1);
}
```

Then branch by `animation.mode`:

```js
if (animation.mode === 'broad-open') {
  // nearly simultaneous outward sweep
  panels.forEach((panel, index) => {
    const progress = easeOutBack(panelProgress(animation, elapsed, index));
    panel.group.rotation[panel.axis] = THREE.MathUtils.lerp(animation.closed[index], animation.finals[index], progress);
  });
}

if (animation.mode === 'handoff') {
  // Outcome + Reuse, then Trust, then Proof; existing generic stagger is replaced by explicit delays
}

if (animation.mode === 'guarded') {
  // Reuse + Outcome establish enclosure, Proof advances, Trust intentionally finishes at the wider review-gate target
  const proofIndex = panels.findIndex(panel => panel.id === 'proof');
  const proofPulse = Math.sin(Math.PI * panelProgress(animation, elapsed, proofIndex)) * 0.16;
  panels[proofIndex].mesh.position.z = panels[proofIndex].basePosition.z + proofPulse;
}

if (animation.mode === 'lock') {
  // Hold compact package, rotate/advance together, then reveal the final narrow product form
}
```

Reset any temporary proof `position.z` to its base position when the sequence settles.

- [ ] **Step 6: Apply posture-specific final assembly**

In immediate settle and final settle:

```js
const assembly = finalAssemblyFor(nextState);
system.rotation.set(...assembly.rotation);
system.scale.setScalar(assembly.scale);
system.position.set(...assembly.position);
```

- [ ] **Step 7: Expose semantic diagnostics**

In `updateDiagnostics()`:

```js
const absoluteRotations = panels.map(panel => Math.abs(panel.group.rotation[panel.axis]));
diagnostics.choreography = state.choreography;
diagnostics.aggregateOpening = absoluteRotations.reduce((sum, value) => sum + (CLOSED_ANGLE - value), 0);
const trustRotation = Math.abs(panels.find(panel => panel.id === 'trust').group.rotation.y);
const peerAverage = ['outcome', 'reuse', 'proof']
  .map(id => panels.find(panel => panel.id === id))
  .reduce((sum, panel) => sum + Math.abs(panel.group.rotation[panel.axis]), 0) / 3;
diagnostics.gateAsymmetry = Math.abs(peerAverage - trustRotation);
const proofRotation = Math.abs(panels.find(panel => panel.id === 'proof').group.rotation.x);
diagnostics.decisionGap = Math.abs(trustRotation - proofRotation);
```

- [ ] **Step 8: Run the full browser audit**

Run the Task 1 command.

Expected: all interactive posture, unique choreography, geometry, keyboard, rapid-selection, reduced-motion, fallback, and responsive checks pass.

- [ ] **Step 9: Commit**

```bash
git add three-fold.js three-fold/engine.js
git commit -m "feat: add four posture-specific Fold choreographies"
```

---

### Task 6: Extend publication gates and complete live verification

**Files:**
- Modify: `.github/workflows/audit-three-fold.yml`
- Modify: `scripts/audit-three-fold.mjs` only if a test-harness defect is found; do not weaken semantic assertions.

**Interfaces:**
- Consumes: final branch files.
- Produces: PR audit evidence and exact public-file verification.

- [ ] **Step 1: Add the posture module to dependency verification**

Ensure the workflow checks:

```bash
test -s three-fold/postures.js
grep -q "resolveFoldState" three-fold/postures.js
grep -q "open-forum" three-fold/postures.js
grep -q "controlled-enclosure" three-fold/postures.js
grep -q "locked-capability" three-fold/postures.js
```

- [ ] **Step 2: Run static source checks**

```bash
node --check app.js
node --check three-fold.js
node --check three-fold/engine.js
node --check three-fold/geometry.js
node --check three-fold/postures.js
```

Expected: no output and exit code 0.

- [ ] **Step 3: Open a pull request and wait for both audits**

```bash
gh pr create \
  --base main \
  --head feature/interactive-disposition-rail \
  --title "Make the Fold disposition rail interactive" \
  --body "Adds workflow-preserving Human-led, Assist, Agentize, and Productize comparison buttons with unique Three.js choreography, accessible keyboard controls, reduced-motion behavior, fallback behavior, and responsive browser audits."
```

Expected: PR URL and two checks: `PR live campaign audit` and `Three-dimensional Fold audit`.

- [ ] **Step 4: Inspect screenshots and diagnostics rather than relying only on green status**

Confirm at desktop, laptop, tablet, 390 px, and 320 px:

- Every rail control looks clickable.
- Active, hover, and focus states are visually distinct.
- Human-led visibly exposes the core.
- Assist visibly preserves a decision gap.
- Agentize visibly creates a guarded enclosure with an open Trust gate.
- Productize visibly becomes the most compact form and advances as one unit.
- Updated information does not overlap the Fold or rail.

- [ ] **Step 5: Merge only after both checks and screenshot review pass**

```bash
gh pr merge --squash --delete-branch
```

Expected: merge succeeds and returns the new `main` SHA.

- [ ] **Step 6: Run an audit-only PR against the public Pages URL**

The audit must compare these live files byte-for-byte with `main` before running Playwright:

```text
index.html
styles.css
app.js
three-fold.js
three-fold/engine.js
three-fold/geometry.js
three-fold/postures.js
assets/vendor/three/three.module.min.js
```

Expected: exact-file gate passes, then live browser audit passes all viewports and interaction states.

- [ ] **Step 7: Record the completed state in private portfolio memory**

Update the Acceleration Partners case with:

```text
The disposition rail became a direct comparison control. Human-led, Assist, Agentize, and Productize preserve the selected workflow while changing posture-specific copy, evidence framing, final geometry, and unique folded motion. Live exact-file and browser audits passed.
```

Do not promote the exact four-posture choreography as a reusable template; retain it as an Acceleration Partners case-specific experiment.

---

## Plan Self-Review

- Spec coverage: every interaction, state, motion, accessibility, reduced-motion, fallback, error-handling, visual, and live-publication requirement maps to a task above.
- Placeholder scan: no TBD, TODO, deferred implementation, or unspecified tests remain.
- Type consistency: posture IDs are consistently `human`, `assist`, `agentize`, and `productize`; resolved states consistently use `postureProfile`, `choreography`, `result`, and `evidence`; diagnostics names match the audit contract.
- Scope: the plan changes only the existing Fold interaction and its tests; no résumé, PDF, workflow, company-claim, or navigation expansion is included.
