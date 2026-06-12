// Generative 20-second score: a warm D-minor pad that swells and resolves
// to D major as the camera pulls away. Pure WebAudio, no assets.
export class Score {
  constructor() { this.ctx = null; }

  start() {
    this.stop();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    const t0 = ctx.currentTime + 0.05;

    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.gain.setValueAtTime(0.0, t0);
    master.gain.linearRampToValueAtTime(0.32, t0 + 2.5);
    master.gain.setValueAtTime(0.32, t0 + 16.5);
    master.gain.linearRampToValueAtTime(0.0, t0 + 19.8);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    // simple feedback-delay "hall"
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.31;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 1600;
    delay.connect(damp).connect(fb).connect(delay);
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    delay.connect(wet).connect(master);
    const bus = ctx.createGain();
    bus.connect(master); bus.connect(delay);

    const osc = (freq, type, gain, at, rel, detune = 0, end = 20) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0 + at - 0.001 < 0 ? t0 : t0 + at);
      g.gain.setValueAtTime(0, t0 + Math.max(0, at));
      g.gain.linearRampToValueAtTime(gain, t0 + at + rel);
      g.gain.setValueAtTime(gain, t0 + end - 1.5);
      g.gain.linearRampToValueAtTime(0, t0 + end);
      o.connect(g).connect(bus);
      o.start(t0 + Math.max(0, at)); o.stop(t0 + end + 0.1);
      return o;
    };

    // deep drone — D2 + fifth
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(280, t0);
    lp.frequency.linearRampToValueAtTime(1500, t0 + 14);
    const droneBus = ctx.createGain(); droneBus.gain.value = 1;
    droneBus.connect(lp).connect(bus);
    for (const [f, dt_] of [[73.42, -5], [73.42, 5], [110, -3]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt_;
      const g = ctx.createGain(); g.gain.value = 0.16;
      o.connect(g).connect(droneBus);
      o.start(t0); o.stop(t0 + 20.1);
    }

    // pad chord: D minor blooming in layers…
    osc(146.83, 'triangle', 0.22, 0.5, 3.0);          // D3
    osc(220.0, 'triangle', 0.18, 2.0, 3.0);           // A3
    osc(349.23, 'sine', 0.13, 4.0, 3.5, 4, 15.4);     // F4 (minor third, bows out…)
    osc(293.66, 'sine', 0.10, 6.0, 3.0, -4);          // D4
    osc(440.0, 'sine', 0.07, 9.0, 3.0);               // A4
    // …and at 15 s it resolves up to F# — D major for the final aerial
    osc(369.99, 'sine', 0.16, 14.8, 1.8, 0);          // F#4
    osc(587.33, 'sine', 0.06, 15.2, 2.5, 3);          // D5 sparkle

    // high shimmer entering mid-flight
    const sh = osc(1174.66, 'sine', 0.025, 10, 4, 7);
    const shLfo = ctx.createOscillator(); shLfo.frequency.value = 5.3;
    const shLfoG = ctx.createGain(); shLfoG.gain.value = 6;
    shLfo.connect(shLfoG).connect(sh.frequency);
    shLfo.start(t0); shLfo.stop(t0 + 20);

    // air: filtered noise (river wind)
    const nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = nbuf; noise.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 480; nf.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.05, t0);
    ng.gain.linearRampToValueAtTime(0.10, t0 + 5);
    ng.gain.linearRampToValueAtTime(0.04, t0 + 12);
    ng.gain.linearRampToValueAtTime(0.09, t0 + 17);
    ng.gain.linearRampToValueAtTime(0.0, t0 + 19.6);
    noise.connect(nf).connect(ng).connect(bus);
    noise.start(t0); noise.stop(t0 + 20);

    // soft opening swell
    const boom = ctx.createOscillator(); boom.type = 'sine';
    boom.frequency.setValueAtTime(48, t0); boom.frequency.exponentialRampToValueAtTime(36, t0 + 2.2);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(0.30, t0 + 0.5);
    bg.gain.exponentialRampToValueAtTime(0.001, t0 + 3.5);
    boom.connect(bg).connect(bus);
    boom.start(t0); boom.stop(t0 + 4);
  }

  stop() {
    if (this.ctx) {
      const c = this.ctx, m = this.master;
      try {
        m.gain.cancelScheduledValues(c.currentTime);
        m.gain.setValueAtTime(m.gain.value, c.currentTime);
        m.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
      } catch (e) { /* already closed */ }
      setTimeout(() => c.close().catch(() => {}), 600);
      this.ctx = null;
    }
  }
}
