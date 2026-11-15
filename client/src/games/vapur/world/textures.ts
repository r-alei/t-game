/** Kodla üretilen dokular: dalga normali, bina pencereleri, yumuşak ışık lekesi. */
import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Döşenebilir dalga normal haritası (sinüs dalgalarının toplamından türetilir). */
export function waveNormalTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const waves = [
    { kx: 3, ky: 1, a: 1.0 },
    { kx: -2, ky: 4, a: 0.7 },
    { kx: 7, ky: -3, a: 0.35 },
    { kx: 1, ky: 9, a: 0.25 },
    { kx: -11, ky: 5, a: 0.15 },
  ];
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dy = 0;
      for (const w of waves) {
        const phase = tau * ((w.kx * x) / size + (w.ky * y) / size);
        const d = Math.cos(phase) * w.a;
        dx += d * w.kx;
        dy += d * w.ky;
      }
      const n = new THREE.Vector3(-dx * 0.05, -dy * 0.05, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Gece bina cephesi: rastgele yanan sıcak pencereler. */
export function windowTexture(seed: number, litRatio = 0.35): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 256);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = '#0d0f18';
  ctx.fillRect(0, 0, 128, 256);
  const warm = ['#ffd68a', '#ffc46b', '#ffe9b8', '#ffb35c', '#cfe3ff'];
  for (let y = 6; y < 256; y += 16) {
    for (let x = 6; x < 128; x += 14) {
      if (rand() < litRatio) {
        ctx.fillStyle = warm[Math.floor(rand() * warm.length)];
        ctx.fillRect(x, y, 8, 9);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Ortası parlak, kenarı saydam leke (ay, ışık yansıması, kıvılcım). */
export function glowTexture(stretch = 1): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, Math.round(64 * stretch));
  const g = ctx.createRadialGradient(32, c.height / 2, 0, 32, c.height / 2, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.setTransform(1, 0, 0, stretch, 0, 0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Gündüz cephe: açık duvar, koyu pencereler. Rengi örnek başına verilir (çarpılır). */
export function dayWindowTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#5d6b78';
  for (let y = 8; y < 60; y += 18) {
    for (let x = 7; x < 60; x += 16) ctx.fillRect(x, y, 8, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
