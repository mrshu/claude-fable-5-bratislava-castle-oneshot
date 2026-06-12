import * as THREE from 'three';
import { fbm, smoothstep, lerp } from './util.js';
import { makeGroundDetailTexture } from './textures.js';

// World layout (meters): castle plateau at origin (top y = 84), Danube to the
// south (+z), old town to the east (+x), Carpathian foothills far north-west.
export const PLATEAU_Y = 84;
export const HILL = { cx: 10, cz: -5, ax: 205, az: 185 };

export function zRiver(x) { return 390 + 70 * Math.sin(x * 0.0013 + 0.6); }

export function hillRR(x, z) {
  const dx = (x - HILL.cx) / HILL.ax, dz = (z - HILL.cz) / HILL.az;
  return Math.sqrt(dx * dx + dz * dz);
}

export function groundHeight(x, z) {
  // rolling base terrain
  let h = 6 + 11 * fbm(x * 0.0035, z * 0.0035);
  // far NW hills (Slavín / Little Carpathians foothills)
  const nw = Math.exp(-(((x + 700) / 520) ** 2 + ((z + 600) / 420) ** 2));
  h += 85 * nw;
  // distant northern ridge for the horizon silhouette
  h += 120 * Math.exp(-(((z + 1350) / 420) ** 2)) * (0.7 + 0.3 * fbm(x * 0.002, 7));

  // castle hill with a flat plateau
  const rr = hillRR(x, z);
  let hill = PLATEAU_Y * (1 - smoothstep(0.5, 1.35, rr));
  hill += 9 * smoothstep(0.5, 0.8, rr) * (1 - smoothstep(1.15, 1.4, rr)) * (fbm(x * 0.02, z * 0.02) - 0.5);
  h = Math.max(h, hill);

  // flatten the old town basin east of the hill
  const townMask = smoothstep(220, 300, x) * (1 - smoothstep(820, 900, x)) *
                   smoothstep(-160, -90, z) * (1 - smoothstep(250, 320, z)) *
                   (1 - smoothstep(1.05, 0.8, rr) * 0); // keep simple fade by x/z only
  h = lerp(h, 8.5 + 2 * fbm(x * 0.01, z * 0.01), townMask * (1 - smoothstep(1.35, 0.95, rr)));

  // carve the Danube (full width ~300 m like the real river)
  const d = Math.abs(z - zRiver(x));
  const riverMask = 1 - smoothstep(150, 230, d);
  h = lerp(h, -5.5, riverMask);
  return h;
}

