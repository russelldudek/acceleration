import * as THREE from '../assets/vendor/three/three.module.min.js';

export function createRoundedPlate(width, height, depth, radius, materialOptions) {
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
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...materialOptions }),
  );
}

export function addEdges(mesh, color, opacity) {
  mesh.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 28),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  ));
}

export function createHingedPanel(parent, spec) {
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
    new THREE.BoxGeometry(
      spec.axis === 'x' ? spec.width * 0.91 : 0.045,
      spec.axis === 'y' ? spec.height * 0.91 : 0.045,
      0.045,
    ),
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
