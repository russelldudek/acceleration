# Interactive Disposition Rail Design

## Purpose

Turn the existing Human-led / Assist / Agentize / Productize disposition rail from a passive status display into a direct comparison control for the Service-to-Product Fold.

The selected workflow remains fixed. Clicking a disposition changes how that same workflow is operated, allowing the visitor to compare four postures without changing the underlying business scenario.

## Interaction Contract

Each disposition item becomes a native `<button>` inside a single labeled control group. The active button uses `aria-pressed="true"`; inactive buttons use `aria-pressed="false"`.

Activation methods:

- Pointer click or tap.
- Enter or Space while focused.
- Left and Right arrows move focus among the four controls.
- Home and End move focus to the first or last control.

Selecting a posture updates five synchronized surfaces:

1. The four physical hinge targets.
2. The unfolding choreography.
3. The center explanation.
4. The evidence-card language and emphasis.
5. The active disposition control.

The workflow title does not change. Scenario controls above the Fold continue to change the workflow and its evidence baseline. The disposition rail then acts as an explicit override for comparing operating postures within that workflow.

## Four Distinct Three-Dimensional Behaviors

### Human-led — Open Forum

The Fold opens outward and remains visibly incomplete. The central core is fully exposed, communicating that context and human judgment remain decisive.

Motion sequence:

- Refold briefly to establish a common transition origin.
- All planes swing outward in a broad, nearly simultaneous opening.
- The assembly settles with a wider camera-facing posture and no enclosing motion.

Information emphasis:

- Human authority.
- Context sensitivity.
- Relationship judgment.
- AI limited to preparation or retrieval.

### Assist — Deliberate Hand-off

The Fold partially closes but preserves a clear decision gap. AI prepares the work; an expert makes the consequential decision.

Motion sequence:

- Outcome and Reuse open first.
- Trust follows and pauses short of closure.
- Proof remains slightly more open, visually representing the need to observe value.
- The assembly resolves into the current balanced posture.

Information emphasis:

- Preparation and synthesis.
- Expert approval.
- Reviewable output.
- Time saved without transferred accountability.

### Agentize — Controlled Enclosure

The Fold forms a guarded enclosure around the core while leaving one deliberate review gate open.

Motion sequence:

- Reuse and Outcome close inward first to establish repeatability and purpose.
- Trust closes more slowly and stops at a visible gate angle.
- Proof pulses forward as the monitoring and evaluation surface.
- The assembly rotates slightly toward the open Trust gate.

Information emphasis:

- Bounded autonomy.
- Thresholds and escalation.
- Human override.
- Monitoring, exception handling, and auditability.

### Productize — Locked Capability

The Fold resolves into the most compact and coherent product form. The four planes align tightly and the assembly moves forward as one reusable unit.

Motion sequence:

- All four planes refold into a compact package.
- A short lock beat aligns the hinges.
- The package rotates and advances toward the camera.
- The planes reopen only enough to reveal a unified, finished capability rather than an exposed workflow.

Information emphasis:

- Reusability and configuration.
- Adoption and unit economics.
- Standard interfaces and ownership.
- Scale with controlled variation.

## State Model

Two independent state dimensions are maintained:

- `workflowState`: selected business scenario and its evidence baseline.
- `postureOverride`: null or one of `human`, `assist`, `agentize`, `productize`.

When `postureOverride` is null, the recommended posture from the workflow scenario is active.

When a disposition button is selected, the override is applied while preserving the workflow label and baseline evidence. The evidence copy is reframed to explain the implications of operating that workflow under the selected posture; no company facts or candidate evidence are changed.

Changing the workflow clears the explicit override and restores that workflow's recommended posture. Reset also restores the reporting workflow and its recommended Assist posture.

## Component Boundaries

### HTML disposition controls

Responsibilities:

- Semantic buttons and accessibility state.
- Focus management and keyboard navigation.
- Dispatching a posture-selection event.

Dependencies:

- Existing disposition rail styling.
- Scenario state from `app.js`.

### Posture interpretation module

A small data module maps each posture to:

- Motion choreography identifier.
- Final hinge-angle profile.
- Assembly rotation, scale, and position.
- Center explanation.
- Evidence-card framing.

The module contains no renderer code and can be tested as pure data.

### Three.js choreography engine

Responsibilities:

- Accept a workflow state plus posture profile.
- Execute the posture-specific animation path.
- Expose diagnostics for selected posture, phase, rotations, and choreography name.

The engine remains independent of button DOM details.

### Scenario controller

Responsibilities:

- Preserve the current workflow.
- Apply or clear posture overrides.
- Synchronize text, evidence cards, buttons, and Three.js state.

## Reduced Motion and Fallback

With `prefers-reduced-motion: reduce`, selecting a posture immediately applies its final geometry and information state. No refold, stagger, pulse, camera advance, or idle animation runs.

When WebGL is unavailable, the same buttons remain functional. The semantic fallback changes its CSS state and information content to represent the selected posture without claiming three-dimensional animation.

## Error Handling

- A missing posture profile falls back to Assist and logs one descriptive console warning.
- Repeated activation of the already-selected posture replays its unique choreography for standard-motion users and is a no-op under reduced motion.
- Rapid selections cancel the active sequence and begin the newly selected posture from the current hinge positions, avoiding visual snapping.
- Button operation remains available if the renderer fails.

## Visual Rules

- The active control remains clearly filled; hover and focus states must not resemble active selection.
- A visible focus ring must pass against both active and inactive surfaces.
- The rail stays integrated into the stage and must not cause horizontal overflow at 390 px or 320 px.
- Information updates must not obscure the Fold or overlap the disposition rail.
- The controls must look clickable without introducing generic raised-card styling.

## Test Contract

Automated browser tests must verify:

- Four native buttons exist in one labeled group.
- Pointer and keyboard activation work.
- `aria-pressed` and visible active state remain synchronized.
- Selecting each posture preserves the current workflow label.
- Each posture reports a unique choreography identifier.
- Each posture produces a materially different final rotation vector.
- Human-led has the widest aggregate opening.
- Productize has the most compact aggregate opening.
- Agentize retains a deliberate review-gate asymmetry.
- Assist preserves a decision-gap asymmetry distinct from Agentize.
- Rapid posture changes settle on the final requested state.
- Scenario change clears the override and restores the recommended posture.
- Reset restores Weekly client reporting and Assist.
- Reduced-motion selection resolves immediately with no continuous animation.
- Forced fallback retains full button functionality.
- No console errors, failed requests, clipping, label overflow, or horizontal page overflow occur at desktop, laptop, tablet, 390 px mobile, and 320 px mobile.
- The live GitHub Pages files match the audited `main` source before completion is claimed.

## Scope Boundary

This change does not add new workflows, company claims, résumé content, PDFs, or navigation. It only turns the existing disposition rail into an interactive comparison layer for the current Service-to-Product Fold.
