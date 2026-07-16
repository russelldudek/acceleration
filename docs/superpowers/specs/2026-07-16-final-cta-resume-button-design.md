# Final CTA Button Hierarchy Design

## Goal

Add the missing résumé action to the closing candidate-vision call to action and establish the approved reading order:

1. Résumé
2. Cover letter
3. Interview thesis brief

## Visual hierarchy

- Résumé is the primary filled button because it is the most conventional and broadly useful recruiter action.
- Cover letter is the first secondary outlined button.
- Interview thesis brief is the second secondary outlined button.
- All three buttons remain inside the existing centered `.hero-actions` container and use the campaign's established button classes.

## Links

- Résumé → `resume.html`
- Cover letter → `cover-letter.html`
- Interview thesis brief → `interview-brief.html`

## Responsive behavior

- Preserve the existing flexible wrapping behavior.
- Maintain the approved order in both visual and DOM sequence.
- Do not introduce new CSS unless the three-button row exposes a real spacing or wrapping defect during verification.

## Accessibility

- Use descriptive visible button text.
- Preserve native anchor behavior and keyboard accessibility.
- Keep focus treatment inherited from the existing button system.

## Scope

Only the closing CTA button group changes. The headline, explanatory paragraph, navigation, résumé page, cover-letter page, interview brief, documents, and other site sections remain unchanged.

## Verification

- Confirm all three links exist in the closing CTA and appear in the approved order.
- Confirm Résumé uses the filled `button light` treatment.
- Confirm Cover letter and Interview thesis brief use `button secondary`.
- Confirm no horizontal overflow at desktop, tablet, 390px, and 320px widths.
- Confirm all three destination pages return successfully after GitHub Pages publishes the change.
