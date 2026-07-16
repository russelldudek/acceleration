import { initFoldEngine } from './three-fold/engine.js';

const stage = document.querySelector('.three-fold-stage');
const canvas = document.querySelector('.three-fold-canvas');
const fallback = document.querySelector('.three-fold-fallback');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const forceFallback = new URLSearchParams(window.location.search).get('forceFallback') === '1';

const diagnostics = {
  ready: false,
  renderer: 'uninitialized',
  meshCount: 0,
  state: 'assist',
  phase: 'booting',
  choreography: 'deliberate-handoff',
  rotations: [],
  targetRotations: [],
  aggregateOpening: 0,
  gateAsymmetry: 0,
  decisionGap: 0,
  settled: false,
  fallbackActive: false,
  reducedMotion: reducedMotionQuery.matches,
  continuousAnimation: false,
  frameCount: 0,
  replayCount: 0,
  unfoldDistance: 0,
};
window.__foldEngineDiagnostics = diagnostics;

function synchronizeFallback(nextState) {
  if (!stage || !nextState) return;
  stage.dataset.state = nextState.result;
  diagnostics.state = nextState.result;
  diagnostics.choreography = nextState.choreography || 'deliberate-handoff';
  diagnostics.phase = 'settled';
  diagnostics.settled = true;
  diagnostics.continuousAnimation = false;
}

function activateFallback() {
  if (!stage) return;
  stage.dataset.fallback = 'true';
  stage.dataset.renderer = 'fallback';
  stage.dataset.phase = 'settled';
  canvas?.setAttribute('hidden', '');
  fallback?.setAttribute('aria-hidden', 'false');
  diagnostics.ready = true;
  diagnostics.renderer = 'fallback';
  diagnostics.phase = 'settled';
  diagnostics.fallbackActive = true;
  diagnostics.settled = true;
  synchronizeFallback(window.__foldScenarioState || { result: 'assist', choreography: 'deliberate-handoff' });
  window.addEventListener('foldscenariochange', event => synchronizeFallback(event.detail));
}

if (!stage || !canvas || forceFallback) {
  activateFallback();
} else {
  try {
    initFoldEngine({ stage, canvas, fallback, diagnostics, reducedMotionQuery });
  } catch (error) {
    console.error('Three-dimensional Fold initialization failed.', error);
    activateFallback();
  }
}
