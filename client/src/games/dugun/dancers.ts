/**
 * Düğün figürleri ve halay halkası.
 *  - Dancer: tek figür (misafir, gelin, damat, kaynana, davulcu, zurnacı). Halay adımı, düşme,
 *    havaya fırlama, yürüme, el sallama, mendil, takılan çeyrekler, isim etiketi, konuşma balonu.
 *  - Ring: halaydakilerin sırası (0 = halaybaşı) ve halkadaki yerleri.
 */
import * as THREE from 'three';
import type { Viewer } from '../../../../shared/events.ts';
import { colorFor, createNameTag } from '../../engine/nameTag.ts';
import { createTextSprite, disposeSprite } from '../../engine/textSprite.ts';
import { RING, TIMING } from './config.ts';
import { CharacterModel, type Pose } from './model.ts';

/** ?model=all: herkes 3B gelin modeliyle (performans denemesi) */
const MODEL_ALL = new URLSearchParams(location.search).get('model') === 'all';

export type Outfit = 'guest' | 'gelin' | 'damat' | 'kaynana' | 'davulcu' | 'zurnaci';

const SKIN = ['#f1c7a5', '#e0ac85', '#c98e66', '#a8714f', '#f5d6bd'];
const HAIR = ['#2b1d14', '#4a2f1e', '#7a5634', '#1a1a1a', '#b88a4a'];
const NPC_SHIRTS = ['#5a6b8c', '#7a5a8a', '#4f7a6a', '#8a5a4a', '#8c7a4a', '#4a6a8a'];

