/**
 * DEMO — yalnız altyapıyı doğrulamak için. Asıl oyun fikri seçilince
 * games/ altında yeni klasörde yazılacak; bu dosya örnek olarak kalır.
 *
 *  yorum  → izleyicinin adıyla bir blok yukarıdan düşer, yığına oturur
 *  beğeni → zemin parlar
 *  hediye → kademeye göre altın/dev blok, büyükte duyuru şeridi + sarsıntı
 */
import * as THREE from 'three';
import type { LiveEvent, Viewer } from '../../../../shared/events.ts';
import { tierOf, type GiftTier } from '../../../../shared/gifts.ts';
import type { Game, GameContext } from '../Game.ts';
import { colorFor, createNameTag } from '../../engine/nameTag.ts';

interface Block {
  mesh: THREE.Mesh;
  tag: THREE.Sprite;
  targetY: number;
  vy: number;
  life: number;
}

const COLS = 5;
const SIZE = 1.1;
const MAX_BLOCKS = 60;

export class DemoGame implements Game {
  private ctx!: GameContext;
  private root = new THREE.Group();
  private blocks: Block[] = [];
  private heights = new Array<number>(COLS).fill(0);
  private ground!: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private glow = 0;
  private shake = 0;
  private time = 0;
  private counter!: HTMLDivElement;
  private total = 0;

  start(ctx: GameContext): void {
    this.ctx = ctx;
    const { scene, camera } = ctx.stage;
    scene.background = new THREE.Color('#1b1440');
    scene.fog = new THREE.Fog('#1b1440', 18, 40);
    // Zemin güvenli alanın altına (~y 1180) gelsin; alt %35'i TikTok yorumları kapatır.
    camera.position.set(0.6, 5, 19);
    camera.lookAt(0.6, 1.8, 0);

    scene.add(new THREE.HemisphereLight('#bcd4ff', '#3a2050', 1.2));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2);
    sun.position.set(5, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    this.ground = new THREE.Mesh(
      new THREE.BoxGeometry(COLS * SIZE + 1.2, 0.5, 3),
      new THREE.MeshStandardMaterial({ color: '#3d2f80', emissive: '#ff2d6f', emissiveIntensity: 0 }),
    );
    this.ground.position.y = -0.25;
    this.ground.receiveShadow = true;
    scene.add(this.ground, this.root);

    this.counter = document.createElement('div');
    Object.assign(this.counter.style, {
      position: 'absolute', left: '0', right: '150px', top: '440px', textAlign: 'center',
      font: '800 64px Segoe UI, sans-serif', textShadow: '0 4px 12px #000',
    });
    ctx.hud.append(this.counter);
    this.renderCounter();
  }

  onEvent(e: LiveEvent): void {
    switch (e.type) {
      case 'comment':
        this.drop(e.viewer, 'comment');
        break;
      case 'like':
        this.glow = Math.min(1, this.glow + e.count * 0.05);
        break;
      case 'gift': {
        const tier = tierOf(e.value);
        this.drop(e.viewer, tier);
        if (tier === 'large') {
          this.shake = 0.6;
          this.ctx.banner.show(e.viewer, `${e.giftName} gönderdi!`, `×${e.count} · dev blok`);
        }
        break;
      }
      case 'follow':
        this.ctx.banner.show(e.viewer, 'takip etti', 'Hoş geldin!', 1800);
        break;
    }
  }

  private drop(viewer: Viewer, kind: 'comment' | GiftTier): void {
    const scale = kind === 'large' ? 2 : kind === 'medium' ? 1.4 : 1;
    const color =
      kind === 'comment' ? colorFor(viewer.id) : kind === 'small' ? '#ff6fa8' : '#ffd23f';
    const col = this.lowestColumn();
    const h = SIZE * scale;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(h * 0.95, h * 0.95, h * 0.95),
      new THREE.MeshStandardMaterial({
        color,
        metalness: kind === 'comment' ? 0.1 : 0.6,
        roughness: kind === 'comment' ? 0.6 : 0.25,
      }),
    );
    mesh.castShadow = true;
    mesh.position.set((col - (COLS - 1) / 2) * SIZE, 14, 0);
    const tag = createNameTag(viewer, { accent: kind === 'comment' ? undefined : color });
    this.root.add(mesh, tag);

    const targetY = this.heights[col] + h / 2;
    this.heights[col] += h;
    this.blocks.push({ mesh, tag, targetY, vy: 0, life: 0 });
    this.total++;
    this.renderCounter();

    if (this.blocks.length > MAX_BLOCKS || Math.max(...this.heights) > 9) this.reset();
  }

  private lowestColumn(): number {
    let best = 0;
    for (let i = 1; i < COLS; i++) if (this.heights[i] < this.heights[best]) best = i;
    return best;
  }

  update(dt: number): void {
    this.time += dt;
    for (const b of this.blocks) {
      b.life += dt;
      if (b.mesh.position.y > b.targetY) {
        b.vy -= 40 * dt;
        b.mesh.position.y = Math.max(b.targetY, b.mesh.position.y + b.vy * dt);
        if (b.mesh.position.y === b.targetY) b.vy = 0;
      }
      b.tag.position.copy(b.mesh.position).add(new THREE.Vector3(0, 0.75, 0.8));
      // Etiket 4 sn görünür, sonra solar (kalabalıkta ekran temiz kalsın)
      (b.tag.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(5 - b.life, 0, 1);
    }

    this.glow = Math.max(0, this.glow - dt * 0.8);
    this.ground.material.emissiveIntensity = this.glow * 1.5;

    const cam = this.ctx.stage.camera;
    this.shake = Math.max(0, this.shake - dt);
    cam.position.x = Math.sin(this.time * 60) * this.shake * 0.3;
  }

  reset(): void {
    for (const b of this.blocks) {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
      (b.tag.material as THREE.SpriteMaterial).map?.dispose();
      b.tag.material.dispose();
    }
    this.root.clear();
    this.blocks = [];
    this.heights.fill(0);
  }

  dispose(): void {
    this.reset();
    this.counter.remove();
  }

  private renderCounter(): void {
    this.counter.textContent = `${this.total} blok`;
  }
}
