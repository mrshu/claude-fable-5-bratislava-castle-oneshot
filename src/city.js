import * as THREE from 'three';
import { groundHeight, zRiver, hillRR } from './terrain.js';
import { makeRng, mergeToGeometry } from './util.js';
import { makeAsphaltTexture } from './textures.js';

const BRIDGE_X = 255;

// ---------------- old town: merged vertex-colored buildings ----------------
export function buildOldTown() {
  const rng = makeRng(2024);
  const items = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const roofGeo = roofPrism();
  const facades = ['#e6d7b4', '#e2c89e', '#d9b8a2', '#e8e1d2', '#d9cab0',
                   '#c9cfc0', '#e3cfa0', '#d4b094', '#cbb9a4'];
  const roofs = ['#9a4a32', '#8f4530', '#a4543a', '#883e2c'];
  const theta = -0.21; // street grid rotation
  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const center = { x: 480, z: 75 };
  for (let u = -270; u <= 270; u += 27) {
    for (let v = -150; v <= 150; v += 21) {
      if (rng() < 0.16) continue; // plazas and gaps
      const x = center.x + u * cosT - v * sinT + (rng() - 0.5) * 6;
      const z = center.z + u * sinT + v * cosT + (rng() - 0.5) * 5;
      const h = groundHeight(x, z);
      if (h < 4 || h > 26) continue;                      // stay off the river & hill
      if (Math.abs(x - BRIDGE_X) < 24 && z > 110) continue; // bridge corridor
      if (Math.hypot(x - 215, z - 208) < 42) continue;    // cathedral close
      const bw = 11 + rng() * 8, bd = 9 + rng() * 7, bh = 8 + rng() * 7;
      const rot = theta + (rng() - 0.5) * 0.06;
      const mat4 = new THREE.Matrix4().compose(
        new THREE.Vector3(x, h + bh / 2 - 1, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
        new THREE.Vector3(bw, bh, bd));
      items.push({ geometry: box, matrix: mat4, color: facades[(rng() * facades.length) | 0] });
      const roofM = new THREE.Matrix4().compose(
        new THREE.Vector3(x, h + bh - 1, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
        new THREE.Vector3(bw + 0.8, 3.2 + rng() * 2.2, bd + 0.8));
      items.push({ geometry: roofGeo, matrix: roofM, color: roofs[(rng() * roofs.length) | 0] });
    }
  }
  const geo = mergeToGeometry(items);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = 'oldTown';
  return mesh;
}

function roofPrism() {
  // unit gable roof: 1x1 base, ridge along x at y=1
  const P = [
    // south slope
    -0.5, 0, 0.5,  0.5, 0, 0.5,  0.5, 1, 0,
    -0.5, 0, 0.5,  0.5, 1, 0,   -0.5, 1, 0,
    // north slope
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0,
    0.5, 0, -0.5, -0.5, 1, 0,    0.5, 1, 0,
    // gable ends
    0.5, 0, 0.5,  0.5, 0, -0.5,  0.5, 1, 0,
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0,
  ];
  const gabled = new THREE.BufferGeometry();
  gabled.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  gabled.computeVertexNormals();
  return gabled;
}

// ---------------- landmarks ----------------
export function buildLandmarks() {
  const g = new THREE.Group();
  g.name = 'landmarks';
  const matWhite = new THREE.MeshStandardMaterial({ color: '#e4ddd0', roughness: 0.9 });
  const matYellow = new THREE.MeshStandardMaterial({ color: '#e8d27e', roughness: 0.9 });
  const matCopper = new THREE.MeshStandardMaterial({ color: '#4e8f74', roughness: 0.6, metalness: 0.25 });
  const matDarkRoof = new THREE.MeshStandardMaterial({ color: '#3e4448', roughness: 0.8 });
  const matGold = new THREE.MeshStandardMaterial({ color: '#e8b84a', metalness: 0.85, roughness: 0.3 });
  const matGlass = new THREE.MeshStandardMaterial({ color: '#7e98ae', roughness: 0.2, metalness: 0.6 });

  function add(mesh, x, y, z, ry = 0) {
    mesh.position.set(x, y, z);
    if (ry) mesh.rotation.y = ry;
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  }

  // --- St. Martin's Cathedral (coronation church, by the bridge ramp) ---
  {
    const x = 215, z = 208;
    const h = groundHeight(x, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(18, 17, 42), matWhite), x, h + 8.5 - 1, z, -0.1);
    const roof = new THREE.Mesh(roofPrism(), matDarkRoof);
    roof.scale.set(44, 9, 19.5); roof.rotation.y = -0.1 + Math.PI / 2;
    add(roof, x, h + 16, z, roof.rotation.y);
    // polygonal choir
    add(new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 15, 6), matWhite), x - 2.3, h + 6.5, z + 23, -0.1);
    add(new THREE.Mesh(new THREE.ConeGeometry(9, 7, 6), matDarkRoof), x - 2.3, h + 17.5, z + 23, -0.1);
    // west tower with the gilded crown of St. Stephen on its spire
    const tx = x + 2.2, tz = z - 23;
    add(new THREE.Mesh(new THREE.BoxGeometry(11, 47, 11), matWhite), tx, h + 23.5 - 1, tz, -0.1);
    add(new THREE.Mesh(new THREE.ConeGeometry(7.6, 26, 8), matCopper), tx, h + 59, tz);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 1.4, 8), matGold), tx, h + 72.6, tz);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), matGold), tx, h + 73.8, tz);
  }

  // --- Michael's Gate (green onion spire in the old town) ---
  {
    const x = 392, z = -2;
    const h = groundHeight(x, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(9, 27, 9), matWhite), x, h + 12.5, z, -0.21);
    const onion = new THREE.Mesh(new THREE.SphereGeometry(4.6, 12, 12), matCopper);
    onion.scale.set(1, 1.35, 1);
    add(onion, x, h + 30, z);
    add(new THREE.Mesh(new THREE.ConeGeometry(2.2, 8, 8), matCopper), x, h + 38, z);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), matGold), x, h + 42.4, z);
  }

  // --- Old Town Hall tower ---
  {
    const x = 478, z = 68;
    const h = groundHeight(x, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(10, 24, 10), matYellow), x, h + 11, z, -0.21);
    add(new THREE.Mesh(new THREE.ConeGeometry(7, 9, 4), matCopper), x, h + 27.5, z, Math.PI / 4 - 0.21);
  }
  // a couple of generic church spires for the skyline
  for (const [x, z] of [[560, 130], [620, -20], [430, 170]]) {
    const h = groundHeight(x, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(7, 18, 7), matWhite), x, h + 8, z, -0.21);
    add(new THREE.Mesh(new THREE.ConeGeometry(5, 12, 8), matCopper), x, h + 23, z);
  }

  // --- Slovak Parliament (modern, NW edge of the plateau) ---
  {
    const x = -78, z = -118;
    add(new THREE.Mesh(new THREE.BoxGeometry(46, 11, 20), matWhite), x, 74, z, 0.25);
    add(new THREE.Mesh(new THREE.BoxGeometry(40, 8, 1.5), matGlass), x + 2, 73, z + 10, 0.25);
  }

  // --- Slavín war memorial on the NW hills ---
  {
    const x = -430, z = -430;
    const h = groundHeight(x, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(16, 8, 16), matWhite), x, h + 3, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(5, 34, 5), matWhite), x, h + 24, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(3, 4, 3), matCopper), x, h + 43, z);
  }

  // --- Petržalka panel housing blocks across the river ---
  {
    const rng2 = makeRng(404);
    const matPanel = new THREE.MeshStandardMaterial({ color: '#cfd3d6', roughness: 0.9 });
    const matPanel2 = new THREE.MeshStandardMaterial({ color: '#d9cfc2', roughness: 0.9 });
    for (let i = 0; i < 26; i++) {
      const x = -560 + i * 46 + (rng2() - 0.5) * 24;
      const z = 840 + rng2() * 180;
      const h = groundHeight(x, z);
      if (h < 3) continue;
      const bh = 22 + rng2() * 16;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(34 + rng2() * 16, bh, 13), rng2() < 0.5 ? matPanel : matPanel2);
      slab.position.set(x, h + bh / 2 - 1, z);
      slab.rotation.y = (rng2() - 0.5) * 0.7;
      slab.castShadow = true;
      g.add(slab);
    }
  }

  // --- docked white river cruise boats ---
  for (const [bx, bz0] of [[470, -128], [560, -122]]) {
    const bz = zRiver(bx) + bz0; // near the north bank
    const boat = new THREE.Group();
    boat.position.set(bx, 0.4, bz);
    boat.rotation.y = 0.06;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(42, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.5 }));
    hull.position.y = 1; boat.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(34, 2.2, 6.6), matGlass);
    deck.position.y = 3.2; boat.add(deck);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 5),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }));
    cab.position.set(8, 5.1, 0); boat.add(cab);
    boat.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    g.add(boat);
  }

  return g;
}

