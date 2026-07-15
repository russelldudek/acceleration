import * as THREE from './assets/vendor/three/three.module.min.js';

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
  rotations: [],
  targetRotations: [],
  settled: false,
  fallbackActive: false,
  reducedMotion: reducedMotionQuery.matches,
  continuousAnimation: false,
  frameCount: 0,
  replayCount: 0,
  unfoldDistance: 0,
};
window.__foldEngineDiagnostics = diagnostics;

if (!stage || !canvas || forceFallback) {
  activateFallback();
} else {
  try {
    initializeScene();
  } catch (error) {
    console.error('Three-dimensional Fold initialization failed.', error);
    activateFallback();
  }
}

function activateFallback() {
  if (!stage) return;
  stage.dataset.fallback = 'true';
  stage.dataset.renderer = 'fallback';
  stage.dataset.phase = 'settled';
  canvas?.setAttribute('hidden', '');
  fallback?.setAttribute('aria-hidden', 'false');
  revealInterface(true);
  diagnostics.ready = true;
  diagnostics.renderer = 'fallback';
  diagnostics.phase = 'settled';
  diagnostics.fallbackActive = true;
  diagnostics.settled = true;
}

function initializeScene() {
  const contextOptions = {
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
  };
  const context = canvas.getContext('webgl2', contextOptions) || canvas.getContext('webgl', contextOptions);
  if (!context) throw new Error('WebGL unavailable');

  stage.dataset.fallback = 'false';
  stage.dataset.renderer = 'three';
  stage.dataset.phase = 'folded';
  fallback?.setAttribute('aria-hidden', 'true');

  const renderer = new THREE.WebGLRenderer({ canvas, context, ...contextOptions });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
  camera.position.set(6.9, 6.0, 13.2);
  camera.lookAt(0, -0.15, 0);

  const system = new THREE.Group();
  system.rotation.set(-0.34, 0.42, -0.08);
  system.scale.setScalar(0.83);
  system.position.set(0, 0.08, -0.35);
  scene.add(system);

  const hemisphere = new THREE.HemisphereLight(0xeafaff, 0x07111c, 2.25);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffffff, 4.4);
  key.position.set(-5.5, 8, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.bias = -0.00035;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x54bbcb, 2.4);
  rim.position.set(8, -3, 8);
  scene.add(rim);

  const fill = new THREE.PointLight(0x5b93d8, 1.2, 24, 2);
  fill.position.set(0, 0.5, 8);
  scene.add(fill);

  const backing = createRoundedPlate(4.75, 3.48, 0.16, 0.28, {
    color: 0x0b1a27,
    roughness: 0.74,
    metalness: 0.05,
  });
  backing.position.z = -0.16;
  backing.receiveShadow = true;
  system.add(backing);

  const core = createRoundedPlate(4.28, 3.05, 0.25, 0.3, {
    color: 0xf8fbfc,
    roughness: 0.88,
    metalness: 0.01,
  });
  core.castShadow = true;
  core.receiveShadow = true;
  system.add(core);
  addEdges(core, 0x9db7c2, 0.52);

  const coreInset = createRoundedPlate(3.72, 2.49, 0.028, 0.23, {
    color: 0xeaf2f5,
    roughness: 0.94,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
  });
  coreInset.position.z = 0.145;
  system.add(coreInset);

  const panelSpecs = [
    { id: 'outcome', color: 0x54bbcb, width: 4.05, height: 2.22, position: [0, 1.52, 0.02], translate: [0, 1.11, 0], axis: 'x', sign: 1, anchor: [0, 1.28, 0.22], order: 0 },
    { id: 'reuse', color: 0x0f4068, width: 2.22, height: 2.96, position: [-2.14, 0, 0.02], translate: [-1.11, 0, 0], axis: 'y', sign: 1, anchor: [-1.31, 0, 0.22], order: 1 },
    { id: 'trust', color: 0x1c75bc, width: 2.22, height: 2.96, position: [2.14, 0, 0.02], translate: [1.11, 0, 0], axis: 'y', sign: -1, anchor: [1.31, 0, 0.22], order: 2 },
    { id: 'proof', color: 0x3c9eb2, width: 4.05, height: 2.22, position: [0, -1.52, 0.02], translate: [0, -1.11, 0], axis: 'x', sign: -1, anchor: [0, -1.28, 0.22], order: 3 },
  ];

  const panels = panelSpecs.map(spec => createHingedPanel(system, spec));

  const rail = new THREE.Group();
  rail.position.set(0, -4.05, -0.03);
  system.add(rail);
  const railTrack = createRoundedPlate(7.18, 0.72, 0.18, 0.18, {
    color: 0x0a1722,
    roughness: 0.72,
    metalness: 0.08,
  });
  railTrack.receiveShadow = true;
  rail.add(railTrack);

  const railSegments = ['human', 'assist', 'agentize', 'productize'].map((id, index) => {
    const segment = createRoundedPlate(1.58, 0.39, 0.08, 0.11, {
      color: 0x173044,
      roughness: 0.62,
      metalness: 0.04,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    segment.position.set(-2.61 + index * 1.74, 0, 0.13);
    segment.userData.id = id;
    rail.add(segment);
    return segment;
  });

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 14),
    new THREE.ShadowMaterial({ color: 0x02080d, opacity: 0.32 }),
  );
  shadowPlane.position.set(0, 0.2, -0.48);
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const stateAngles = {
    human: 0.18,
    assist: 0.52,
    agentize: 0.82,
    productize: 1.08,
  };
  const strengthScale = { weak: 0.68, develop: 0.84, strong: 1 };
  const closedAngle = 1.5;

  let state = window.__foldScenarioState || {
    key: 'reporting',
    label: 'Weekly client reporting',
    result: 'assist',
    evidence: {
      outcome: ['strong'],
      reuse: ['strong'],
      trust: ['strong'],
      proof: ['develop'],
    },
  };

  let animation = null;
  let rafId = 0;
  let idleStart = performance.now();
  let observer;

  function targetFor(panel, nextState) {
    const evidenceState = nextState.evidence?.[panel.id]?.[0] || 'develop';
    const base = stateAngles[nextState.result] ?? stateAngles.assist;
    const evidenceFactor = strengthScale[evidenceState] ?? strengthScale.develop;
    return panel.sign * base * evidenceFactor;
  }

  function closedFor(panel) {
    return panel.sign * closedAngle;
  }

  function applyVisualEvidence(nextState) {
    panels.forEach(panel => {
      const evidenceState = nextState.evidence?.[panel.id]?.[0] || 'develop';
      panel.finalTarget = targetFor(panel, nextState);
      panel.mesh.material.color.copy(panel.baseColor);
      panel.mesh.material.emissive.copy(panel.baseColor);
      if (evidenceState === 'weak') {
        panel.mesh.material.color.lerp(new THREE.Color(0x506271), 0.48);
        panel.mesh.material.emissiveIntensity = 0;
      } else if (evidenceState === 'develop') {
        panel.mesh.material.color.lerp(new THREE.Color(0x9db5be), 0.2);
        panel.mesh.material.emissiveIntensity = 0.025;
      } else {
        panel.mesh.material.emissiveIntensity = 0.07;
      }
    });

    railSegments.forEach(segment => {
      const active = segment.userData.id === nextState.result;
      segment.material.color.set(active ? 0x54bbcb : 0x173044);
      segment.material.emissive.set(active ? 0x54bbcb : 0x000000);
      segment.material.emissiveIntensity = active ? 0.28 : 0;
      segment.position.z = active ? 0.2 : 0.13;
    });
  }

  function setInterfacePhase(phase, revealedCount = 4) {
    stage.dataset.phase = phase;
    const coreCopy = stage.querySelector('.three-fold-core-copy');
    const disposition = stage.querySelector('.three-fold-disposition');
    const labels = [...stage.querySelectorAll('.three-fold-label')];

    if (coreCopy) {
      coreCopy.style.transition = 'opacity .38s ease, transform .55s cubic-bezier(.2,.8,.2,1)';
      coreCopy.style.opacity = phase === 'folded' || phase === 'refolding' ? '0' : '1';
      coreCopy.style.transform = phase === 'folded' || phase === 'refolding'
        ? 'translate(-50%, -44%) scale(.92)'
        : 'translate(-50%, -50%) scale(1)';
    }

    if (disposition) {
      disposition.style.transition = 'opacity .42s ease, transform .55s cubic-bezier(.2,.8,.2,1)';
      disposition.style.opacity = phase === 'settled' ? '1' : '.36';
      disposition.style.transform = phase === 'settled'
        ? 'translateX(-50%) translateY(0)'
        : 'translateX(-50%) translateY(8px)';
    }

    labels.forEach((label, index) => {
      const visible = phase === 'settled' || (phase === 'unfolding' && index < revealedCount);
      label.style.transition = 'opacity .35s ease, filter .35s ease, transform .42s cubic-bezier(.2,.8,.2,1)';
      label.style.opacity = visible ? '' : '0';
      label.style.transform = visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -42%) scale(.9)';
    });
  }

  function revealInterface(immediate = false) {
    if (immediate) {
      stage.querySelectorAll('.three-fold-label, .three-fold-core-copy, .three-fold-disposition').forEach(element => {
        element.style.transition = 'none';
      });
    }
    setInterfacePhase('settled', 4);
  }

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function easeOutBack(value) {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
  }

  function startChoreography(nextState, { intro = false } = {}) {
    state = nextState;
    stage.dataset.state = state.result;
    applyVisualEvidence(state);
    diagnostics.state = state.result;

    if (reducedMotionQuery.matches) {
      panels.forEach(panel => {
        panel.group.rotation[panel.axis] = panel.finalTarget;
      });
      system.rotation.set(-0.04, 0.08, -0.018);
      system.scale.setScalar(1);
      system.position.set(0, 0, 0);
      diagnostics.phase = 'settled';
      diagnostics.settled = true;
      diagnostics.continuousAnimation = false;
      revealInterface(true);
      render();
      return;
    }

    const starts = panels.map(panel => panel.group.rotation[panel.axis]);
    const closed = panels.map(panel => closedFor(panel));
    const finals = panels.map(panel => panel.finalTarget);
    diagnostics.unfoldDistance = finals.reduce((sum, value, index) => sum + Math.abs(value - closed[index]), 0);
    diagnostics.replayCount += 1;
    diagnostics.phase = intro ? 'folded' : 'refolding';
    diagnostics.settled = false;
    diagnostics.continuousAnimation = true;
    setInterfacePhase(intro ? 'folded' : 'refolding', 0);

    animation = {
      intro,
      startTime: performance.now(),
      starts,
      closed,
      finals,
      refoldDuration: intro ? 260 : 480,
      holdDuration: intro ? 260 : 160,
      unfoldDuration: 1500,
      stagger: 150,
    };

    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function updateChoreography(time) {
    if (!animation) return false;
    const elapsed = time - animation.startTime;
    const refoldEnd = animation.refoldDuration;
    const holdEnd = refoldEnd + animation.holdDuration;
    const unfoldStart = holdEnd;
    const total = unfoldStart + animation.unfoldDuration + animation.stagger * (panels.length - 1);

    if (elapsed <= refoldEnd) {
      diagnostics.phase = animation.intro ? 'folded' : 'refolding';
      const progress = animation.intro ? 1 : easeInOutCubic(elapsed / refoldEnd);
      panels.forEach((panel, index) => {
        panel.group.rotation[panel.axis] = THREE.MathUtils.lerp(animation.starts[index], animation.closed[index], progress);
      });
      system.rotation.x = THREE.MathUtils.lerp(-0.04, -0.42, progress);
      system.rotation.y = THREE.MathUtils.lerp(0.08, 0.52, progress);
      system.rotation.z = THREE.MathUtils.lerp(-0.018, -0.1, progress);
      system.scale.setScalar(THREE.MathUtils.lerp(1, 0.82, progress));
      system.position.z = THREE.MathUtils.lerp(0, -0.4, progress);
      setInterfacePhase(animation.intro ? 'folded' : 'refolding', 0);
      return true;
    }

    if (elapsed <= holdEnd) {
      diagnostics.phase = 'folded';
      panels.forEach((panel, index) => {
        panel.group.rotation[panel.axis] = animation.closed[index];
      });
      setInterfacePhase('folded', 0);
      return true;
    }

    diagnostics.phase = 'unfolding';
    let revealed = 0;
    panels.forEach((panel, index) => {
      const localElapsed = elapsed - unfoldStart - index * animation.stagger;
      const raw = THREE.MathUtils.clamp(localElapsed / animation.unfoldDuration, 0, 1);
      const progress = easeOutBack(raw);
      panel.group.rotation[panel.axis] = THREE.MathUtils.lerp(animation.closed[index], animation.finals[index], progress);
      if (raw > 0.22) revealed += 1;
    });

    const assemblyProgress = THREE.MathUtils.clamp((elapsed - unfoldStart) / (animation.unfoldDuration + animation.stagger), 0, 1);
    const assemblyEase = easeInOutCubic(assemblyProgress);
    system.rotation.x = THREE.MathUtils.lerp(-0.42, -0.04, assemblyEase);
    system.rotation.y = THREE.MathUtils.lerp(0.52, 0.08, assemblyEase);
    system.rotation.z = THREE.MathUtils.lerp(-0.1, -0.018, assemblyEase);
    system.scale.setScalar(THREE.MathUtils.lerp(0.82, 1, assemblyEase));
    system.position.z = THREE.MathUtils.lerp(-0.4, 0, assemblyEase);
    setInterfacePhase('unfolding', revealed);

    if (elapsed >= total) {
      panels.forEach((panel, index) => {
        panel.group.rotation[panel.axis] = animation.finals[index];
      });
      system.rotation.set(-0.04, 0.08, -0.018);
      system.scale.setScalar(1);
      system.position.set(0, 0, 0);
      animation = null;
      diagnostics.phase = 'settled';
      diagnostics.settled = true;
      setInterfacePhase('settled', 4);
      idleStart = time;
      return false;
    }

    return true;
  }

  function updateDiagnostics() {
    if (diagnostics.phase === 'settled') diagnostics.ready = true;
    diagnostics.renderer = 'three';
    diagnostics.meshCount = panels.length;
    diagnostics.state = state.result;
    diagnostics.rotations = panels.map(panel => panel.group.rotation[panel.axis]);
    diagnostics.targetRotations = panels.map(panel => panel.finalTarget);
    diagnostics.fallbackActive = false;
    diagnostics.reducedMotion = reducedMotionQuery.matches;
    diagnostics.frameCount += 1;
  }

  function updateLabelPositions() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    panels.forEach(panel => {
      const label = stage.querySelector(`[data-fold-label="${panel.id}"]`);
      if (!label) return;
      const projected = new THREE.Vector3();
      panel.anchor.getWorldPosition(projected);
      projected.project(camera);
      let x = (projected.x * 0.5 + 0.5) * width;
      let y = (-projected.y * 0.5 + 0.5) * height;
      const halfWidth = label.offsetWidth / 2;
      const halfHeight = label.offsetHeight / 2;
      const horizontalInset = halfWidth + (width < 520 ? 8 : 12);
      const dispositionHeight = stage.querySelector('.three-fold-disposition')?.offsetHeight || 0;
      const verticalTop = halfHeight + 10;
      const verticalBottom = height - dispositionHeight - halfHeight - 14;
      x = THREE.MathUtils.clamp(x, horizontalInset, width - horizontalInset);
      y = THREE.MathUtils.clamp(y, verticalTop, Math.max(verticalTop, verticalBottom));
      label.style.setProperty('--fold-label-x', `${x}px`);
      label.style.setProperty('--fold-label-y', `${y}px`);
    });
  }

  function render() {
    renderer.render(scene, camera);
    updateLabelPositions();
    updateDiagnostics();
  }

  function tick(time) {
    rafId = 0;
    const active = updateChoreography(time);

    if (!animation && !reducedMotionQuery.matches) {
      const idle = (time - idleStart) / 1000;
      system.rotation.y = 0.08 + Math.sin(idle * 0.48) * 0.055;
      system.rotation.x = -0.04 + Math.cos(idle * 0.38) * 0.018;
      system.position.y = Math.sin(idle * 0.56) * 0.035;
      diagnostics.continuousAnimation = true;
    }

    render();
    if (active || !reducedMotionQuery.matches) rafId = requestAnimationFrame(tick);
  }

  function setState(nextState, immediate = false) {
    if (!nextState?.result) return;
    if (immediate || reducedMotionQuery.matches) {
      state = nextState;
      stage.dataset.state = state.result;
      applyVisualEvidence(state);
      panels.forEach(panel => {
        panel.group.rotation[panel.axis] = panel.finalTarget;
      });
      diagnostics.phase = 'settled';
      diagnostics.settled = true;
      revealInterface(true);
      render();
      return;
    }
    startChoreography(nextState);
  }

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    camera.aspect = width / height;
    const compact = width < 520;
    const tablet = width < 900;
    camera.fov = compact ? 39 : tablet ? 35 : 31;
    camera.position.set(compact ? 6.1 : 6.9, compact ? 5.8 : 6.0, compact ? 14.8 : 13.2);
    camera.lookAt(0, compact ? -0.35 : -0.15, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  }

  window.addEventListener('foldscenariochange', event => setState(event.detail));
  reducedMotionQuery.addEventListener?.('change', () => {
    diagnostics.reducedMotion = reducedMotionQuery.matches;
    if (reducedMotionQuery.matches) {
      setState(state, true);
      diagnostics.continuousAnimation = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      startChoreography(state, { intro: true });
    }
  });

  stage.addEventListener('click', event => {
    if (event.target.closest('a, button')) return;
    startChoreography(state, { intro: true });
  });
  stage.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target === stage) {
      event.preventDefault();
      startChoreography(state, { intro: true });
    }
  });
  stage.tabIndex = 0;
  stage.setAttribute('role', 'button');
  stage.setAttribute('aria-label', `${stage.getAttribute('aria-label')}. Activate to replay the unfolding sequence.`);
  stage.style.cursor = 'pointer';

  const replayCue = document.createElement('div');
  replayCue.className = 'three-fold-replay-cue';
  replayCue.textContent = 'Click to replay unfolding';
  Object.assign(replayCue.style, {
    position: 'absolute',
    top: '18px',
    right: '20px',
    zIndex: '7',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid rgba(139, 219, 226, .24)',
    background: 'rgba(5, 17, 27, .72)',
    color: 'rgba(225, 247, 250, .78)',
    fontSize: '.68rem',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    backdropFilter: 'blur(10px)',
  });
  stage.appendChild(replayCue);

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  applyVisualEvidence(state);
  panels.forEach(panel => {
    panel.group.rotation[panel.axis] = closedFor(panel);
  });
  setInterfacePhase('folded', 0);
  resize();
  diagnostics.renderer = 'three';
  diagnostics.meshCount = panels.length;

  if (reducedMotionQuery.matches) {
    setState(state, true);
  } else {
    startChoreography(state, { intro: true });
  }
}

