/**
 * İzleyici adı + profil fotoğrafı içeren 3B etiket (sprite).
 * Fotoğraf gelmezse adın baş harfiyle renkli daire çizer.
 */
import * as THREE from 'three';
import type { Viewer } from '../../../shared/events.ts';

const W = 512;
const H = 128;

export function colorFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 80% 58%)`;
}

export function createNameTag(viewer: Viewer, opts: { accent?: string } = {}): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const draw = (img?: HTMLImageElement) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.beginPath();
    ctx.roundRect(4, 14, W - 8, H - 28, 50);
    ctx.fill();
    if (opts.accent) {
      ctx.strokeStyle = opts.accent;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // avatar dairesi
    ctx.save();
    ctx.beginPath();
    ctx.arc(64, 64, 46, 0, Math.PI * 2);
    ctx.clip();
    if (img) ctx.drawImage(img, 18, 18, 92, 92);
    else {
      ctx.fillStyle = colorFor(viewer.id);
      ctx.fillRect(18, 18, 92, 92);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 54px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText([...viewer.name][0]?.toUpperCase() ?? '?', 64, 68);
    }
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 50px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(viewer.name, 128, 66, W - 150);
    texture.needsUpdate = true;
  };

  draw();
  if (viewer.avatar) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => draw(img);
    img.src = viewer.avatar;
  }

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(2.8, 0.7, 1);
  sprite.renderOrder = 10;
  return sprite;
}
