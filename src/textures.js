import * as THREE from 'three';
import { makeRng } from './util.js';

function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = opts.anisotropy ?? 8;
  return t;
}

function plasterNoise(ctx, w, h, base, amount, rng) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const a = (rng() - 0.5) * amount;
    ctx.fillStyle = `rgba(${a > 0 ? 255 : 30},${a > 0 ? 250 : 28},${a > 0 ? 235 : 22},${Math.abs(a)})`;
    ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 5, 2 + rng() * 5);
  }
}

// One tile = 4 window bays, 3 floors of baroque windows over a stone base.
// Tile by setting texture.repeat.x = facadeLength / 16 (one bay ≈ 4 m).
export function makeFacadeTexture({ tower = false } = {}) {
  const rng = makeRng(tower ? 77 : 42);
  return canvasTexture(512, 512, (ctx, w, h) => {
    plasterNoise(ctx, w, h, '#efe7d8', 0.05, rng);
    const bays = tower ? 2 : 4, bayW = w / bays;
    // stone base course
    ctx.fillStyle = '#cfc4ae'; ctx.fillRect(0, h - 70, w, 70);
    ctx.strokeStyle = 'rgba(90,80,60,0.25)'; ctx.lineWidth = 2;
    for (let y = h - 70; y < h; y += 23) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // cornice strips
    ctx.fillStyle = '#ddd2bd'; ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = 'rgba(120,105,80,0.35)'; ctx.fillRect(0, 14, w, 3);
    ctx.fillStyle = 'rgba(120,105,80,0.2)'; ctx.fillRect(0, 168, w, 4); ctx.fillRect(0, 318, w, 4);
    const floors = [[52, 82], [204, 80], [352, 78]]; // [top, height] per floor
    for (let b = 0; b < bays; b++) {
      const cx = b * bayW + bayW / 2;
      for (const [top, wh] of floors) {
        const ww = 46;
        // surround
        ctx.fillStyle = '#dcd2bf'; ctx.fillRect(cx - ww / 2 - 8, top - 10, ww + 16, wh + 18);
        // pediment bar
        ctx.fillStyle = '#c9bda4'; ctx.fillRect(cx - ww / 2 - 12, top - 16, ww + 24, 8);
        // glass — dusk reflection
        const grad = ctx.createLinearGradient(0, top, 0, top + wh);
        grad.addColorStop(0, '#4a5668'); grad.addColorStop(0.55, '#36404e');
        grad.addColorStop(1, '#2a3038');
        ctx.fillStyle = grad; ctx.fillRect(cx - ww / 2, top, ww, wh);
        // warm interior light in a few windows
        if (rng() < 0.18) { ctx.fillStyle = 'rgba(255,196,110,0.85)'; ctx.fillRect(cx - ww / 2 + 2, top + 2, ww - 4, wh - 4); }
        // muntins
        ctx.strokeStyle = '#e7e0d0'; ctx.lineWidth = 3;
        ctx.strokeRect(cx - ww / 2, top, ww, wh);
        ctx.beginPath();
        ctx.moveTo(cx, top); ctx.lineTo(cx, top + wh);
        ctx.moveTo(cx - ww / 2, top + wh / 2); ctx.lineTo(cx + ww / 2, top + wh / 2);
        ctx.stroke();
        // sill
        ctx.fillStyle = '#c9bda4'; ctx.fillRect(cx - ww / 2 - 6, top + wh + 2, ww + 12, 6);
      }
    }
  });
}

export function makeRoofTexture() {
  const rng = makeRng(9);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9c4a30'; ctx.fillRect(0, 0, w, h);
    const rows = 10, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 12;
      for (let x = -12; x < w + 12; x += 24) {
        const v = 0.82 + rng() * 0.4;
        ctx.fillStyle = `rgb(${Math.min(255, 158 * v) | 0},${(74 * v) | 0},${(46 * v) | 0})`;
        ctx.fillRect(x + off, r * rh, 22, rh - 2);
      }
      ctx.fillStyle = 'rgba(40,16,10,0.45)'; ctx.fillRect(0, r * rh + rh - 3, w, 3);
    }
  });
}

export function makePavingTexture() {
  const rng = makeRng(5);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b7ac98'; ctx.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const v = 0.9 + rng() * 0.2;
      ctx.fillStyle = `rgb(${(183 * v) | 0},${(172 * v) | 0},${(152 * v) | 0})`;
      ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
  });
}

export function makeAsphaltTexture() {
  const rng = makeRng(13);
  return canvasTexture(128, 512, (ctx, w, h) => {
    plasterNoise(ctx, w, h, '#3c3e42', 0.05, rng);
    ctx.fillStyle = '#cfd2cf';
    for (let y = 10; y < h; y += 64) { ctx.fillRect(w / 2 - 2, y, 4, 30); }
    ctx.fillRect(6, 0, 4, h); ctx.fillRect(w - 10, 0, 4, h);
  });
}

// Subtle grayscale detail map tiled over the terrain to break up flat shading.
export function makeGroundDetailTexture() {
  const rng = makeRng(21);
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a9a9a9'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 150 + rng() * 110;
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
      ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 3);
    }
  });
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// Slovak national flag with the double-cross coat of arms.
export function makeFlagTexture() {
  return canvasTexture(256, 170, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h / 3);
    ctx.fillStyle = '#0b4ea2'; ctx.fillRect(0, h / 3, w, h / 3);
    ctx.fillStyle = '#ee1c25'; ctx.fillRect(0, 2 * h / 3, w, h / 3);
    // shield
    const sx = 78, sy = 30, sw = 64, sh = 92;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2 - 5, sy - 5); ctx.lineTo(sx + sw / 2 + 5, sy - 5);
    ctx.lineTo(sx + sw / 2 + 5, sy + sh * 0.55);
    ctx.quadraticCurveTo(sx + sw / 2 + 5, sy + sh, sx, sy + sh + 8);
    ctx.quadraticCurveTo(sx - sw / 2 - 5, sy + sh, sx - sw / 2 - 5, sy + sh * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ee1c25';
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2, sy); ctx.lineTo(sx + sw / 2, sy);
    ctx.lineTo(sx + sw / 2, sy + sh * 0.55);
    ctx.quadraticCurveTo(sx + sw / 2, sy + sh - 6, sx, sy + sh);
    ctx.quadraticCurveTo(sx - sw / 2, sy + sh - 6, sx - sw / 2, sy + sh * 0.55);
    ctx.closePath(); ctx.fill();
    // blue triple hill
    ctx.fillStyle = '#0b4ea2';
    ctx.beginPath();
    ctx.arc(sx - 16, sy + sh - 18, 13, Math.PI, 0);
    ctx.arc(sx, sy + sh - 22, 15, Math.PI, 0);
    ctx.arc(sx + 16, sy + sh - 18, 13, Math.PI, 0);
    ctx.lineTo(sx + sw / 2 - 4, sy + sh - 6);
    ctx.lineTo(sx - sw / 2 + 4, sy + sh - 6);
    ctx.closePath(); ctx.fill();
    // white double cross
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 5, sy + 8, 10, 52);
    ctx.fillRect(sx - 17, sy + 18, 34, 9);
    ctx.fillRect(sx - 22, sy + 36, 44, 9);
  });
}