function pick<T>(list: readonly T[], id: string, salt = 0): T {
  let h = salt;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

const smooth = (k: number) => k * k * (3 - 2 * k);

/** Halayın o anki ritmi: tüm figürler aynı vuruşa basar */
export interface Beat {
  /** Toplam vuruş sayısı (kesirli) */
  count: number;
  /** 0 = müzik yok (kaynana kesti, halay koptu) */
  playing: boolean;
  /** 0..1 arası coşku (tempo arttıkça omuz titremesi artar) */
  heat: number;
}

type Motion =
  | { kind: 'idle' }
  | { kind: 'walk'; from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number }
  | { kind: 'fallen'; t: number; at: number; until: number; dir: number }
  | { kind: 'thrown'; vel: THREE.Vector3; spin: number; t: number };

export class Dancer {
  readonly group = new THREE.Group();
  /** Gövde ekseni: düşme ve fırlama dönüşleri buna uygulanır (ayaklardan döner) */
  private readonly body = new THREE.Group();
  private readonly torsoMat: THREE.MeshStandardMaterial;
  private readonly baseColor: string;
  private readonly legL: THREE.Object3D;
  private readonly legR: THREE.Object3D;
  private readonly armL: THREE.Object3D;
  private readonly armR: THREE.Object3D;
  private readonly hand = new THREE.Object3D();
  private readonly outfitGroup = new THREE.Group();
  private readonly coins = new THREE.Group();
  private mendil: THREE.Mesh | null = null;
  private tag: THREE.Sprite | null = null;
  private bubble: THREE.Sprite | null = null;
  private bubbleUntil = 0;
  private motion: Motion = { kind: 'idle' };
  /** 3B model (varsa basit gövde gizlenir) */
  private model: CharacterModel | null = null;
  private waveUntil = 0;
  private hopUntil = 0;
  outfit: Outfit = 'guest';
  /** Halkadaki hedef nokta (halay); null ise yerinde durur */
  ringTarget: THREE.Vector3 | null = null;
  facing = 0;
  tagUntil = 0;
  lastActive = 0;
  /** Etiketi her zaman göster (gelin, damat, halaybaşı) */
  pinnedTag = false;
  readonly phase = Math.random() * 10;
  readonly color: string;

  constructor(readonly viewer: Viewer | null, outfit: Outfit = 'guest') {
    const id = viewer?.id ?? `npc-${Math.random()}`;
    this.color = viewer ? colorFor(viewer.id) : pick(NPC_SHIRTS, id);
    this.baseColor = this.color;
    this.torsoMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: pick(SKIN, id), roughness: 0.8 });
    const hair = new THREE.MeshStandardMaterial({ color: pick(HAIR, id, 7), roughness: 0.9 });
    const pants = new THREE.MeshStandardMaterial({ color: '#2a2f3a' });

    const leg = (x: number) => {
      const pivot = new THREE.Object3D();
      pivot.position.set(x, 0.8, 0);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 4, 6), pants);
      m.position.y = -0.4;
      m.castShadow = true;
      pivot.add(m);
      return pivot;
    };
    this.legL = leg(-0.12);
    this.legR = leg(0.12);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10), this.torsoMat);
    torso.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin);
    head.position.y = 1.78;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.295, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    cap.position.set(0, 1.82, -0.03);
    cap.rotation.x = -0.45;
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a1410' });
    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
      eye.position.set(ex, 1.8, 0.255);
      this.body.add(eye);
    }
    const arm = (x: number) => {
      const pivot = new THREE.Object3D();
      pivot.position.set(x, 1.42, 0);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 4, 6), this.torsoMat);
      a.position.y = -0.3;
      a.castShadow = true;
      pivot.add(a);
      return pivot;
    };
    this.armR = arm(0.33);
    this.armL = arm(-0.33);
    this.hand.position.set(0, -0.62, 0.05);
    this.armR.add(this.hand);
    for (const m of [torso, head, cap]) m.castShadow = true;

    // Takılan çeyrekler göğüste kırmızı kurdelenin üstünde durur
    this.coins.position.set(0, 1.3, 0.27);
    this.body.add(this.legL, this.legR, torso, head, cap, this.armR, this.armL, this.outfitGroup, this.coins);
    this.group.add(this.body);

    if (viewer) {
      this.tag = createNameTag(viewer);
      this.tag.scale.set(2.2, 0.55, 1);
      this.tag.position.y = 2.55;
      this.group.add(this.tag);
    }
    this.dress(outfit);
  }

  get isNpc(): boolean {
    return this.viewer === null;
  }

  get name(): string {
    return this.viewer?.name ?? '';
  }

  get busy(): boolean {
    return this.motion.kind !== 'idle';
  }

  get isFallen(): boolean {
    return this.motion.kind === 'fallen';
  }

  headWorld(target = new THREE.Vector3()): THREE.Vector3 {
    return this.body.localToWorld(target.set(0, 1.75, 0));
  }

  /** Kıyafet: gelinlik + duvak, damatlık + papyon, kaynana yazmalı, çalgıcılar */
  dress(outfit: Outfit): void {
    this.outfit = outfit;
    for (const c of [...this.outfitGroup.children]) {
      c.removeFromParent();
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
    const add = (geo: THREE.BufferGeometry, color: string, pos: [number, number, number], opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts }));
      m.position.set(...pos);
      m.castShadow = true;
      this.outfitGroup.add(m);
      return m;
    };
    this.coins.visible = outfit === 'gelin' || outfit === 'damat';
    this.syncModel();
    switch (outfit) {
      case 'guest':
        this.torsoMat.color.set(this.baseColor);
        break;
      case 'gelin': {
        this.torsoMat.color.set('#fbfaf7');
        add(new THREE.ConeGeometry(0.75, 1.15, 20, 1, true), '#fbfaf7', [0, 0.55, 0], { side: THREE.DoubleSide });
        // Duvak: başın arkasından sarkan yarı saydam tül + taç
        add(new THREE.ConeGeometry(0.42, 1.3, 16, 1, true), '#ffffff', [0, 1.45, -0.12], { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        add(new THREE.TorusGeometry(0.2, 0.035, 6, 16).rotateX(Math.PI / 2), '#f3cf55', [0, 2.02, 0], { metalness: 0.7, roughness: 0.3 });
        add(new THREE.BoxGeometry(0.5, 0.07, 0.04), '#c8202a', [0, 1.32, 0.25]); // kırmızı kuşak
        break;
      }
      case 'damat': {
        this.torsoMat.color.set('#1e2230');
        add(new THREE.BoxGeometry(0.18, 0.4, 0.04), '#fbfaf7', [0, 1.3, 0.26]); // gömlek
        add(new THREE.BoxGeometry(0.2, 0.08, 0.05), '#b3141b', [0, 1.5, 0.28]); // papyon
        add(new THREE.SphereGeometry(0.06, 8, 6), '#ffffff', [-0.18, 1.42, 0.25]); // yaka çiçeği
        break;
      }
      case 'kaynana': {
        this.torsoMat.color.set('#6a2c6e');
        add(new THREE.ConeGeometry(0.6, 1.0, 16, 1, true), '#7d3a6e', [0, 0.5, 0], { side: THREE.DoubleSide });
        add(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), '#e2c34a', [0, 1.8, -0.02]); // yazma
        add(new THREE.BoxGeometry(0.3, 0.22, 0.12), '#3a2a1a', [0.38, 0.95, 0.1]); // çanta
        break;
      }
      case 'davulcu': {
        this.torsoMat.color.set('#2f4f7a');
        const drum = add(new THREE.CylinderGeometry(0.42, 0.42, 0.42, 20).rotateZ(Math.PI / 2), '#c9a36a', [0, 1.05, 0.45]);
        drum.name = 'davul';
        break;
      }
      case 'zurnaci': {
        this.torsoMat.color.set('#7a2f2f');
        const z = add(new THREE.ConeGeometry(0.09, 0.7, 10), '#8a5a2e', [0, 1.55, 0.55]);
        z.rotation.x = Math.PI / 2 + 0.5;
        break;
      }
    }
  }

  /** Kıyafete göre 3B modeli takar ya da çıkarır. Şimdilik yalnız gelinin modeli var. */
  private syncModel(): void {
    const wanted = this.outfit === 'gelin' || MODEL_ALL;
    if (!wanted && this.model) {
      this.model.dispose();
      this.model = null;
      this.showPrimitives(true);
    } else if (wanted && !this.model) {
      const model = new CharacterModel('gelin', 1.25, () => {
        if (this.model === model) this.showPrimitives(false);
      });
      this.model = model;
      this.body.add(model.root);
    }
  }

  /** Basit gövde parçaları (kapsül figür, kıyafet) */
  private showPrimitives(on: boolean): void {
    for (const c of this.body.children) {
      if (c === this.model?.root || c === this.coins) continue;
      c.visible = on;
    }
  }

  /** Halaybaşı mendili */
  setMendil(on: boolean): void {
    if (on && !this.mendil) {
      this.mendil = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#e01b2a', side: THREE.DoubleSide }));
      this.mendil.position.set(0.2, -0.05, 0);
      this.hand.add(this.mendil);
    } else if (!on && this.mendil) {
      this.mendil.geometry.dispose();
      (this.mendil.material as THREE.Material).dispose();
      this.mendil.removeFromParent();
      this.mendil = null;
    }
  }

  get hasMendil(): boolean {
    return this.mendil !== null;
  }

  /** Göğse bir çeyrek altın iliştirir (en fazla 24 görünür) */
  pinCoin(): void {
    const n = this.coins.children.length;
    if (n >= 24) return;
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#f3cf55', metalness: 0.8, roughness: 0.25, emissive: '#5a4300' }),
    );
    const row = Math.floor(n / 6);
    coin.position.set(((n % 6) - 2.5) * 0.09, -row * 0.1, 0.02);
    this.coins.add(coin);
  }

  clearCoins(): void {
    for (const c of [...this.coins.children]) c.removeFromParent();
  }

  touch(now: number, showTagFor: number = TIMING.tagSeconds): void {
    this.lastActive = now;
    this.tagUntil = Math.max(this.tagUntil, now + showTagFor);
  }

  say(text: string, now: number, opts: { color?: string; background?: string } = {}): void {
    if (this.bubble) disposeSprite(this.bubble);
    const short = [...text].length > 34 ? [...text].slice(0, 32).join('') + '…' : text;
    this.bubble = createTextSprite(short, {
      color: opts.color ?? '#1a1a1a',
      background: opts.background ?? 'rgba(235,235,240,0.95)',
      font: '600 44px Segoe UI, sans-serif',
      height: 0.6,
      padding: 18,
      tail: true,
    });
    this.bubble.material.toneMapped = false;
    this.bubble.position.y = 3.25;
    this.group.add(this.bubble);
    this.bubbleUntil = now + TIMING.bubbleSeconds;
  }

  get bubbleAt(): number {
    return this.bubble ? this.bubbleUntil : 0;
  }

  hideBubble(): void {
    if (this.bubble) disposeSprite(this.bubble);
    this.bubble = null;
  }

  wave(now: number, seconds = 2.5): void {
    this.waveUntil = now + seconds;
  }

  /** "Hooop!" zıplaması */
  hop(now: number): void {
    this.hopUntil = now + 0.6;
  }

  walkTo(to: THREE.Vector3, seconds = 1.6): void {
    if (this.motion.kind === 'thrown') return;
    this.motion = { kind: 'walk', from: this.group.position.clone(), to: to.clone(), t: 0, dur: seconds };
  }

  /** `delay` sn sonra yere yığılır; düştükten `seconds` sn sonra kalkar */
  fall(now: number, seconds: number, delay = 0): void {
    if (this.motion.kind === 'thrown') return;
    this.motion = { kind: 'fallen', t: 0, at: now + delay, until: now + delay + seconds, dir: Math.random() < 0.5 ? -1 : 1 };
  }

  /** Havaya fırlatılır; yere inince `landed` true olur */
  throwUp(height = 9): void {
    this.motion = { kind: 'thrown', vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.sqrt(2 * 18 * height), (Math.random() - 0.5) * 1.5), spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 4), t: 0 };
  }

  get airborne(): boolean {
    return this.motion.kind === 'thrown';
  }

  update(dt: number, now: number, beat: Beat, focus: Dancer | null): void {
    const t = now + this.phase;
    const pos = this.group.position;
    const m = this.motion;

    // ---- yer değiştirme
    if (m.kind === 'walk') {
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      pos.lerpVectors(m.from, m.to, smooth(k));
      pos.y = Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
      const d = m.to.clone().sub(m.from);
      if (d.lengthSq() > 0.01) this.facing = Math.atan2(d.x, d.z);
      if (k >= 1) this.motion = { kind: 'idle' };
    } else if (m.kind === 'thrown') {
      m.t += dt;
      m.vel.y -= 18 * dt;
      pos.addScaledVector(m.vel, dt);
      this.body.rotation.x += m.spin * dt;
      if (pos.y <= 0 && m.vel.y < 0) {
        pos.y = 0;
        this.body.rotation.x = 0;
        this.motion = { kind: 'idle' };
      }
    } else if (m.kind === 'idle' && this.ringTarget) {
      // Halkadaki yerini takip eder (halka yavaşça döner)
      pos.x += (this.ringTarget.x - pos.x) * Math.min(1, dt * 3);
      pos.z += (this.ringTarget.z - pos.z) * Math.min(1, dt * 3);
    }

    // ---- düşme / kalkma
    if (m.kind === 'fallen') {
      m.t += dt;
      // Domino: sırası gelene kadar ayakta bekler
      const down = now >= m.at && now < m.until;
      const target = down ? (Math.PI / 2) * m.dir : 0;
      this.body.rotation.z += (target - this.body.rotation.z) * Math.min(1, dt * (down ? 9 : 4));
      if (now >= m.until && Math.abs(this.body.rotation.z) < 0.03) {
        this.body.rotation.z = 0;
        this.motion = { kind: 'idle' };
      }
    } else if (m.kind !== 'thrown') {
      this.body.rotation.z *= 0.85;
    }

    this.group.rotation.y += angleDelta(this.group.rotation.y, this.facing) * Math.min(1, dt * 5);

    // ---- kol ve bacaklar
    const dancing = beat.playing && m.kind === 'idle' && this.outfit !== 'kaynana';
    const b = beat.count + (this.outfit === 'guest' ? 0 : this.phase * 0.1);
    const step = b % 4; // 4 vuruşluk halay figürü: sağ, sol, sağ, tekme
    if (m.kind === 'walk') {
      const s = Math.sin(m.t * 12);
      this.legL.rotation.x = s * 0.5;
      this.legR.rotation.x = -s * 0.5;
    } else if (dancing && (this.outfit === 'guest' || this.outfit === 'gelin' || this.outfit === 'damat')) {
      const lift = Math.max(0, Math.sin((b % 1) * Math.PI));
      this.legL.rotation.x = step < 1 || (step >= 2 && step < 3) ? 0 : -lift * 0.35;
      this.legR.rotation.x = step >= 3 ? -lift * 1.1 : step < 1 ? -lift * 0.35 : 0;
      this.body.position.y = lift * 0.1 * (1 + beat.heat);
    } else {
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
      this.body.position.y *= 0.8;
    }
    if (now < this.hopUntil) {
      const k = 1 - (this.hopUntil - now) / 0.6;
      this.body.position.y = Math.sin(k * Math.PI) * 0.7;
    }

    if (m.kind === 'thrown' || m.kind === 'fallen') {
      // Fırlarken/düşerken kollar açık, çırpınır
      this.armR.rotation.set(0, 0, 2.4 + Math.sin(t * 20) * 0.4);
      this.armL.rotation.set(0, 0, -2.4 - Math.sin(t * 20) * 0.4);
    } else if (now < this.waveUntil) {
      this.armR.rotation.set(0, 0, 2.6 + Math.sin(t * 12) * 0.35);
      this.armL.rotation.set(0, 0, -0.15);
    } else if (this.outfit === 'davulcu') {
      const hit = beat.playing ? Math.pow(Math.max(0, Math.cos((beat.count % 1) * Math.PI * 2)), 4) : 0;
      this.armR.rotation.set(-0.6 - hit * 0.9, 0, 0.5);
      this.armL.rotation.set(-0.8, 0, -0.4);
      const drum = this.outfitGroup.getObjectByName('davul');
      if (drum) drum.scale.setScalar(1 + hit * 0.06);
    } else if (this.outfit === 'zurnaci') {
      this.armR.rotation.set(-1.3, 0, 0.3);
      this.armL.rotation.set(-1.3, 0, -0.3);
      this.body.rotation.x = beat.playing ? Math.sin(t * 3) * 0.08 : 0;
    } else if (this.outfit === 'kaynana') {
      // Eller belde, ya da parmak sallar
      this.armR.rotation.set(0, 0, this.bubble ? 2.3 + Math.sin(t * 14) * 0.25 : 0.7);
      this.armL.rotation.set(0, 0, -0.7);
    } else if (dancing) {
      // Halay: kollar yana açık, komşunun serçe parmağını tutar; omuzlar vuruşta titrer
      const shimmy = Math.sin(t * 28) * 0.12 * beat.heat;
      const pulse = Math.sin((b % 1) * Math.PI) * 0.12;
      this.armR.rotation.set(0, 0, 1.15 + pulse + shimmy);
      this.armL.rotation.set(0, 0, -1.15 - pulse + shimmy);
      if (this.mendil) {
        // Halaybaşı mendili havada çevirir
        this.armR.rotation.set(0, 0, 2.7 + Math.sin(t * 9) * 0.3);
        this.mendil.rotation.y = t * 9;
      }
    } else {
      this.armR.rotation.set(0, 0, 0.12 + Math.sin(t * 1.3) * 0.03);
      this.armL.rotation.set(0, 0, -0.12 - Math.sin(t * 1.1) * 0.03);
    }

    // ---- 3B model: animasyon klibi seçimi
    if (this.model?.ready) {
      let pose: Pose = 'idle';
      const fallen = m.kind === 'fallen' && now >= m.at && now < m.until;
      if (m.kind === 'thrown' || fallen) pose = 'fall';
      else if (m.kind === 'walk') pose = 'walk';
      else if (now < this.waveUntil) pose = 'wave';
      else if (now < this.hopUntil) pose = 'cheer';
      else if (dancing) pose = 'halay';
      this.model.play(pose);
      if (pose === 'halay') this.model.syncHalay(beat.count);
      // Düşmeyi ve sekmeyi klip yapar; basit gövdenin dönüş ve sekmesi modele binmesin
      if (m.kind !== 'thrown') this.body.rotation.z = 0;
      if (now >= this.hopUntil) this.body.position.y = 0;
      this.model.update(dt);
    }

    // ---- etiket ve balon
    if (this.tag) {
      const visible = focus ? focus === this : this.pinnedTag || now < this.tagUntil;
      const mat = this.tag.material;
      mat.opacity += ((visible ? 1 : 0) - mat.opacity) * Math.min(1, dt * 5);
      this.tag.visible = mat.opacity > 0.02;
    }
    if (this.bubble && now > this.bubbleUntil) {
      disposeSprite(this.bubble);
      this.bubble = null;
    }
  }

  dispose(): void {
    this.model?.dispose();
    this.model = null;
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    if (this.tag) disposeSprite(this.tag);
    if (this.bubble) disposeSprite(this.bubble);
    this.group.removeFromParent();
  }
}

