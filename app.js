import { POSTURE_IDS, resolveFoldState } from './three-fold/postures.js';

const scenarios = {
  reporting: {
    label: 'Weekly client reporting',
    result: 'assist',
    decision: 'Assist',
    note: 'Automate preparation and first-pass synthesis; preserve account-team interpretation and client-specific judgment.',
    heroEvidence: {
      outcome: 'More capacity for strategic analysis',
      trust: 'Structured, reviewable output',
      reuse: 'Recurring, configurable workflow',
      proof: 'Quality, rework, adoption, time saved'
    },
    evidence: {
      outcome: ['strong', 'Clear cycle-time and strategic-capacity benefit'],
      trust: ['strong', 'Structured data and reviewable output'],
      reuse: ['strong', 'Recurring across accounts with configurable KPIs'],
      proof: ['develop', 'Instrument quality, rework, adoption, and time avoided']
    }
  },
  discovery: {
    label: 'Publisher discovery',
    result: 'productize',
    decision: 'Productize',
    note: 'The workflow has reusable data, recurring demand, and a natural place inside APVision - with human curation retained for fit and relationship context.',
    heroEvidence: {
      outcome: 'Broader qualified partner discovery',
      trust: 'Permissioned warehouse data',
      reuse: 'Shared across programs and markets',
      proof: 'Activation and adoption are observable'
    },
    evidence: {
      outcome: ['strong', 'Faster, broader partner opportunity discovery'],
      trust: ['strong', 'Private warehouse and permissioned use'],
      reuse: ['strong', 'Shared capability across programs and markets'],
      proof: ['strong', 'Track qualified opportunities, activation, and account adoption']
    }
  },
  anomaly: {
    label: 'Opportunity / risk review',
    result: 'agentize',
    decision: 'Agentize',
    note: 'Let agents watch defined signals and assemble evidence; require a named human to accept, reject, or escalate the recommendation.',
    heroEvidence: {
      outcome: 'Earlier attention on material signals',
      trust: 'Thresholds and explanations need tuning',
      reuse: 'Common monitoring pattern',
      proof: 'Precision and action rate are measurable'
    },
    evidence: {
      outcome: ['strong', 'Earlier attention on material opportunities and risks'],
      trust: ['develop', 'Thresholds and explanation standards need calibration'],
      reuse: ['strong', 'Common monitoring pattern with client-specific rules'],
      proof: ['develop', 'Validate precision, false alarms, action rate, and outcome']
    }
  },
  briefing: {
    label: 'Influencer / partner briefing',
    result: 'human',
    decision: 'Human-led',
    note: 'Use AI for preparation and retrieval, but keep brand nuance, relationship judgment, and final recommendation visibly human-owned.',
    heroEvidence: {
      outcome: 'Faster preparation; contextual quality risk',
      trust: 'Human review remains essential',
      reuse: 'High variation by brand and partner',
      proof: 'Pilot against an explicit quality rubric'
    },
    evidence: {
      outcome: ['develop', 'Potential speed gain, but quality is highly contextual'],
      trust: ['develop', 'Brand and relationship risk requires close review'],
      reuse: ['weak', 'High variation by client, partner, and campaign'],
      proof: ['develop', 'Pilot with explicit quality rubric before scale']
    }
  }
};

const strengthLabels = {
  weak: 'Early',
  develop: 'Developing',
  strong: 'Strong'
};

let workflowKey = 'reporting';
let postureOverride = null;

function updateEngineEvidence(id, state, text) {
  const face = document.querySelector(`[data-engine-evidence="${id}"]`);
  if (!face) return;

  face.dataset.state = state;
  const evidenceText = face.querySelector('.engine-evidence-text');
  const strengthLabel = face.querySelector('.strength-label');

  if (evidenceText) evidenceText.textContent = text;
  if (strengthLabel) strengthLabel.textContent = strengthLabels[state] || state;
}

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
    evidence: data.evidence
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
    const active = button.dataset.disposition === resolved.result;
    button.setAttribute('aria-pressed', String(active));
    button.removeAttribute('aria-current');
  });

  const result = document.querySelector('.decision-result');
  if (result) result.textContent = resolved.decision;

  const note = document.querySelector('.decision-note');
  if (note) note.textContent = resolved.note;

  const title = document.querySelector('.scenario-title');
  if (title) title.textContent = workflowState.label;

  Object.entries(resolved.evidence).forEach(([id, [strength, text]]) => {
    updateEngineEvidence(id, strength, resolved.heroEvidence[id] || text);

    const detail = document.querySelector(`[data-evidence="${id}"]`);
    if (!detail) return;
    detail.dataset.state = strength;
    const detailText = detail.querySelector('strong');
    if (detailText) detailText.textContent = text;
  });

  const live = document.querySelector('#lab-live');
  if (live && announce) {
    live.textContent = `${workflowState.label}: comparing ${resolved.decision}. ${resolved.note}`;
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
    const currentIndex = dispositionButtons.indexOf(active);
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % dispositionButtons.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + dispositionButtons.length) % dispositionButtons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = dispositionButtons.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      dispositionButtons[nextIndex].focus();
      return;
    }
  }

  if (!active?.classList.contains('scenario')) return;
  const buttons = [...document.querySelectorAll('.scenario')];
  const currentIndex = buttons.indexOf(active);

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    buttons[(currentIndex + 1) % buttons.length].focus();
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    buttons[(currentIndex - 1 + buttons.length) % buttons.length].focus();
  }
});

renderResolvedState({ announce: false });
