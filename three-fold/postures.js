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
  const evidence = Object.fromEntries(
    Object.entries(workflowState.evidence).map(([id, [strength]]) => [
      id,
      [strength, profile.evidenceFrame[id]],
    ]),
  );

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
    evidence,
  };
}