// ---------------- Most SNP — the UFO bridge ----------------
export function buildBridge() {
  const g = new THREE.Group();
  g.name = 'mostSNP';
  const matSteel = new THREE.MeshStandardMaterial({ color: '#b6b9bd', metalness: 0.65, roughness: 0.45 });
  const matCable = new THREE.MeshStandardMaterial({ color: '#5a5e63', metalness: 0.6, roughness: 0.5 });
  const matSaucer = new THREE.MeshStandardMaterial({ color: '#d7d9da', metalness: 0.5, roughness: 0.35 });
  const matWin = new THREE.MeshStandardMaterial({ color: '#33424e', metalness: 0.7, roughness: 0.25 });
  const asphalt = makeAsphaltTexture();
  asphalt.repeat.set(1, 14);
  const matDeck = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 });

  const deckY = 16;
  // main span over the river
  const deck = new THREE.Mesh(new THREE.BoxGeometry(21, 2.4, 380), matDeck);
  deck.position.set(BRIDGE_X, deckY, 470);
  deck.castShadow = deck.receiveShadow = true;
  g.add(deck);
  // box girder under the deck
  const girder = new THREE.Mesh(new THREE.BoxGeometry(14, 2.6, 380), matSteel);
  girder.position.set(BRIDGE_X, deckY - 2.4, 470);
  girder.castShadow = true;
  g.add(girder);
  // railings
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 380), matCable);
    rail.position.set(BRIDGE_X + s * 10.4, deckY + 1.8, 470);
    g.add(rail);
  }
  // ramps at both ends
  for (const [z0, z1, y1] of [[280, 190, 9], [660, 760, 9]]) {
    const len = Math.abs(z1 - z0);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(21, 2.4, len + 8), matDeck);
    ramp.position.set(BRIDGE_X, (deckY + y1) / 2, (z0 + z1) / 2);
    ramp.rotation.x = Math.atan2(deckY - y1, len) * (z1 > z0 ? 1 : -1);
    ramp.castShadow = ramp.receiveShadow = true;
    g.add(ramp);
  }
  // bank piers (the real Most SNP has no pier in the river)
  for (const z of [240, 668]) {
    const h = Math.max(groundHeight(BRIDGE_X, z), -2);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(12, deckY - h + 2, 4), matSteel);
    pier.position.set(BRIDGE_X, (deckY + h) / 2 - 1, z);
    pier.castShadow = true;
    g.add(pier);
  }

  // the leaning pylon on the south bank, saucer on top
  const apex = new THREE.Vector3(BRIDGE_X, 82, 642);
  for (const s of [-1, 1]) {
    const base = new THREE.Vector3(BRIDGE_X + s * 13, groundHeight(BRIDGE_X + s * 13, 668), 668);
    const legV = new THREE.Vector3().subVectors(apex, base);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.6, legV.length(), 10), matSteel);
    leg.position.copy(base).addScaledVector(legV, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legV.clone().normalize());
    leg.castShadow = true;
    g.add(leg);
  }
  // crossbar between the legs
  const bar = new THREE.Mesh(new THREE.BoxGeometry(20, 1.6, 2), matSteel);
  bar.position.set(BRIDGE_X, 45, 655.5);
  g.add(bar);
  // UFO observation deck
  const saucer = new THREE.Mesh(new THREE.SphereGeometry(11.5, 24, 14), matSaucer);
  saucer.scale.set(1, 0.38, 1);
  saucer.position.set(BRIDGE_X, 86.5, 640);
  saucer.castShadow = true;
  g.add(saucer);
  const winBand = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 10.8, 2.2, 24), matWin);
  winBand.position.set(BRIDGE_X, 86.2, 640);
  g.add(winBand);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 9, 8), matSteel);
  mast.position.set(BRIDGE_X, 95, 640);
  g.add(mast);

  // cable stays from the pylon to the deck (single plane, like the real bridge)
  for (const za of [310, 360, 410, 460, 510, 555]) {
    for (const s of [-0.55, 0.55]) {
      const a = new THREE.Vector3(BRIDGE_X + s * 4, 78, 648);
      const b = new THREE.Vector3(BRIDGE_X + s * 6, deckY + 1, za);
      const v = new THREE.Vector3().subVectors(b, a);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, v.length(), 6), matCable);
      cable.position.copy(a).addScaledVector(v, 0.5);
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      g.add(cable);
    }
  }
  // back stays to the south abutment
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(BRIDGE_X + s * 5, 80, 646);
    const b = new THREE.Vector3(BRIDGE_X + s * 8, groundHeight(BRIDGE_X + s * 8, 740) + 2, 740);
    const v = new THREE.Vector3().subVectors(b, a);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, v.length(), 6), matCable);
    cable.position.copy(a).addScaledVector(v, 0.5);
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    g.add(cable);
  }
  return g;
}
