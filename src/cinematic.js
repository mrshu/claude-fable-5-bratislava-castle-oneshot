import * as THREE from 'three';

export const SHOW_LEN = 20;

// The 20-second showcase, in four movements:
//   I.   (0–5s)   low over the Danube at golden hour, gliding toward Most SNP
//   II.  (5–10s)  rise along the wooded slope toward the Crown Tower
//   III. (10–15s) hero arc past the east facade and the Honorary Courtyard
//   IV.  (15–20s) pull away to a grand aerial, sun flaring behind the castle
// Both tracks are keyed on showcase time, so framing is fully directed.
const CAM_KEYS = [
  [0.0, -520, 11, 500],
  [3.0, -270, 14, 482],
  [5.5, -40, 30, 420],
  [8.0, 100, 66, 300],
  [10.5, 138, 102, 160],
  [13.0, 152, 122, 25],
  [15.0, 110, 124, -85],
  [17.5, 265, 152, -162],
  [20.0, 455, 215, -150],
];

const LOOK_KEYS = [
  [0.0, 150, 30, 430],
  [3.0, 215, 48, 405],
  [5.5, 60, 85, 220],
  [8.0, -26, 106, 45],
  [10.5, -15, 102, 30],
  [13.0, 32, 94, 8],
  [15.0, 0, 98, 0],
  [17.5, -28, 94, 38],
  [20.0, -62, 90, 60],
];

class Vec3Track {
  constructor(keys) {
    this.times = keys.map(k => k[0]);
    this.pts = keys.map(k => new THREE.Vector3(k[1], k[2], k[3]));
  }
  sample(t, out) {
    const ts = this.times, ps = this.pts, n = ts.length;
    if (t <= ts[0]) return out.copy(ps[0]);
    if (t >= ts[n - 1]) return out.copy(ps[n - 1]);
    let i = 0;
    while (i < n - 2 && t > ts[i + 1]) i++;
    const u = (t - ts[i]) / (ts[i + 1] - ts[i]);
    const p0 = ps[Math.max(0, i - 1)], p1 = ps[i], p2 = ps[i + 1], p3 = ps[Math.min(n - 1, i + 2)];
    return catmullRom(p0, p1, p2, p3, u, out);
  }
}

function catmullRom(p0, p1, p2, p3, t, out) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return out.set(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y), f(p0.z, p1.z, p2.z, p3.z));
}

export class Showcase {
  constructor(camera, ui, onDone) {
    this.camera = camera;
    this.ui = ui;           // {letterbox(on), title(id, on)}
    this.onDone = onDone;
    this.camTrack = new Vec3Track(CAM_KEYS);
    this.lookTrack = new Vec3Track(LOOK_KEYS);
    this.playing = false;
    this.t = 0;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._buildTimeWarp();
    this.titles = [
      { id: 'title-main', t0: 1.2, t1: 6.2 },
      { id: 'title-tower', t0: 8.2, t1: 12.4 },
      { id: 'title-credit', t0: 15.6, t1: 19.3 },
    ];
  }

  // Ease in/out at the ends, steady glide in the middle: integrate a smooth
  // speed profile once and normalize it into a lookup table.
  _buildTimeWarp() {
    const N = 800, table = new Float32Array(N + 1);
    let acc = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const speed = 0.25 +
        smooth01(u / 0.14) * (1 - smooth01((u - 0.84) / 0.16));
      acc += speed;
      table[i] = acc;
    }
    for (let i = 0; i <= N; i++) table[i] /= acc;
    table[0] = 0; table[N] = 1;
    this.warp = table;
  }

  _warped(u) {
    const N = this.warp.length - 1;
    const f = Math.min(Math.max(u, 0), 1) * N;
    const i = Math.floor(f);
    if (i >= N) return 1;
    return this.warp[i] + (this.warp[i + 1] - this.warp[i]) * (f - i);
  }

  play() {
    this.playing = true;
    this.t = 0;
    this.prevHeading = null;
    this.roll = 0;
    this.ui.letterbox(true);
    for (const tt of this.titles) { tt.shown = false; this.ui.title(tt.id, false); }
  }

  stop(finished) {
    const wasPlaying = this.playing;
    this.playing = false;
    // always clear cinema UI, even if we weren't mid-flight
    this.ui.letterbox(false);
    for (const tt of this.titles) { tt.shown = false; this.ui.title(tt.id, false); }
    if (wasPlaying) this.onDone?.(finished);
  }

  update(dt) {
    if (!this.playing) return;
    this.t += dt;
    if (this.t >= SHOW_LEN) { this.stop(true); return; }
    const tw = this._warped(this.t / SHOW_LEN) * SHOW_LEN;
    const pos = this.camTrack.sample(tw, this._pos);
    const look = this.lookTrack.sample(tw, this._look);
    // a breath of organic sway so the move doesn't feel machined
    const t = this.t;
    look.x += Math.sin(t * 0.43 + 1.7) * 1.6;
    look.y += Math.sin(t * 0.61 + 0.4) * 1.1;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    // gentle banking through the turns
    const dir = new THREE.Vector3().subVectors(look, pos);
    const heading = Math.atan2(dir.x, dir.z);
    if (this.prevHeading !== null && dt > 0) {
      let dh = heading - this.prevHeading;
      if (dh > Math.PI) dh -= Math.PI * 2;
      if (dh < -Math.PI) dh += Math.PI * 2;
      const targetRoll = THREE.MathUtils.clamp(dh / Math.max(dt, 1e-3) * 0.10, -0.045, 0.045);
      this.roll += (targetRoll - this.roll) * Math.min(1, dt * 2.0);
    }
    this.prevHeading = heading;
    this.camera.rotateZ(this.roll);

    for (const tt of this.titles) {
      const on = this.t >= tt.t0 && this.t <= tt.t1;
      if (on !== tt.shown) { tt.shown = on; this.ui.title(tt.id, on); }
    }
  }
}

function smooth01(x) {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
}
