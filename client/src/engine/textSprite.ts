/** Kanvasa yazılmış metinden 3B sprite üretir (gökyüzü yazıları, konuşma balonları). */
import * as THREE from 'three';

export interface TextSpriteOptions {
  color?: string;
  background?: string;
  font?: string;
  /** Sprite'ın dünya birimi cinsinden yüksekliği */
  height?: number;
  padding?: number;
  glow?: string;
  /** Balon kuyruğu çiz */
  tail?: boolean;
  /** Gündüz okunabilirliği için yazı çevresine kontur */
  stroke?: string;
}

export function createTextSprite(text: string, opts: TextSpriteOptions = {}): THREE.Sprite {
  const font = opts.font ?? 'bold 64px Segoe UI, sans-serif';
  const pad = opts.padding ?? 24;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 64);
  const width = Math.ceil(measure.measureText(text).width) + pad * 2;
  const tailH = opts.tail ? size * 0.4 : 0;
  const height = Math.ceil(size * 1.35) + pad + tailH;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height - tailH, Math.min(40, (height - tailH) / 2));
    if (opts.tail) {
      ctx.moveTo(width / 2 - tailH, height - tailH);
      ctx.lineTo(width / 2, height);
      ctx.lineTo(width / 2 + tailH, height - tailH);
    }
    ctx.fill();
  }
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = size * 0.4;
  }
  const ty = (height - tailH) / 2 + size * 0.04;
  if (opts.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = opts.stroke;
    ctx.strokeText(text, width / 2, ty);
  }
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.fillText(text, width / 2, ty);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const h = opts.height ?? 1;
  sprite.scale.set((h * width) / height, h, 1);
  return sprite;
}

export function disposeSprite(sprite: THREE.Sprite): void {
  sprite.material.map?.dispose();
  sprite.material.dispose();
  sprite.removeFromParent();
}