export function buildTerrain() {
  const W = 4200, D = 3200, SX = 400, SZ = 300;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color('#5d7c3f'), cGrassDry = new THREE.Color('#7d8a4a');
  const cRock = new THREE.Color('#8b8273'), cSand = new THREE.Color('#7e6f54');
  const cTown = new THREE.Color('#a09a8e'), cLawn = new THREE.Color('#52743c');
  const cRidge = new THREE.Color('#5a6b55');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    // slope via finite differences
    const e = 4;
    const sx = (groundHeight(x + e, z) - groundHeight(x - e, z)) / (2 * e);
    const sz = (groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e);
    const slope = Math.sqrt(sx * sx + sz * sz);
    const n = fbm(x * 0.008, z * 0.008);
    tmp.copy(cGrass).lerp(cGrassDry, n);
    if (hillRR(x, z) < 0.62) tmp.copy(cLawn).lerp(cGrass, n * 0.5);
    // town pavement
    const town = smoothstep(240, 300, x) * (1 - smoothstep(800, 880, x)) *
                 smoothstep(-140, -90, z) * (1 - smoothstep(230, 300, z));
    tmp.lerp(cTown, town * (h > 2 ? 1 : 0));
    // rock on steep slopes
    tmp.lerp(cRock, smoothstep(0.55, 1.0, slope) * 0.85);
    // sandy shore and riverbed
    tmp.lerp(cSand, 1 - smoothstep(0.8, 3.2, h));
    // far ridge gets a hazy blue-green
    if (z < -900) tmp.lerp(cRidge, smoothstep(-900, -1300, z) * 0.7);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const detail = makeGroundDetailTexture();
  detail.repeat.set(180, 140);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: detail, roughness: 1.0, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// ---- Danube water (custom shader: waves, fresnel sky, golden-hour glint) ----
export function buildWater(sunDir, fog) {
  const geo = new THREE.PlaneGeometry(4200, 1100, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone() },
    uSunColor: { value: new THREE.Color('#ffc878') },
    uZenith: { value: new THREE.Color('#39558c') },
    uHorizon: { value: new THREE.Color('#f2b27a') },
    uDeep: { value: new THREE.Color('#22454e') },
    uFogColor: { value: fog.color.clone() },
    uFogNear: { value: fog.near },
    uFogFar: { value: fog.far },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vWorld;
      uniform float uTime;
      uniform vec3 uSunDir, uSunColor, uZenith, uHorizon, uDeep, uFogColor;
      uniform float uFogNear, uFogFar;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
      }

      vec3 waterNormal(vec2 p, float t) {
        // river flows east: phases drift along +x
        float e = 0.65;
        float h0 = noise(p * 0.10 + vec2(t * 0.35, 0.0)) * 0.55
                 + noise(p * 0.23 + vec2(t * 0.62, t * 0.11)) * 0.30
                 + noise(p * 0.55 + vec2(t * 1.05, -t * 0.18)) * 0.15;
        float hx = noise((p + vec2(e, 0.0)) * 0.10 + vec2(t * 0.35, 0.0)) * 0.55
                 + noise((p + vec2(e, 0.0)) * 0.23 + vec2(t * 0.62, t * 0.11)) * 0.30
                 + noise((p + vec2(e, 0.0)) * 0.55 + vec2(t * 1.05, -t * 0.18)) * 0.15;
        float hz = noise((p + vec2(0.0, e)) * 0.10 + vec2(t * 0.35, 0.0)) * 0.55
                 + noise((p + vec2(0.0, e)) * 0.23 + vec2(t * 0.62, t * 0.11)) * 0.30
                 + noise((p + vec2(0.0, e)) * 0.55 + vec2(t * 1.05, -t * 0.18)) * 0.15;
        float amp = 1.35;
        return normalize(vec3(-(hx - h0) * amp, 1.0, -(hz - h0) * amp));
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 N = waterNormal(vWorld.xz * 0.6, uTime);
        vec3 R = reflect(-V, N);
        float fres = 0.05 + 0.95 * pow(1.0 - max(dot(V, N), 0.0), 5.0);
        // the reflected sky is warm only toward the sun's side of the horizon
        float sunSide = pow(max(dot(normalize(R.xz), normalize(uSunDir.xz)), 0.0), 3.0);
        vec3 horizon = mix(vec3(0.55, 0.64, 0.76), uHorizon, sunSide);
        vec3 sky = mix(horizon, uZenith, pow(max(R.y, 0.0), 0.6));
        vec3 col = mix(uDeep, sky, clamp(fres * 1.1, 0.0, 1.0));
        float sd = max(dot(R, uSunDir), 0.0);
        col += uSunColor * (pow(sd, 700.0) * 9.0 + pow(sd, 48.0) * 0.55 + pow(sd, 7.0) * 0.12);
        // sparkles riding the wave crests
        float sp = noise(vWorld.xz * 1.4 + vec2(uTime * 1.4, 0.0));
        col += uSunColor * smoothstep(0.86, 0.99, sp) * pow(sd, 18.0) * 1.4;
        float dist = length(cameraPosition - vWorld);
        float fogF = smoothstep(uFogNear, uFogFar, dist);
        col = mix(col, uFogColor, fogF);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, 480);
  mesh.name = 'water';
  mesh.userData.uniforms = uniforms;
  return mesh;
}
