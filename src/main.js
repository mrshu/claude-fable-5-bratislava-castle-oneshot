import * as THREE from 'three';
import { buildTerrain, buildWater } from './terrain.js';
import { buildSky, buildLights, SUN_DIR } from './sky.js';
import { buildCastle } from './castle.js';
import { buildOldTown, buildLandmarks, buildBridge } from './city.js';
import { buildTrees, buildVineyards, buildBirds } from './nature.js';
import { CameraRig } from './cameras.js';
import { Showcase } from './cinematic.js';
import { Score } from './audio.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(new THREE.Color('#e0b58a'), 700, 3600);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 9000);
camera.position.set(-520, 10, 540);
camera.lookAt(260, 25, 470);

// ---- build the world ----
scene.add(buildSky());
scene.add(buildLights());
scene.add(buildTerrain());
const water = buildWater(SUN_DIR, scene.fog);
scene.add(water);
const castle = buildCastle();
scene.add(castle);
scene.add(buildOldTown());
scene.add(buildLandmarks());
scene.add(buildBridge());
scene.add(buildTrees());
scene.add(buildVineyards());
const birds = buildBirds();
scene.add(birds);

let flagUpdate = null;
castle.traverse(o => { if (o.userData.update) flagUpdate = o.userData.update; });

// ---- UI plumbing ----
const ui = {
  letterbox(on) { document.body.classList.toggle('cinema', on); },
  title(id, on) { document.getElementById(id).classList.toggle('on', on); },
};

const rig = new CameraRig(camera, renderer.domElement);
const score = new Score();

const hint = document.getElementById('hint');
rig.onModeChange = (mode) => {
  document.getElementById('btn-orbit').classList.toggle('active', mode === 'orbit');
  document.getElementById('btn-fly').classList.toggle('active', mode === 'fly');
  hint.textContent = mode === 'fly'
    ? 'WASD move · E/Q up/down · shift boost · scroll speed · esc exit'
    : 'drag to orbit · scroll to zoom · right-drag to pan';
};

const showcase = new Showcase(camera, ui, (finished) => {
  score.stop();
  document.body.classList.add('free');
  rig.setMode('orbit');
  if (finished) {
    // hand over exactly where the flight ended
    rig.orbit.target.set(0, 95, 10);
  }
});

function startShowcase() {
  document.getElementById('start').classList.add('hidden');
  document.body.classList.remove('free');
  rig.mode = 'locked';
  rig.orbit.enabled = false;
  score.start();
  showcase.play();
}

function skipToFree() {
  document.getElementById('start').classList.add('hidden');
  showcase.stop(false);
  camera.position.set(290, 200, 420);
  document.body.classList.add('free');
  rig.setMode('orbit');
}

document.getElementById('begin').addEventListener('click', startShowcase);
document.getElementById('skip-link').addEventListener('click', skipToFree);
document.getElementById('btn-orbit').addEventListener('click', () => rig.setMode('orbit'));
document.getElementById('btn-fly').addEventListener('click', () => rig.setMode('fly'));
document.getElementById('btn-replay').addEventListener('click', startShowcase);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && showcase.playing) showcase.stop(false);
  if (e.code === 'KeyR' && !showcase.playing && document.getElementById('start').classList.contains('hidden')) {
    startShowcase();
  }
  if (e.code === 'KeyF' && !showcase.playing) rig.setMode(rig.mode === 'fly' ? 'orbit' : 'fly');
});

// ---- main loop ----
const clock = new THREE.Clock();
let elapsed = 0;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  water.userData.uniforms.uTime.value = elapsed;
  flagUpdate?.(elapsed);
  birds.userData.update(elapsed);
  if (showcase.playing) showcase.update(dt);
  else rig.update(dt);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ready — enable the begin button
const begin = document.getElementById('begin');
begin.disabled = false;
begin.textContent = '▶ Begin Showcase';
document.getElementById('loading').style.visibility = 'hidden';
tick();

// ---- deterministic hooks for automated verification (harmless to users) ----
window.__ready = true;
window.__shot = (px, py, pz, tx, ty, tz) => {
  showcase.stop(false);
  document.getElementById('start').classList.add('hidden');
  rig.mode = 'locked';
  camera.position.set(px, py, pz);
  camera.lookAt(tx, ty, tz);
};
window.__seek = (t) => {
  document.getElementById('start').classList.add('hidden');
  rig.mode = 'locked';
  showcase.playing = true;
  showcase.t = t;
  showcase.prevHeading = null;
  showcase.roll = 0;
  showcase.update(0);
  showcase.playing = false;
};
window.__play = startShowcase;
