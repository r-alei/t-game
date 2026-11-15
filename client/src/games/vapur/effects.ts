/** Martılar, baca buharı ve küçük el nesneleri. Konfeti ve notalar engine/particles.ts içinde. */
import * as THREE from 'three';
import { glowTexture } from './world/textures.ts';

// ---------------------------------------------------------------- Martılar
const gullBody = new THREE.CapsuleGeometry(0.12, 0.45, 4, 6).rotateX(Math.PI / 2);
const wingGeo = new THREE.BufferGeometry().setAttribute(
  'position',
  new THREE.Float32BufferAttribute([0, 0, -0.15, 0, 0, 0.2, 1.0, 0.05, 0.05], 3),
);
wingGeo.computeVertexNormals();
const gullMat = new THREE.MeshStandardMaterial({ color: '#f4f6fa', side: THREE.DoubleSide, emissive: '#30343c' });

class Gull {
  readonly group = new THREE.Group();
  private readonly wingL: THREE.Mesh;
  private readonly wingR: THREE.Mesh;
  angle = Math.random() * Math.PI * 2;
  radius = 9 + Math.random() * 10;
  height = 10 + Math.random() * 6;
  speed = 0.25 + Math.random() * 0.2;
  target: (() => THREE.Vector3) | null = null;
  targetUntil = 0;
  expires = Infinity;
  private flap = Math.random() * 10;

  constructor() {
    this.wingL = new THREE.Mesh(wingGeo, gullMat);
    this.wingR = new THREE.Mesh(wingGeo, gullMat);
    this.wingR.scale.x = -1;
    this.group.add(new THREE.Mesh(gullBody, gullMat), this.wingL, this.wingR);
    this.group.scale.setScalar(1.1);
  }

  update(dt: number, now: number): void {
    this.flap += dt * (this.target ? 14 : 7);
    const a = Math.sin(this.flap) * 0.6;
    this.wingL.rotation.z = a;
    this.wingR.rotation.z = -a;

    const desired = new THREE.Vector3();
    if (this.target && now < this.targetUntil) {
      // Hedefin başının üstünde dar daireler
      this.angle += dt * 2.2;
      desired.copy(this.target()).add(new THREE.Vector3(Math.cos(this.angle) * 2.2, 1.8 + Math.sin(this.angle * 2) * 0.4, Math.sin(this.angle) * 2.2));
    } else {
      this.target = null;
      this.angle += dt * this.speed;
      desired.set(Math.cos(this.angle) * this.radius, this.height + Math.sin(this.angle * 3) * 1.5, 4 + Math.sin(this.angle) * this.radius);
    }
    const before = this.group.position.clone();
    this.group.position.lerp(desired, 1 - Math.exp(-dt * (this.target ? 3 : 1.2)));
    const vel = this.group.position.clone().sub(before);
    if (vel.lengthSq() > 1e-6) this.group.lookAt(this.group.position.clone().add(vel));
  }
}

export class Gulls {
  readonly group = new THREE.Group();
  private gulls: Gull[] = [];

  constructor(scene: THREE.Scene, base = 10) {
    scene.add(this.group);
    for (let i = 0; i < base; i++) this.spawn();
  }

  private spawn(expires = Infinity): Gull {
    const g = new Gull();
    g.expires = expires;
    g.group.position.set((Math.random() - 0.5) * 60, 20, -40);
    this.group.add(g.group);
    this.gulls.push(g);
    return g;
  }

  /** Beğeniler gelince sürü kalabalıklaşır (en çok 30 ek martı) */
  excite(amount: number, now: number): void {
    const extra = this.gulls.filter((g) => g.expires !== Infinity).length;
    for (let i = 0; i < Math.min(amount, 30 - extra); i++) this.spawn(now + 12 + Math.random() * 6);
  }

  /** N martı hedefin etrafına toplanır */
  swarm(target: () => THREE.Vector3, count: number, now: number, seconds = 5): void {
    const free = this.gulls.filter((g) => !g.target).slice(0, count);
    while (free.length < count) free.push(this.spawn(now + seconds + 8));
    for (const g of free) {
      g.target = target;
      g.targetUntil = now + seconds;
    }
  }

  update(dt: number, now: number): void {
    this.gulls = this.gulls.filter((g) => {
      if (now < g.expires) return true;
      g.group.removeFromParent();
      return false;
    });
    for (const g of this.gulls) g.update(dt, now);
  }
}

// ---------------------------------------------------------------- Buhar
export class Steam {
  readonly group = new THREE.Group();
  private puffs: { sprite: THREE.Sprite; age: number; vel: THREE.Vector3 }[] = [];
  private readonly tex = glowTexture();

  constructor(parent: THREE.Object3D, private readonly origin: THREE.Vector3) {
    parent.add(this.group);
  }

  burst(count = 24): void {
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, color: '#f4f6f8', transparent: true, depthWrite: false }));
      sprite.position.copy(this.origin);
      sprite.scale.setScalar(1);
      this.group.add(sprite);
      this.puffs.push({
        sprite,
        age: -i * 0.03,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 5 + Math.random() * 3, 2 + Math.random() * 2),
      });
    }
  }

  update(dt: number): void {
    this.puffs = this.puffs.filter((p) => {
      p.age += dt;
      if (p.age < 0) return true;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - dt * 0.8);
      p.sprite.scale.setScalar(1 + p.age * 3);
      p.sprite.material.opacity = Math.max(0, 0.8 - p.age * 0.35);
      if (p.age < 2.3) return true;
      p.sprite.material.dispose();
      p.sprite.removeFromParent();
      return false;
    });
  }
}

// ---------------------------------------------------------------- El nesneleri
export function makeSimit(): THREE.Object3D {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 8, 16), new THREE.MeshStandardMaterial({ color: '#b5702c', roughness: 0.9 }));
  m.rotation.x = Math.PI / 2;
  return m;
}

export function makeTea(): THREE.Object3D {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.055, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: '#b3261e', emissive: '#5a0f0a', transparent: true, opacity: 0.9 }),
  );
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
  saucer.position.y = -0.11;
  g.add(glass, saucer);
  return g;
}

export function makeMic(): THREE.Object3D {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.3, 8), new THREE.MeshStandardMaterial({ color: '#222' }));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: '#c0c4cc', metalness: 0.8, roughness: 0.3 }));
  head.position.y = 0.18;
  g.add(handle, head);
  return g;
}
