import * as THREE from 'three';
import { PLATEAU_Y, groundHeight } from './terrain.js';
import { makeFacadeTexture, makeRoofTexture, makePavingTexture, makeFlagTexture } from './textures.js';
import { makeHipRoof } from './util.js';

const WALL_H = 22;          // palace cornice height
const BAY = 16;             // one facade-texture tile = 4 bays = 16 m

export function buildCastle() {
  const g = new THREE.Group();
  g.position.y = PLATEAU_Y;
  g.name = 'castle';

  const facadeTex = makeFacadeTexture();
  const towerTex = makeFacadeTexture({ tower: true });
  const roofTex = makeRoofTexture();
  const pavingTex = makePavingTexture();

  const matPlaster = new THREE.MeshStandardMaterial({ color: '#efe7d6', roughness: 0.9 });
  const matStone = new THREE.MeshStandardMaterial({ color: '#b9b09e', roughness: 0.95 });
  const matStoneDark = new THREE.MeshStandardMaterial({ color: '#8f8775', roughness: 0.95 });
  const matRoof = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85 });
  matRoof.map.repeat.set(4, 3);
  const matGold = new THREE.MeshStandardMaterial({ color: '#e8b84a', metalness: 0.85, roughness: 0.3 });
  const matBronze = new THREE.MeshStandardMaterial({ color: '#43413a', metalness: 0.55, roughness: 0.55 });
  const matDark = new THREE.MeshStandardMaterial({ color: '#241f1a', roughness: 0.9 });
  const matHedge = new THREE.MeshStandardMaterial({ color: '#2f5430', roughness: 1 });
  const matLawn = new THREE.MeshStandardMaterial({ color: '#577a3e', roughness: 1 });
  const matGravel = new THREE.MeshStandardMaterial({ color: '#cdbfa4', roughness: 1 });
  const matWaterStill = new THREE.MeshStandardMaterial({ color: '#3d6a78', roughness: 0.1, metalness: 0.4 });

  const facadeMats = new Map();
  function facadeMat(lengthM, tex = facadeTex) {
    const key = `${tex.uuid}:${Math.round(lengthM)}`;
    if (!facadeMats.has(key)) {
      const t = tex.clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(lengthM / BAY * 4) / 4), 1);
      facadeMats.set(key, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
    }
    return facadeMats.get(key);
  }

  function add(mesh, x, y, z, ry = 0) {
    mesh.position.set(x, y, z);
    if (ry) mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  }

  // ---------- the palace: four wings around the inner courtyard ----------
  // outer footprint 72 x 60, courtyard 34 x 24
  function wing(w, d, cx, cz) {
    const geo = new THREE.BoxGeometry(w, WALL_H, d);
    const mD = facadeMat(d), mW = facadeMat(w);
    const mesh = new THREE.Mesh(geo, [mD, mD, matPlaster, matPlaster, mW, mW]);
    add(mesh, cx, WALL_H / 2, cz);
    const roof = new THREE.Mesh(makeHipRoof(w, d, 8, 1.0), matRoof);
    add(roof, cx, WALL_H, cz);
  }
  wing(19, 60, -26.5, 0);   // west
  wing(19, 60, 26.5, 0);    // east
  wing(34, 18, 0, -21);     // north
  wing(34, 18, 0, 21);      // south

  // palace plinth terrace
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(86, 1.2, 74),
    new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 1 }));
  plinth.material.map.repeat.set(20, 18);
  add(plinth, 0, 0.3, 0).castShadow = false;

  // inner courtyard floor + well
  const courtTex = pavingTex.clone(); courtTex.needsUpdate = true; courtTex.repeat.set(8, 6);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(34, 24),
    new THREE.MeshStandardMaterial({ map: courtTex, roughness: 1 }));
  court.rotation.x = -Math.PI / 2;
  add(court, 0, 1.0, 0).castShadow = false;
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 1.4, 16), matStone), 0, 1.6, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.1, 16), matDark), 0, 2.35, 0);

  // east entrance portal
  add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 12, 10), matPlaster), 36.5, 6, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 5), matDark), 37.6, 4, 0);

  // ---------- the four corner towers (Crown Tower SW is the big one) ----------
  function tower(cx, cz, size, wallTop, roofH, finialH) {
    const geo = new THREE.BoxGeometry(size, wallTop, size);
    const m = facadeMat(size, towerTex);
    add(new THREE.Mesh(geo, [m, m, matPlaster, matPlaster, m, m]), cx, wallTop / 2, cz);
    // baroque tent roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry((size + 1.6) / Math.SQRT2, roofH, 4), matRoof);
    roof.rotation.y = Math.PI / 4;
    add(roof, cx, wallTop + roofH / 2, cz);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), matGold), cx, wallTop + roofH + 0.4, cz);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.18, finialH, 6), matGold), cx, wallTop + roofH + finialH / 2 + 0.7, cz);
    return wallTop + roofH;
  }
  const crownApex = tower(-36, 30, 16, 30, 14, 2.2);  // SW Crown Tower, 47 m
  tower(36, 30, 11, 25, 11, 1.6);                     // SE
  tower(36, -30, 11, 25, 11, 1.6);                    // NE
  tower(-36, -30, 11, 25, 11, 1.6);                   // NW

  // Slovak flag on the Crown Tower
  const flag = buildFlag();
  flag.position.set(-36, crownApex, 30);
  g.add(flag);

  // ---------- honorary courtyard (east, facing the old town) ----------
  const hcTex = pavingTex.clone(); hcTex.needsUpdate = true; hcTex.repeat.set(16, 11);
  const hc = new THREE.Mesh(new THREE.BoxGeometry(64, 0.8, 44),
    new THREE.MeshStandardMaterial({ map: hcTex, roughness: 1 }));
  add(hc, 68, 0.2, 6).castShadow = false;
  // balustrades along the north & south edges
  for (const z of [-15.4, 27.4]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(62, 1.3, 1.0), matStone), 68, 1.05, z);
    for (let x = 38; x <= 98; x += 7.5) {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 1.3), matStone), x, 1.0, z);
    }
  }
  // Honorary Gate: trophy pylons + wrought-iron fence
  for (const z of [-2, 14]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 7, 2.6), matStone), 99, 3.5, z);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 4), matStone), 99, 8.6, z);
  }
  // wrought-iron fence: thin rails with vertical bars, not solid panels
  for (const [zc, len] of [[-9, 12], [21, 12]]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, len), matDark), 99, 2.5, zc);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, len), matDark), 99, 1.0, zc);
    for (let zb = zc - len / 2; zb <= zc + len / 2; zb += 1.2) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), matDark), 99, 1.3, zb);
    }
  }

  // King Svatopluk equestrian statue (2010), facing the city
  g.add(buildSvatopluk(matBronze, matStoneDark));

  // ---------- baroque garden (north terrace, restored 2016) ----------
  const garden = new THREE.Group();
  garden.position.set(0, 0, -62);
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(68, 0.5, 58), matLawn);
  lawn.position.y = 0.15; lawn.receiveShadow = true; garden.add(lawn);
  // gravel cross paths
  for (const p of [
    [0, 0, 0.45, 4, 58], [0, 0, 0.45, 68, 4],
  ]) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(p[3], 0.2, p[4]), matGravel);
    path.position.set(p[0], p[2], p[1]); path.receiveShadow = true; garden.add(path);
  }
  // parterre quadrants: hedge rectangles + corner topiary cones
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const qx = sx * 18, qz = sz * 15;
    const ring = [
      [qx, qz - 9, 24, 0.8], [qx, qz + 9, 24, 0.8],
      [qx - 12, qz, 0.8, 18.8], [qx + 12, qz, 0.8, 18.8],
    ];
    for (const r of ring) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(r[2], 0.9, r[3]), matHedge);
      hedge.position.set(r[0], 0.8, r[1]); hedge.castShadow = true; garden.add(hedge);
    }
    // inner scroll hints
    const inner = new THREE.Mesh(new THREE.BoxGeometry(12, 0.7, 0.8), matHedge);
    inner.position.set(qx, 0.7, qz); inner.castShadow = true; garden.add(inner);
    for (const cx of [qx - 12, qx + 12]) for (const cz of [qz - 9, qz + 9]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 8), matHedge);
      cone.position.set(cx, 1.9, cz); cone.castShadow = true; garden.add(cone);
    }
  }
  // central fountain
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 1.1, 24), matStone);
  basin.position.y = 0.85; basin.castShadow = true; garden.add(basin);
  const fwater = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 0.15, 24), matWaterStill);
  fwater.position.y = 1.35; garden.add(fwater);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.7 }));
  jet.position.y = 2.6; garden.add(jet);
  g.add(garden);

  // ---------- fortification ring around the plateau rim ----------
  const rim = { cx: 10, cz: -5, ax: 114.8, az: 103.6 };
  const SEGS = 72;
  for (let i = 0; i < SEGS; i++) {
    const a0 = (i / SEGS) * Math.PI * 2, a1 = ((i + 1) / SEGS) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    // leave a gap on the east for the entrance ramp
    const deg = ((am * 180 / Math.PI) + 360) % 360;
    if (deg < 7 || deg > 353) continue;
    const x0 = rim.cx + rim.ax * Math.cos(a0), z0 = rim.cz + rim.az * Math.sin(a0);
    const x1 = rim.cx + rim.ax * Math.cos(a1), z1 = rim.cz + rim.az * Math.sin(a1);
    const xm = rim.cx + rim.ax * Math.cos(am), zm = rim.cz + rim.az * Math.sin(am);
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.8;
    const ghLocal = groundHeight(xm, zm) - PLATEAU_Y;   // negative (below plateau)
    const top = 2.0, bottom = Math.min(ghLocal - 3, -2);
    const hgt = top - bottom;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len, hgt, 2.6), matStone);
    add(seg, xm, (top + bottom) / 2, zm, -Math.atan2(z1 - z0, x1 - x0));
  }
  // south bastions with red caps
  for (const aDeg of [78, 102]) {
    const a = aDeg * Math.PI / 180;
    const bx = rim.cx + rim.ax * Math.cos(a), bz = rim.cz + rim.az * Math.sin(a);
    const ghLocal = groundHeight(bx, bz) - PLATEAU_Y;
    add(new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 4 - ghLocal + 4, 16), matStone),
      bx, (4 + ghLocal - 4) / 2 + 1, bz);
    add(new THREE.Mesh(new THREE.ConeGeometry(6.8, 4, 16), matRoof), bx, 5, bz);
  }

  // ---------- gates ----------
  // Sigismund Gate (gothic, SE)
  {
    const a = 55 * Math.PI / 180;
    const x = rim.cx + rim.ax * Math.cos(a), z = rim.cz + rim.az * Math.sin(a);
    add(new THREE.Mesh(new THREE.BoxGeometry(9, 12, 9), facadeMat(9, towerTex)), x, 2, z, -a);
    const r = new THREE.Mesh(new THREE.ConeGeometry(7, 7, 4), matRoof);
    r.rotation.y = Math.PI / 4 - a;
    add(r, x, 11.5, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 5, 9.6), matDark), x, -1.5, z, -a);
  }
  // Vienna Gate (baroque, SW)
  {
    const a = 125 * Math.PI / 180;
    const x = rim.cx + rim.ax * Math.cos(a), z = rim.cz + rim.az * Math.sin(a);
    add(new THREE.Mesh(new THREE.BoxGeometry(13, 10, 5), matPlaster), x, 1, z, -a + Math.PI / 2);
    add(new THREE.Mesh(new THREE.BoxGeometry(4.5, 6, 5.6), matDark), x, -1, z, -a + Math.PI / 2);
    add(new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 3), matStone), x, 7, z, -a + Math.PI / 2);
  }

  // ---------- walled approach ramp from the old town to the Honorary Gate ----------
  const rampPts = [
    new THREE.Vector3(104, 0.5, 6),
    new THREE.Vector3(140, -8, 16),
    new THREE.Vector3(168, -28, 48),
    new THREE.Vector3(192, -52, 96),
    new THREE.Vector3(212, -71, 140),
  ];
  const rampCurve = new THREE.CatmullRomCurve3(rampPts);
  const N = 44;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const p0 = rampCurve.getPointAt(t0), p1 = rampCurve.getPointAt(t1);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1) + 0.6;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.2, len), matStone);
    slab.position.copy(mid);
    slab.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(p0, p1, up));
    slab.castShadow = slab.receiveShadow = true;
    g.add(slab);
    // parapets
    const side = new THREE.Vector3().subVectors(p1, p0).cross(up).normalize();
    for (const s of [-1, 1]) {
      const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, len), matStone);
      wallSeg.position.copy(mid).addScaledVector(side, s * 4.0);
      wallSeg.position.y += 0.9;
      wallSeg.quaternion.copy(slab.quaternion);
      wallSeg.castShadow = true;
      g.add(wallSeg);
    }
  }

  return g;
}

