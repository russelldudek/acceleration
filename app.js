const scenarios = {
  reporting: {
    label: 'Weekly client reporting',
    result: 'assist',
    decision: 'Assist',
    note: 'Automate preparation and first-pass synthesis; preserve account-team interpretation and client-specific judgment.',
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

function updateEngineEvidence(id, state, text) {
  const face = document.querySelector(`[data-engine-evidence="${id}"]`);
  if (!face) return;

  face.dataset.state = state;
  const evidenceText = face.querySelector('.engine-evidence-text');
  const strengthLabel = face.querySelector('.strength-label');
  const strengthRail = face.querySelector('.strength-rail');

  if (evidenceText) evidenceText.textContent = text;
  if (strengthLabel) strengthLabel.textContent = strengthLabels[state] || state;
  if (strengthRail) strengthRail.setAttribute('aria-label', `${strengthLabels[state] || state} evidence`);
}

function applyScenario(key) {
  const data = scenarios[key];
  if (!data) return;

  document.querySelectorAll('.scenario').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.scenario === key));
  });

  const engine = document.querySelector('.origami-engine');
  if (engine) engine.dataset.result = data.result;

  const workflowName = document.querySelector('.origami-workflow-name');
  if (workflowName) workflowName.textContent = data.label;

  document.querySelectorAll('.disposition-step').forEach(step => {
    step.setAttribute('aria-current', String(step.dataset.disposition === data.result));
  });

  const result = document.querySelector('.decision-result');
  if (result) result.textContent = data.decision;

  const note = document.querySelector('.decision-note');
  if (note) note.textContent = data.note;

  const title = document.querySelector('.scenario-title');
  if (title) title.textContent = data.label;

  Object.entries(data.evidence).forEach(([id, [state, text]]) => {
    updateEngineEvidence(id, state, text);

    const detail = document.querySelector(`[data-evidence="${id}"]`);
    if (!detail) return;
    detail.dataset.state = state;
    const detailText = detail.querySelector('strong');
    if (detailText) detailText.textContent = text;
  });

  const live = document.querySelector('#lab-live');
  if (live) live.textContent = `${data.label}: disposition ${data.decision}. ${data.note}`;
}

document.querySelectorAll('.scenario').forEach(button => {
  button.addEventListener('click', () => applyScenario(button.dataset.scenario));
});

document.querySelector('.scenario-reset')?.addEventListener('click', () => applyScenario('reporting'));

document.addEventListener('keydown', event => {
  const active = document.activeElement;
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

applyScenario('reporting');