function createHingedPanel(parent, spec) {
  const group = new THREE.Group();
  group.position.set(...spec.position);
  parent.add(group);

  const mesh = createRoundedPlate(spec.width, spec.height, 0.15, 0.2, {
    color: spec.color,
    roughness: 0.62,
    metalness: 0.035,
    emissive: spec.color,
    emissiveIntensity: 0.05,
  });
  mesh.position.set(...spec.translate);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  addEdges(mesh, 0xd8f4f7, 0.68);

  const crease = new THREE.Mesh(
    new THREE.BoxGeometry(spec.axis === 'x' ? spec.width * 0.91 : 0.045, spec.axis === 'y' ? spec.height * 0.91 : 0.045, 0.045),
    new THREE.MeshBasicMaterial({ color: 0xd9f5f7, transparent: true, opacity: 0.78 }),
  );
  crease.position.z = 0.13;
  group.add(crease);

  const anchor = new THREE.Object3D();
  anchor.position.set(...spec.anchor);
  group.add(anchor);

  return {
    id: spec.id,
    axis: spec.axis,
    sign: spec.sign,
    order: spec.order,
    group,
    mesh,
    anchor,
    finalTarget: 0,
    baseColor: new THREE.Color(spec.color),
  };
}

function createRoundedPlate(width, height, depth, radius, materialOptions) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 3, height / 3);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: Math.min(0.065, depth * 0.46),
    bevelThickness: Math.min(0.052, depth * 0.4),
    curveSegments: 6,
  });
  geometry.center();
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...materialOptions });
  return new THREE.Mesh(geometry, material);
}

function addEdges(mesh, color, opacity) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 28),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  mesh.add(edges);
}
