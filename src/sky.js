import * as THREE from 'three';

// Golden-hour sun, low over the Danube to the west-southwest.
export const SUN_DIR = new THREE.Vector3(-0.62, 0.155, 0.42).normalize();

export function buildSky() {
  const geo = new THREE.SphereGeometry(3900, 36, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uSunDir;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.13 + 17.0; a *= 0.5; }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float y = clamp(d.y, -0.05, 1.0);
        // base gradient, warmer toward the sun's side of the horizon
        vec3 zenith = vec3(0.16, 0.27, 0.50);
        vec3 mid    = vec3(0.50, 0.58, 0.74);
        vec3 horizonWarm = vec3(1.00, 0.66, 0.34);
        vec3 horizonCool = vec3(0.84, 0.62, 0.58);
        float sunSide = max(dot(normalize(vec2(d.x, d.z)), normalize(vec2(uSunDir.x, uSunDir.z))), 0.0);
        vec3 horizon = mix(horizonCool, horizonWarm, pow(sunSide, 1.6));
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, y));
        col = mix(col, zenith, smoothstep(0.12, 0.75, y));

        // sun disc + bloom
        float s = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.86, 0.62) * pow(s, 1500.0) * 22.0;   // disc
        col += vec3(1.0, 0.62, 0.30) * pow(s, 120.0) * 1.5;     // inner glow
        col += vec3(1.0, 0.55, 0.28) * pow(s, 10.0) * 0.35;     // wide wash

        // streaky golden cirrus
        if (d.y > 0.015) {
          vec2 cp = d.xz / (d.y + 0.10);
          float c = fbm(cp * vec2(1.6, 5.0) + vec2(3.1, 8.7));
          float band = smoothstep(0.50, 0.78, c) * (1.0 - smoothstep(0.10, 0.45, d.y));
          vec3 cloudCol = mix(vec3(0.95, 0.72, 0.62), vec3(1.05, 0.82, 0.58), pow(s, 3.0));
          col = mix(col, cloudCol, band * 0.55);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  sky.frustumCulled = false;
  return sky;
}

export function buildLights() {
  const group = new THREE.Group();
  const sun = new THREE.DirectionalLight('#ffd9a6', 2.6);
  sun.position.copy(SUN_DIR).multiplyScalar(1400);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -650; sc.right = 650; sc.top = 650; sc.bottom = -650;
  sc.near = 400; sc.far = 2600;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1.2;
  group.add(sun);
  group.add(sun.target);

  const hemi = new THREE.HemisphereLight('#9db8e2', '#b59a72', 0.85);
  group.add(hemi);

  // faint cool fill from the east so shadowed facades aren't dead black
  const fill = new THREE.DirectionalLight('#7e96c0', 0.35);
  fill.position.set(900, 400, -500);
  group.add(fill);
  return group;
}
