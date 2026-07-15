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
  rotations: [],
  targetRotations: [],
  settled: false,
  fallbackActive: false,
  reducedMotion: reducedMotionQuery.matches,
  continuousAnimation: false,
  frameCount: 0,
};
window.__foldEngineDiagnostics = diagnostics;

if (!stage || !canvas || forceFallback) {
  activateFallback();
} else {
  try {
    initializeScene();
  } catch (error) {
    activateFallback();
  }
}

function activateFallback() {
  if (!stage) return;
  stage.dataset.fallback = 'true';
  stage.dataset.renderer = 'fallback';
  canvas?.setAttribute('hidden', '');
  fallback?.setAttribute('aria-hidden', 'false');
  diagnostics.ready = true;
  diagnostics.renderer = 'fallback';
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
  fallback?.setAttribute('aria-hidden', 'true');

  const renderer = new THREE.WebGLRenderer({ canvas, context, ...contextOptions });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, 0.1, 80);
  camera.position.set(7.8, 7.1, 12.5);
  camera.lookAt(0, -0.15, 0);

  const system = new THREE.Group();
  system.rotation.z = -0.018;
  scene.add(system);

  const hemisphere = new THREE.HemisphereLight(0xeafaff, 0x0a1622, 2.15);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffffff, 4.2);
  key.position.set(-5.5, 7.5, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.bias = -0.00035;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x54bbcb, 2.1);
  rim.position.set(8, -4, 8);
  scene.add(rim);

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
    { id: 'outcome', color: 0x54bbcb, width: 4.05, height: 2.22, position: [0, 1.52, 0.02], translate: [0, 1.11, 0], axis: 'x', sign: 1, anchor: [0, 1.28, 0.22] },
    { id: 'reuse', color: 0x0f4068, width: 2.22, height: 2.96, position: [-2.14, 0, 0.02], translate: [-1.11, 0, 0], axis: 'y', sign: 1, anchor: [-1.31, 0, 0.22] },
    { id: 'trust', color: 0x1c75bc, width: 2.22, height: 2.96, position: [2.14, 0, 0.02], translate: [1.11, 0, 0], axis: 'y', sign: -1, anchor: [1.31, 0, 0.22] },
    { id: 'proof', color: 0x3c9eb2, width: 4.05, height: 2.22, position: [0, -1.52, 0.02], translate: [0, -1.11, 0], axis: 'x', sign: -1, anchor: [0, -1.28, 0.22] },
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
    new THREE.ShadowMaterial({ color: 0x02080d, opacity: 0.3 }),
  );
  shadowPlane.position.set(0, 0.2, -0.48);
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const stateAngles = {
    human: 0.16,
    assist: 0.48,
    agentize: 0.78,
    productize: 1.08,
  };
  const strengthScale = { weak: 0.66, develop: 0.84, strong: 1 };

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
  let rafId = 0;
  let lastTime = performance.now();

  function targetFor(panel, nextState) {
    const evidenceState = nextState.evidence?.[panel.id]?.[0] || 'develop';
    const base = stateAngles[nextState.result] ?? stateAngles.assist;
    const evidenceFactor = strengthScale[evidenceState] ?? strengthScale.develop;
    return panel.sign * base * evidenceFactor;
  }

  function applyVisualEvidence(nextState) {
    panels.forEach(panel => {
      const evidenceState = nextState.evidence?.[panel.id]?.[0] || 'develop';
      panel.target = targetFor(panel, nextState);
      panel.mesh.material.color.copy(panel.baseColor);
      panel.mesh.material.emissive.copy(panel.baseColor);
      if (evidenceState === 'weak') {
        panel.mesh.material.color.lerp(new THREE.Color(0x506271), 0.48);
        panel.mesh.material.emissiveIntensity = 0;
      } else if (evidenceState === 'develop') {
        panel.mesh.material.color.lerp(new THREE.Color(0x9db5be), 0.2);
        panel.mesh.material.emissiveIntensity = 0.018;
      } else {
        panel.mesh.material.emissiveIntensity = 0.045;
      }
    });

    railSegments.forEach(segment => {
      const active = segment.userData.id === nextState.result;
      segment.material.color.set(active ? 0x54bbcb : 0x173044);
      segment.material.emissive.set(active ? 0x54bbcb : 0x000000);
      segment.material.emissiveIntensity = active ? 0.22 : 0;
      segment.position.z = active ? 0.19 : 0.13;
    });
  }

  function updateDiagnostics() {
    diagnostics.ready = true;
    diagnostics.renderer = 'three';
    diagnostics.meshCount = panels.length;
    diagnostics.state = state.result;
    diagnostics.rotations = panels.map(panel => panel.group.rotation[panel.axis]);
    diagnostics.targetRotations = panels.map(panel => panel.target);
    diagnostics.fallbackActive = false;
    diagnostics.reducedMotion = reducedMotionQuery.matches;
    diagnostics.continuousAnimation = false;
  }

  function render() {
    renderer.render(scene, camera);
    updateLabelPositions();
    diagnostics.frameCount += 1;
    updateDiagnostics();
  }

  function animate(time) {
    rafId = 0;
    const delta = Math.min(0.05, Math.max(0.001, (time - lastTime) / 1000));
    lastTime = time;
    let maxDelta = 0;

    panels.forEach(panel => {
      const current = panel.group.rotation[panel.axis];
      const next = THREE.MathUtils.damp(current, panel.target, 6.6, delta);
      panel.group.rotation[panel.axis] = next;
      maxDelta = Math.max(maxDelta, Math.abs(panel.target - next));
    });

    diagnostics.settled = maxDelta < 0.0035;
    render();
    if (!diagnostics.settled) rafId = requestAnimationFrame(animate);
  }

  function requestTransition() {
    if (reducedMotionQuery.matches) {
      panels.forEach(panel => {
        panel.group.rotation[panel.axis] = panel.target;
      });
      diagnostics.settled = true;
      render();
      return;
    }
    diagnostics.settled = false;
    if (!rafId) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    }
  }

  function setState(nextState, immediate = false) {
    if (!nextState?.result) return;
    state = nextState;
    stage.dataset.state = state.result;
    applyVisualEvidence(state);
    if (immediate || reducedMotionQuery.matches) {
      panels.forEach(panel => {
        panel.group.rotation[panel.axis] = panel.target;
      });
      diagnostics.settled = true;
      render();
    } else {
      requestTransition();
    }
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

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    const aspect = width / height;
    const viewHeight = width < 520 ? 10.2 : width < 900 ? 9.65 : 9.15;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.left = -(viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.position.set(width < 520 ? 6.3 : 7.8, width < 520 ? 6.5 : 7.1, width < 520 ? 13.3 : 12.5);
    camera.lookAt(0, -0.15, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  }

  window.addEventListener('foldscenariochange', event => setState(event.detail));
  reducedMotionQuery.addEventListener?.('change', () => {
    diagnostics.reducedMotion = reducedMotionQuery.matches;
    requestTransition();
  });

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  setState(state, true);
  resize();
}

function createHingedPanel(parent, spec) {
  const group = new THREE.Group();
  group.position.set(...spec.position);
  parent.add(group);

  const mesh = createRoundedPlate(spec.width, spec.height, 0.15, 0.2, {
    color: spec.color,
    roughness: 0.68,
    metalness: 0.025,
    emissive: spec.color,
    emissiveIntensity: 0.04,
  });
  mesh.position.set(...spec.translate);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  addEdges(mesh, 0xd8f4f7, 0.58);

  const crease = new THREE.Mesh(
    new THREE.BoxGeometry(spec.axis === 'x' ? spec.width * 0.91 : 0.045, spec.axis === 'y' ? spec.height * 0.91 : 0.045, 0.045),
    new THREE.MeshBasicMaterial({ color: 0xd9f5f7, transparent: true, opacity: 0.72 }),
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
    group,
    mesh,
    anchor,
    target: 0,
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
    bevelSegments: 2,
    bevelSize: Math.min(0.055, depth * 0.42),
    bevelThickness: Math.min(0.045, depth * 0.36),
    curveSegments: 4,
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
