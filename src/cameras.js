import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { groundHeight } from './terrain.js';

// Two inspection modes: ORBIT (default, around the castle) and FLY
// (pointer-lock WASD). The cinematic showcase drives the camera directly.
export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.mode = 'locked'; // locked | orbit | fly

    this.orbit = new OrbitControls(camera, dom);
    this.orbit.target.set(0, 95, 10);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.06;
    this.orbit.minDistance = 25;
    this.orbit.maxDistance = 1600;
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.enabled = false;

    // fly state
    this.keys = new Set();
    this.yaw = 0; this.pitch = 0;
    this.flySpeed = 60;
    this.vel = new THREE.Vector3();

    dom.addEventListener('mousemove', (e) => {
      if (this.mode !== 'fly' || document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    dom.addEventListener('wheel', (e) => {
      if (this.mode !== 'fly') return;
      this.flySpeed = Math.max(8, Math.min(400, this.flySpeed * (e.deltaY > 0 ? 0.88 : 1.14)));
    }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== dom && this.mode === 'fly') this.setMode('orbit');
    });
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.orbit.enabled = (mode === 'orbit');
    if (mode === 'orbit') {
      if (document.pointerLockElement === this.dom) document.exitPointerLock();
      // keep looking roughly where we were
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const dist = Math.min(400, Math.max(60, this.camera.position.distanceTo(this.orbit.target)));
      this.orbit.target.copy(this.camera.position).addScaledVector(dir, dist);
      if (this.orbit.target.y < 2) this.orbit.target.y = 2;
    } else if (mode === 'fly') {
      const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.yaw = e.y; this.pitch = e.x;
      this.dom.requestPointerLock();
    }
    this.onModeChange?.(mode);
  }

  update(dt) {
    if (this.mode === 'orbit') {
      this.orbit.update();
    } else if (this.mode === 'fly') {
      const sp = this.flySpeed * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      this.camera.quaternion.copy(q);
      const move = new THREE.Vector3();
      if (this.keys.has('KeyW')) move.z -= 1;
      if (this.keys.has('KeyS')) move.z += 1;
      if (this.keys.has('KeyA')) move.x -= 1;
      if (this.keys.has('KeyD')) move.x += 1;
      if (move.lengthSq()) move.normalize().applyQuaternion(q);
      if (this.keys.has('KeyE') || this.keys.has('Space')) move.y += 1;
      if (this.keys.has('KeyQ')) move.y -= 1;
      this.vel.lerp(move.multiplyScalar(sp), 1 - Math.pow(0.0001, dt));
      this.camera.position.addScaledVector(this.vel, dt);
    }
    if (this.mode !== 'locked') {
      // never sink under the terrain
      const floor = groundHeight(this.camera.position.x, this.camera.position.z) + 2.2;
      if (this.camera.position.y < floor) this.camera.position.y = floor;
      if (this.camera.position.y < 1.5) this.camera.position.y = 1.5;
    }
  }
}
