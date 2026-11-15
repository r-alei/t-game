/** Dalgalanan Türk bayrağı (vapurun kıçında ve Kız Kulesi'nde). */
import * as THREE from 'three';

export interface Flag {
  object: THREE.Object3D;
  update(dt: number): void;
}

function flagTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 200;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e30a17';
  ctx.fillRect(0, 0, 300, 200);
  // Ay: dış daire beyaz, içteki kırmızı daire kaydırılmış
  const cx = 100;
  const cy = 100;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e30a17';
  ctx.beginPath();
  ctx.arc(cx + 12.5, cy, 40, 0, Math.PI * 2);
  ctx.fill();
  // Yıldız
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const sx = cx + 70;
  const r = 25;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + Math.PI / 2; // bir ucu aya bakar
    const rr = i % 2 === 0 ? r : r * 0.382;
    ctx.lineTo(sx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let shared: THREE.CanvasTexture | null = null;

/** width: bayrağın dünya birimi genişliği. Direk dahil nesne döner; direğin dibi (0,0,0). */
export function makeTurkishFlag(width = 2): Flag {
  shared ??= flagTexture();
  const h = width / 1.5;
  const geo = new THREE.PlaneGeometry(width, h, 12, 4);
  geo.translate(width / 2, 0, 0);
  const base = Float32Array.from(geo.attributes.position.array);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: shared, side: THREE.DoubleSide, roughness: 0.8 }));
  const poleH = h * 3;
  cloth.position.y = poleH - h / 2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.02, width * 0.025, poleH, 6).translate(0, poleH / 2, 0), new THREE.MeshStandardMaterial({ color: '#dddddd' }));
  const object = new THREE.Group();
  object.add(pole, cloth);
  let t = Math.random() * 10;
  return {
    object,
    update(dt: number) {
      t += dt;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const k = x / width; // direkten uzaklaştıkça daha çok dalgalanır
        pos.setZ(i, Math.sin(x * 2.2 - t * 6) * 0.12 * width * k);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}