function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Halay halkası. Sıra: 0 = halaybaşı (mendil onda). Halka açık bir çemberdir;
 * baş ile son arasında boşluk kalır ve bütün zincir yavaşça sağa doğru döner.
 */
export class Ring {
  readonly order: Dancer[] = [];
  /** Zincirin çember üstündeki dönüşü (radyan) */
  private offset = 0;
  radius: number = RING.minRadius;

  add(d: Dancer): void {
    this.order.push(d);
  }

  remove(d: Dancer): void {
    const i = this.order.indexOf(d);
    if (i >= 0) this.order.splice(i, 1);
    d.ringTarget = null;
  }

  has(d: Dancer): boolean {
    return this.order.includes(d);
  }

  /** Zincirin başına geçirir (yeni halaybaşı) */
  toHead(d: Dancer): void {
    this.remove(d);
    this.order.unshift(d);
  }

  get head(): Dancer | null {
    return this.order[0] ?? null;
  }

  /** Halkanın yeni elemanının gireceği nokta (zincirin sonu) */
  tailPoint(): THREE.Vector3 {
    return this.pointAt(this.order.length);
  }

  private pointAt(i: number): THREE.Vector3 {
    const a = this.offset - (i * RING.spacing) / this.radius;
    return new THREE.Vector3(Math.sin(a) * this.radius, 0, Math.cos(a) * this.radius);
  }

  update(dt: number, beat: Beat, beatsPerSecond: number): void {
    const n = Math.max(this.order.length, 1);
    // Zincir çemberin %85'ini kaplar
    const wanted = Math.max(RING.minRadius, (n * RING.spacing) / (Math.PI * 2 * 0.85));
    this.radius += (wanted - this.radius) * Math.min(1, dt * 0.8);
    // Halay müzik çaldıkça sağa doğru ilerler; tekme vuruşunda durur
    if (beat.playing) this.offset += dt * beatsPerSecond * 0.09;
    this.order.forEach((d, i) => {
      const p = this.pointAt(i);
      d.ringTarget = p;
      // Yüzü hem halkanın ortasına hem kameraya dönük (kamera önde, +z)
      const inward = new THREE.Vector3(-p.x, 0, -p.z).normalize().multiplyScalar(0.35).add(new THREE.Vector3(0, 0, 0.65));
      d.facing = Math.atan2(inward.x, inward.z);
    });
  }
}