function buildFlag() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 9, 8),
    new THREE.MeshStandardMaterial({ color: '#d8d8d8', metalness: 0.7, roughness: 0.4 }));
  pole.position.y = 4.5;
  pole.castShadow = true;
  group.add(pole);
  const geo = new THREE.PlaneGeometry(5.4, 3.6, 18, 10);
  geo.translate(2.7, 0, 0);
  const mat = new THREE.MeshStandardMaterial({
    map: makeFlagTexture(), side: THREE.DoubleSide, roughness: 0.9,
  });
  const flag = new THREE.Mesh(geo, mat);
  flag.position.set(0.1, 7.0, 0);
  flag.rotation.y = Math.PI * 0.78;   // stream away from the WSW sun-wind
  flag.castShadow = true;
  group.add(flag);
  const base = geo.attributes.position.array.slice();
  group.userData.update = (t) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const w = x / 5.4;
      pos.setZ(i, Math.sin(x * 1.9 - t * 5.2) * 0.28 * w + Math.sin(x * 0.9 + y * 1.3 - t * 3.1) * 0.16 * w);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return group;
}

function buildSvatopluk(matBronze, matStoneDark) {
  const s = new THREE.Group();
  s.position.set(62, 0.6, 6);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.6, 3.6), matStoneDark);
  ped.position.y = 1.3; ped.castShadow = ped.receiveShadow = true; s.add(ped);
  const bronze = new THREE.Group();
  bronze.position.y = 2.6;
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), matBronze);
  body.scale.set(2.1, 0.95, 0.8); body.position.set(0, 2.6, 0); bronze.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 1.8, 8), matBronze);
  neck.position.set(1.7, 3.6, 0); neck.rotation.z = -0.7; bronze.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.45), matBronze);
  head.position.set(2.5, 4.15, 0); head.rotation.z = -0.25; bronze.add(head);
  // legs — front pair raised (the rearing pose of the real statue)
  const legGeo = new THREE.CylinderGeometry(0.16, 0.13, 1.9, 6);
  for (const [lx, lz, ry, raise] of [[1.2, 0.35, 0.9, true], [1.2, -0.35, 0.7, true],
                                     [-1.3, 0.35, 0, false], [-1.3, -0.35, 0, false]]) {
    const leg = new THREE.Mesh(legGeo, matBronze);
    if (raise) { leg.position.set(lx + 0.5, 2.4, lz); leg.rotation.z = -ry; }
    else { leg.position.set(lx, 1.35, lz); }
    bronze.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.05, 1.6, 6), matBronze);
  tail.position.set(-2.2, 2.3, 0); tail.rotation.z = 0.9; bronze.add(tail);
  // rider with raised sword
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.5, 8), matBronze);
  torso.position.set(-0.1, 4.2, 0); bronze.add(torso);
  const rhead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), matBronze);
  rhead.position.set(-0.1, 5.25, 0); bronze.add(rhead);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.2, 6), matBronze);
  arm.position.set(0.35, 5.1, 0.25); arm.rotation.z = -0.9; bronze.add(arm);
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.2), matBronze);
  sword.position.set(0.95, 6.0, 0.35); sword.rotation.z = -0.35; bronze.add(sword);
  bronze.rotation.x = -0.12;
  bronze.traverse(o => { if (o.isMesh) o.castShadow = true; });
  s.add(bronze);
  return s;
}
