/**
 * Oyunlar arası ortak parçacıklar: konfeti (opak kâğıt, gündüz görünür) ve yükselen işaretler (♪ ♫ ♥).
 */
import * as THREE from 'three';
import { pop } from './sfx.ts';
import { createTextSprite, disposeSprite } from './textSprite.ts';

// ---------------------------------------------------------------- Konfeti
// Gündüz parlayan ışık efektleri görünmez; renkli, opak kâğıt parçaları görünür.
const CONFETTI_MAX = 900;
const PALETTE = ['#e30a17', '#ffffff', '#ffd25e', '#2f7fd8', '#33c27a', '#ff6fb1'];

interface Bit {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  life: number;
  delay: number;
  scale: number;
}

export class Confetti {
  private readonly mesh: THREE.InstancedMesh;
  private bits: (Bit | null)[] = new Array(CONFETTI_MAX).fill(null);
  private cursor = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly zero = new THREE.Vector3(0, 0, 0);

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.35, 0.22),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }),
      CONFETTI_MAX,
    );
    this.mesh.frustumCulled = false;
    for (let i = 0; i < CONFETTI_MAX; i++) {
      this.mesh.setMatrixAt(i, this.m.compose(this.zero, this.q, this.zero));
      this.mesh.setColorAt(i, new THREE.Color('#ffffff'));
    }
    scene.add(this.mesh);
  }

  /** at: patlama merkezi; spread: hız; scale: parça büyüklüğü (uzaktaki patlamalar için büyük) */
  burst(at: THREE.Vector3, color: string, count = 160, opts: { delay?: number; spread?: number; scale?: number } = {}): void {
    const colors = [color, ...PALETTE];
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % CONFETTI_MAX;
      const dir = new THREE.Vector3().randomDirection();
      dir.y = Math.abs(dir.y) * 0.8 + 0.2;
      this.bits[idx] = {
        pos: at.clone(),
        vel: dir.multiplyScalar((opts.spread ?? 9) * (0.5 + Math.random() * 0.6)),
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 4),
        life: 4 + Math.random() * 2,
        delay: opts.delay ?? 0,
        scale: opts.scale ?? 1,
      };
      this.mesh.setColorAt(idx, c.set(colors[i % colors.length]));
    }
    this.mesh.instanceColor!.needsUpdate = true;
    if (!opts.delay) pop();
    else setTimeout(() => pop(), opts.delay * 1000);
  }

  update(dt: number): void {
    for (let i = 0; i < CONFETTI_MAX; i++) {
      const b = this.bits[i];
      if (!b) continue;
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      b.life -= dt;
      if (b.life <= 0) {
        this.bits[i] = null;
        this.mesh.setMatrixAt(i, this.m.compose(this.zero, this.q, this.zero));
        continue;
      }
      // Hava direnci + yavaş süzülme
      b.vel.multiplyScalar(1 - dt * 1.8);
      b.vel.y -= 3.2 * dt;
      b.vel.x += Math.sin(b.life * 5 + i) * dt * 2;
      b.pos.addScaledVector(b.vel, dt);
      b.rot.x += b.spin.x * dt;
      b.rot.y += b.spin.y * dt;
      this.q.setFromEuler(b.rot);
      const s = b.scale * Math.min(1, b.life);
      this.mesh.setMatrixAt(i, this.m.compose(b.pos, this.q, this.one.clone().multiplyScalar(s)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- Yükselen işaretler (♪ ♫)
export class Floaters {
  private items: { sprite: THREE.Sprite; age: number; drift: number }[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  spawn(text: string, color: string, at: THREE.Vector3): void {
    const sprite = createTextSprite(text, { color, stroke: '#ffffff', font: 'bold 96px Segoe UI, sans-serif', height: 0.9, padding: 8 });
    sprite.position.copy(at);
    this.scene.add(sprite);
    this.items.push({ sprite, age: 0, drift: (Math.random() - 0.5) * 1.2 });
  }

  update(dt: number): void {
    this.items = this.items.filter((f) => {
      f.age += dt;
      f.sprite.position.y += dt * 1.4;
      f.sprite.position.x += f.drift * dt;
      f.sprite.material.opacity = Math.max(0, 1 - f.age / 2.5);
      if (f.age < 2.5) return true;
      disposeSprite(f.sprite);
      return false;
    });
  }
}
