import * as THREE from 'three';

// Deterministic RNG (mulberry32) so the scene is identical on every load.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- deterministic value noise (shared by terrain + placement) ----
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  return a * (1 - ux) * (1 - uz) + b * ux * (1 - uz) + c * (1 - ux) * uz + d * ux * uz;
}

export function fbm(x, z) {
  return vnoise(x, z) * 0.60 +
         vnoise(x * 2.7 + 13.1, z * 2.7 + 7.7) * 0.28 +
         vnoise(x * 7.3 + 51.2, z * 7.3 + 23.8) * 0.12;
}

export function smoothstep(e0, e1, x) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) { return a + (b - a) * t; }

// Merge a list of {geometry, matrix?, color?} into one vertex-colored geometry.
export function mergeToGeometry(items) {
  const positions = [], normals = [], colors = [], uvs = [];
  const tmpColor = new THREE.Color();
  for (const item of items) {
    let g = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone();
    if (item.matrix) g.applyMatrix4(item.matrix);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const uv = g.attributes.uv;
    tmpColor.set(item.color !== undefined ? item.color : 0xffffff);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
      if (uv) uvs.push(uv.getX(i), uv.getY(i)); else uvs.push(0, 0);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return out;
}

// Hipped roof: footprint w (x) by d (z), ridge height h, eaves overhang o.
// Base sits at y=0, ridge along the longer axis.
export function makeHipRoof(w, d, h, o = 0.8) {
  const hw = w / 2 + o, hd = d / 2 + o;
  let r; // half ridge length, ridge along x if w >= d
  const alongX = w >= d;
  r = Math.max(0.01, (Math.abs(w - d)) / 2);
  const P = [];
  const tri = (a, b, c) => { P.push(...a, ...b, ...c); };
  if (alongX) {
    const A = [-hw, 0, hd], B = [hw, 0, hd], C = [hw, 0, -hd], D = [-hw, 0, -hd];
    const R1 = [-r, h, 0], R2 = [r, h, 0];
    tri(A, B, R2); tri(A, R2, R1);        // south slope
    tri(C, D, R1); tri(C, R1, R2);        // north slope
    tri(B, C, R2);                        // east hip
    tri(D, A, R1);                        // west hip
  } else {
    const A = [-hw, 0, hd], B = [hw, 0, hd], C = [hw, 0, -hd], D = [-hw, 0, -hd];
    const R1 = [0, h, -r], R2 = [0, h, r];
    tri(B, C, R1); tri(B, R1, R2);        // east slope
    tri(D, A, R2); tri(D, R2, R1);        // west slope
    tri(A, B, R2);                        // south hip
    tri(C, D, R1);                        // north hip
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  // simple planar UVs so tile textures read correctly
  const uv = [];
  for (let i = 0; i < P.length; i += 3) uv.push(P[i] / 3, (P[i + 2] + P[i + 1]) / 3);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
