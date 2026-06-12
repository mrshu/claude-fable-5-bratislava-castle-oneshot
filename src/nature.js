import * as THREE from 'three';
import { groundHeight, hillRR, zRiver } from './terrain.js';
import { makeRng } from './util.js';

// Wooded slopes: two instanced species (broadleaf + columnar poplar).
export function buildTrees() {
  const rng = makeRng(7);
  const g = new THREE.Group();
  g.name = 'trees';

  const spots = [];
  let guard = 0;
  while (spots.length < 1500 && guard++ < 40000) {
    const x = -950 + rng() * 1900;
    const z = -750 + rng() * 1730;                            // includes the Petržalka park bank
    const h = groundHeight(x, z);
    if (h < 5 || h > 79) continue;
    const rr = hillRR(x, z);
    if (rr < 0.60) continue;                                  // keep the plateau clear
    const d = Math.abs(z - zRiver(x));
    if (d < 215) { if (h < 4) continue; }
    // old town footprint
    if (x > 250 && x < 830 && z > -120 && z < 270) { if (rng() < 0.92) continue; }
    // bridge corridor + approach ramp area
    if (Math.abs(x - 255) < 26 && z > 150) continue;
    if (x > 100 && x < 230 && z > -10 && z < 160 && rr < 1.15 && rng() < 0.5) continue;
    spots.push({ x, z, h, big: rr < 1.0 });
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const broad = spots.filter(s => rng() > 0.16);
  const tall = spots.filter(s => !broad.includes(s));

  // broadleaf canopies
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, broad.length);
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3a28', roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, broad.length);
  broad.forEach((s, i) => {
    const r = 2.6 + rng() * 2.6;
    const th = 2 + rng() * 2;
    dummy.position.set(s.x, s.h + th + r * 0.55, s.z);
    dummy.scale.set(r, r * (0.85 + rng() * 0.4), r);
    dummy.rotation.y = rng() * Math.PI;
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.26 + rng() * 0.06, 0.42 + rng() * 0.2, 0.22 + rng() * 0.12);
    canopies.setColorAt(i, color);
    dummy.position.set(s.x, s.h + th / 2, s.z);
    dummy.scale.set(1, th, 1);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  canopies.castShadow = true;
  canopies.instanceMatrix.needsUpdate = true;
  g.add(canopies, trunks);

  // columnar poplars along the banks
  const popGeo = new THREE.ConeGeometry(1, 1, 7);
  const popMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const poplars = new THREE.InstancedMesh(popGeo, popMat, tall.length);
  tall.forEach((s, i) => {
    const ht = 9 + rng() * 6;
    dummy.position.set(s.x, s.h + ht / 2, s.z);
    dummy.scale.set(1.6 + rng() * 0.7, ht, 1.6 + rng() * 0.7);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    poplars.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.25 + rng() * 0.05, 0.4, 0.2 + rng() * 0.1);
    poplars.setColorAt(i, color);
  });
  poplars.castShadow = true;
  g.add(poplars);

  return g;
}

// Vineyard rows on the southern slope under the castle walls.
export function buildVineyards() {
  const rng = makeRng(31);
  const rows = [];
  for (let zi = 0; zi < 13; zi++) {
    const z = 128 + zi * 7;
    for (let x = -170; x < -55; x += 5.5) {
      const h = groundHeight(x + (rng() - 0.5) * 2, z);
      if (h < 14 || h > 70) continue;
      rows.push({ x, z, h });
    }
  }
  const geo = new THREE.BoxGeometry(4.4, 1.3, 0.7);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const mesh = new THREE.InstancedMesh(geo, mat, rows.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  rows.forEach((r, i) => {
    dummy.position.set(r.x, r.h + 0.6, r.z);
    dummy.rotation.y = 0.1;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.24, 0.45, 0.26 + rng() * 0.1);
    mesh.setColorAt(i, color);
  });
  mesh.castShadow = true;
  mesh.name = 'vineyards';
  return mesh;
}

// A small flock of swallows circling the castle — pure life for the showcase.
export function buildBirds() {
  const N = 16;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.5, -1.1, 0.25, -0.4, 0, 0, -0.1,
    0, 0, 0.5, 0, 0, -0.1, 1.1, 0.25, -0.4,
  ], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: '#1c1a18', side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.name = 'birds';
  const dummy = new THREE.Object3D();
  const seeds = [];
  const rng = makeRng(99);
  for (let i = 0; i < N; i++) seeds.push({ a: rng() * Math.PI * 2, r: 70 + rng() * 60, y: 100 + rng() * 30, s: 0.5 + rng() * 0.5, ph: rng() * 7 });
  mesh.userData.update = (t) => {
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      const a = s.a + t * 0.12 * s.s;
      dummy.position.set(Math.cos(a) * s.r + 20, s.y + Math.sin(t * 0.7 + s.ph) * 6, Math.sin(a) * s.r * 0.7 + 40);
      dummy.rotation.y = -a - Math.PI / 2;
      const flap = 0.55 + Math.abs(Math.sin(t * 7 + s.ph)) * 0.8;
      dummy.scale.set(1.6, flap, 1.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return mesh;
}
