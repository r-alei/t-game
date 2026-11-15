/**
 * Düğün figürleri ve halay halkası.
 *  - Dancer: tek figür (misafir, gelin, damat, kaynana, davulcu, zurnacı). Halay adımı, düşme,
 *    havaya fırlama, yürüme, el sallama, mendil, takılan çeyrekler, isim etiketi, konuşma balonu.
 *  - Arm: omuz + dirsek + el; ya açılarla (FK) ya da elin gideceği noktaya göre (2 kemikli IK) kurulur.
 *    Halayda komşular her kare birbirinin eline uzanır, eller aynı noktada buluşur.
 *  - Ring: halaydakilerin sırası (0 = halaybaşı) ve halkadaki yerleri.
 */
import * as THREE from 'three';
import type { Viewer } from '../../../../shared/events.ts';
import { colorFor, createNameTag } from '../../engine/nameTag.ts';
import { disposeSprite } from '../../engine/textSprite.ts';
import { BODY, RING, TIMING } from './config.ts';

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
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

// ---- Ortak geometri ve malzemeler: her figür aynılarını kullanır, dispose'da atlanır
const { shoulderX: SX, shoulderY: SY, upperArm: UA, foreArm: FA, footLift } = BODY;
const REACH = UA + FA;
const LEG_LEN = 0.8;
const shared = new Set<THREE.BufferGeometry | THREE.Material>();
function keep<T extends THREE.BufferGeometry | THREE.Material>(x: T): T {
  shared.add(x);
  return x;
}
const GEO = {
  leg: keep(new THREE.CapsuleGeometry(0.11, 0.55, 4, 6)),
  torso: keep(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10)),
  head: keep(new THREE.SphereGeometry(0.28, 16, 12)),
  cap: keep(new THREE.SphereGeometry(0.295, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
  eye: keep(new THREE.SphereGeometry(0.035, 8, 6)),
  upper: keep(new THREE.CapsuleGeometry(0.08, UA - 0.04, 4, 6)),
  fore: keep(new THREE.CapsuleGeometry(0.07, FA - 0.04, 4, 6)),
  hand: keep(new THREE.SphereGeometry(0.085, 10, 8)),
  coin: keep(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2)),
  mendil: keep(new THREE.PlaneGeometry(0.5, 0.5)),
};
const MAT = {
  pants: keep(new THREE.MeshStandardMaterial({ color: '#2a2f3a' })),
  eye: keep(new THREE.MeshBasicMaterial({ color: '#1a1410' })),
  coin: keep(new THREE.MeshStandardMaterial({ color: '#f3cf55', metalness: 0.8, roughness: 0.25, emissive: '#5a4300' })),
  mendil: keep(new THREE.MeshStandardMaterial({ color: '#e01b2a', side: THREE.DoubleSide })),
};
const tinted = new Map<string, THREE.MeshStandardMaterial>();
function tint(color: string, roughness: number): THREE.MeshStandardMaterial {
  const key = `${color}/${roughness}`;
  let m = tinted.get(key);
  if (!m) tinted.set(key, (m = keep(new THREE.MeshStandardMaterial({ color, roughness }))));
  return m;
}

// ---- Kare başına ayırma yapmamak için geçici nesneler
const DOWN = new THREE.Vector3(0, -1, 0);
const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Vector3();
const _f = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _tmpQ = new THREE.Quaternion();

/** Omuz → dirsek → el. Yan: +1 = figürün +x tarafı, -1 = -x tarafı */
class Arm {
  readonly shoulder = new THREE.Object3D();
  readonly elbow = new THREE.Object3D();
  readonly hand = new THREE.Object3D();
  private readonly prevS = new THREE.Quaternion();
  private readonly prevE = new THREE.Quaternion();
  private mode = -1;
  private ease = 1;

  constructor(readonly side: 1 | -1, sleeve: THREE.Material, skin: THREE.Material) {
    this.shoulder.position.set(side * SX, SY, 0);
    const upper = new THREE.Mesh(GEO.upper, sleeve);
    upper.position.y = -UA / 2;
    this.elbow.position.y = -UA;
    const fore = new THREE.Mesh(GEO.fore, sleeve);
    fore.position.y = -FA / 2;
    this.hand.position.y = -FA;
    const mitt = new THREE.Mesh(GEO.hand, skin);
    for (const m of [upper, fore, mitt]) m.castShadow = true;
    this.hand.add(mitt);
    this.elbow.add(fore, this.hand);
    this.shoulder.add(upper, this.elbow);
  }

  /** Bu karenin pozundan önce çağrılır (geçişte yumuşatmak için) */
  begin(): void {
    this.prevS.copy(this.shoulder.quaternion);
    this.prevE.copy(this.elbow.quaternion);
  }

  /** Poz kipi değişince ~0.3 sn boyunca eski pozdan yeniye kayar; kollar zıplamaz */
  end(mode: number, dt: number): void {
    if (mode !== this.mode) {
      this.mode = mode;
      this.ease = 0;
    }
    if (this.ease >= 1) return;
    // El tutmaya geçiş daha kısa: komşu da aynı anda geçiyor, eller arada ayrık görünmesin
    const fast = mode === M_HOLD;
    this.ease += dt * (fast ? 7 : 3.5);
    const k = this.ease >= 1 ? 1 : 1 - Math.exp(-dt * (fast ? 30 : 16));
    _tmpQ.copy(this.shoulder.quaternion);
    this.shoulder.quaternion.copy(this.prevS).slerp(_tmpQ, k);
    _tmpQ.copy(this.elbow.quaternion);
    this.elbow.quaternion.copy(this.prevE).slerp(_tmpQ, k);
  }

  /** x: öne/arkaya (eksi = öne), out: yana açılma, bend: dirsek bükümü (öne) */
  fk(x: number, out: number, bend: number): void {
    this.shoulder.rotation.set(x, 0, this.side * out);
    this.elbow.rotation.set(-bend, 0, 0);
  }

  /** Eli gövde koordinatındaki `target` noktasına götürür; dirsek `pole` yönüne bakar */
  ik(target: THREE.Vector3, pole: THREE.Vector3): void {
    _d.subVectors(target, this.shoulder.position);
    let len = _d.length();
    if (len < 1e-4) _d.set(0, -1, 0);
    else _d.divideScalar(len);
    len = clamp(len, 0.08, REACH - 0.002);
    const cosA = clamp((UA * UA + len * len - FA * FA) / (2 * UA * len), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);
    _p.copy(pole).addScaledVector(_d, -pole.dot(_d));
    if (_p.lengthSq() < 1e-6) _p.set(0, 0, -1).addScaledVector(_d, -_d.z);
    _p.normalize();
    _e.copy(_d).multiplyScalar(UA * cosA).addScaledVector(_p, UA * sinA); // dirsek (omuza göre)
    _f.copy(_d).multiplyScalar(len).sub(_e).normalize(); // ön kol yönü
    _e.normalize();
    this.shoulder.quaternion.setFromUnitVectors(DOWN, _e);
    _q.copy(this.shoulder.quaternion).invert();
    this.elbow.quaternion.setFromUnitVectors(DOWN, _f.applyQuaternion(_q));
  }
}

// Kol kipleri (geçiş yumuşatması için)
const M_IDLE = 0, M_HOLD = 1, M_FLAIL = 2, M_WAVE = 3, M_WALK = 4, M_RAISE = 5, M_SWING = 6, M_MENDIL = 7, M_PLAY = 8, M_HIP = 9, M_WAG = 10;

/** Halayda tutulan elin yüksekliği ve ileriliği (omuza göre) */
const HOLD = { dropDancing: 0.22, dropResting: 0.62, forwardDancing: 0.17, forwardResting: 0.06 } as const;

/** Halayda kendi elini tutan komşunun omzu bu mesafeden uzaksa el bırakılır */
const MAX_HOLD_GAP = 2 * REACH * 0.97;

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
  /** [0] = -x tarafı, [1] = +x tarafı */
  private readonly arms: readonly [Arm, Arm];
  private readonly outfitGroup = new THREE.Group();
  /** Kıyafetle gelen ama ele bağlı parçalar (kaynananın çantası) */
  private readonly dressParts: THREE.Mesh[] = [];
  private readonly coins = new THREE.Group();
  private mendil: THREE.Mesh | null = null;
  private tag: THREE.Sprite | null = null;
  private bubble: THREE.Sprite | null = null;
  private bubbleUntil = 0;
  private motion: Motion = { kind: 'idle' };
  private waveUntil = 0;
  private hopUntil = 0;
  /** 0..1: müzik çaldıkça eller omuz hizasına kalkar, susunca iner (komşuyla ortalaması alınır) */
  private raise = 0;
  outfit: Outfit = 'guest';
  /** Halkadaki hedef nokta (halay); null ise yerinde durur */
  ringTarget: THREE.Vector3 | null = null;
  /**
   * El tutulan komşular: [önceki, sonraki]. Halka her kare doldurur; gelin ve damat birbirini yazar.
   * El ancak iki taraf da birbirini listeliyorsa tutulur.
   */
  readonly links: [Dancer | null, Dancer | null] = [null, null];
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
    const skin = tint(pick(SKIN, id), 0.8);
    const hair = tint(pick(HAIR, id, 7), 0.9);

    const leg = (x: number) => {
      const pivot = new THREE.Object3D();
      pivot.position.set(x, LEG_LEN, 0);
      const m = new THREE.Mesh(GEO.leg, MAT.pants);
      // Bacak ucu zemin döşemesinin hemen üstünde: ayak gömülmez, havada da kalmaz
      m.position.y = -LEG_LEN + 0.385 + footLift;
      m.castShadow = true;
      pivot.add(m);
      return pivot;
    };
    this.legL = leg(-0.12);
    this.legR = leg(0.12);
    const torso = new THREE.Mesh(GEO.torso, this.torsoMat);
    torso.position.y = 1.15;
    const head = new THREE.Mesh(GEO.head, skin);
    head.position.y = 1.78;
    const cap = new THREE.Mesh(GEO.cap, hair);
    cap.position.set(0, 1.82, -0.03);
    cap.rotation.x = -0.45;
    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(GEO.eye, MAT.eye);
      eye.position.set(ex, 1.8, 0.252);
      this.body.add(eye);
    }
    this.arms = [new Arm(-1, this.torsoMat, skin), new Arm(1, this.torsoMat, skin)];
    for (const m of [torso, head, cap]) m.castShadow = true;

    // Takılan çeyrekler göğüste, gövdenin eğrisine yapışık durur
    this.coins.position.set(0, 1.34, 0);
    this.body.add(this.legL, this.legR, torso, head, cap, this.arms[0].shoulder, this.arms[1].shoulder, this.outfitGroup, this.coins);
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
    for (const c of [...this.outfitGroup.children, ...this.dressParts]) {
      c.removeFromParent();
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
    this.dressParts.length = 0;
    const add = (geo: THREE.BufferGeometry, color: string, pos: [number, number, number], opts: Partial<THREE.MeshStandardMaterialParameters> = {}, parent: THREE.Object3D = this.outfitGroup) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts }));
      m.position.set(...pos);
      m.castShadow = true;
      parent.add(m);
      if (parent !== this.outfitGroup) this.dressParts.push(m);
      return m;
    };
    this.coins.visible = outfit === 'gelin' || outfit === 'damat';
    // Etekli kıyafette bacaklar gizli: halay tekmesinde etekten dışarı çıkmasın
    this.legL.visible = this.legR.visible = outfit !== 'gelin' && outfit !== 'kaynana';
    switch (outfit) {
      case 'guest':
        this.torsoMat.color.set(this.baseColor);
        break;
      case 'gelin': {
        this.torsoMat.color.set('#fbfaf7');
        // Etek ucu zemin döşemesinin hemen altında: arada boşluk görünmez
        add(new THREE.ConeGeometry(0.75, 1.15, 20, 1, true), '#fbfaf7', [0, 0.6, 0], { side: THREE.DoubleSide });
        // Duvak: başın arkasından sarkan yarı saydam tül + başa oturan taç
        add(new THREE.ConeGeometry(0.42, 1.3, 16, 1, true), '#ffffff', [0, 1.45, -0.12], { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
        add(new THREE.TorusGeometry(0.19, 0.035, 6, 16).rotateX(Math.PI / 2), '#f3cf55', [0, 1.99, 0], { metalness: 0.7, roughness: 0.3 });
        // Kırmızı kuşak: belin çevresini saran bant (düz kutu yanlarda gövdeden ayrık duruyordu)
        add(new THREE.CylinderGeometry(0.285, 0.285, 0.08, 20, 1, true), '#c8202a', [0, 0.92, 0], { side: THREE.DoubleSide });
        break;
      }
      case 'damat': {
        this.torsoMat.color.set('#1e2230');
        add(new THREE.BoxGeometry(0.18, 0.4, 0.04), '#fbfaf7', [0, 1.3, 0.255]); // gömlek
        add(new THREE.BoxGeometry(0.2, 0.08, 0.05), '#b3141b', [0, 1.5, 0.28]); // papyon
        add(new THREE.SphereGeometry(0.06, 8, 6), '#ffffff', [-0.17, 1.52, 0.19]); // yaka çiçeği
        break;
      }
      case 'kaynana': {
        this.torsoMat.color.set('#6a2c6e');
        add(new THREE.ConeGeometry(0.6, 1.0, 16, 1, true), '#7d3a6e', [0, 0.52, 0], { side: THREE.DoubleSide });
        // Yazma: başın üstünü ve arkasını örter, yüz açık kalır (eskiden kafayı her yönden
        // 112° aşağıya kadar sarıyordu, önden bakınca yüz yerine sarı top görünüyordu)
        const yazma = add(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), '#e2c34a', [0, 1.815, -0.035], { side: THREE.DoubleSide });
        yazma.rotation.x = -0.6;
        add(new THREE.SphereGeometry(0.09, 8, 6), '#e2c34a', [0, 1.62, -0.27]); // ensedeki düğüm
        // Çanta havada asılı değil, sol elde
        add(new THREE.BoxGeometry(0.3, 0.22, 0.12), '#3a2a1a', [0, -0.17, 0], {}, this.arms[0].hand);
        break;
      }
      case 'davulcu': {
        this.torsoMat.color.set('#2f4f7a');
        // Davul karna dayalı, yüzleri yanlara bakar; eller iki yüzüne vurur
        const drum = add(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 20).rotateZ(Math.PI / 2), '#c9a36a', [0, 1.05, 0.56]);
        drum.name = 'davul';
        break;
      }
      case 'zurnaci': {
        this.torsoMat.color.set('#7a2f2f');
        // Zurnanın ince ucu ağızda, kalın ağzı öne-aşağı bakar (önceden ters duruyordu)
        const z = add(new THREE.ConeGeometry(0.09, 0.7, 10), '#8a5a2e', [0, 1.68 + ZURNA.y * 0.35, 0.27 + ZURNA.z * 0.35]);
        z.rotation.x = Math.atan2(-ZURNA.z, -ZURNA.y);
        break;
      }
    }
  }

  /** Halaybaşı mendili */
  setMendil(on: boolean): void {
    if (on && !this.mendil) {
      this.mendil = new THREE.Mesh(GEO.mendil, MAT.mendil);
      // Mendilin bir köşesi elde, kolun uzantısında döner
      this.mendil.position.set(0, -0.3, 0);
      this.arms[1].hand.add(this.mendil);
    } else if (!on && this.mendil) {
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
    const coin = new THREE.Mesh(GEO.coin, MAT.coin);
    const row = Math.floor(n / 6);
    const x = ((n % 6) - 2.5) * 0.09;
    // Gövde yuvarlak: kenardaki çeyrekler de göğse yapışsın, havada durmasın
    coin.position.set(x, -row * 0.1, Math.sqrt(0.27 * 0.27 - x * x) + 0.03);
    coin.rotation.y = Math.asin(x / 0.27);
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
    this.bubble = createBubble(text, opts.color ?? '#1a1a1a', opts.background ?? 'rgba(235,235,240,0.95)');
    this.bubble.material.toneMapped = false;
    // Alt kenarı (kuyruk ucu) sabit: satır arttıkça balon yukarı büyür, isim etiketine binmez
    this.bubble.center.set(0.5, 0);
    this.bubble.position.y = 2.92;
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

  /** El tutmaya hazır mı: ayakta, yerinde, el sallamıyor */
  private canHold(now: number): boolean {
    return this.motion.kind === 'idle' && now >= this.waveUntil && Math.abs(this.body.rotation.z) < 0.2;
  }

  /** Omzun dünya konumu (gövde zıplaması hariç: iki komşu da aynı hesabı yapar) */
  private shoulderWorld(side: number, out: THREE.Vector3): THREE.Vector3 {
    const r = this.group.rotation.y;
    const p = this.group.position;
    const lx = side * SX;
    return out.set(p.x + lx * Math.cos(r), p.y + SY, p.z - lx * Math.sin(r));
  }

  /** Komşunun yerel x'i: + ise +x kolu ona uzanır */
  private localX(n: Dancer): number {
    const r = this.group.rotation.y;
    return (n.group.position.x - this.group.position.x) * Math.cos(r) - (n.group.position.z - this.group.position.z) * Math.sin(r);
  }

  /**
   * `n` komşusuna hangi kolla (0: -x, 1: +x) uzanılır. Yalnız konumlardan ve `links`'ten hesaplanır;
   * komşu da aynı fonksiyonu çağırıp bu figürün seçimini bilir, eller hep aynı noktada buluşur.
   * İki komşu aynı taraftaysa (yüz zincir yönüne dönükken) daha yandaki o kolu alır, öteki karşı kolu.
   */
  private sideFor(n: Dancer): number {
    const [p, q] = this.links;
    const other = n === p ? q : n === q ? p : null;
    const x = this.localX(n);
    const mine = x >= 0 ? 1 : 0;
    if (!other) return mine;
    const ox = this.localX(other);
    if ((ox >= 0 ? 1 : 0) !== mine) return mine;
    // Eşitlikte sıradaki önceki komşu (links[0]) kazanır
    const keep = Math.abs(x) > Math.abs(ox) || (Math.abs(x) === Math.abs(ox) && n === p);
    return keep ? mine : 1 - mine;
  }

  /**
   * Komşuyla ellerin buluşacağı nokta (dünya). İki taraf da aynı omuz çiftini ve aynı noktayı bulur.
   * Dönen değer bu figürün o ele uzanan kol indeksi; komşu çok uzaksa -1.
   */
  private meetPoint(n: Dancer, beat: Beat, out: THREE.Vector3): number {
    const mine = this.sideFor(n);
    const theirs = n.sideFor(this);
    this.shoulderWorld(mine * 2 - 1, _a);
    n.shoulderWorld(theirs * 2 - 1, _b);
    if (_a.distanceToSquared(_b) > MAX_HOLD_GAP * MAX_HOLD_GAP) return -1;
    const raise = (this.raise + n.raise) / 2;
    // Vuruşta eller hafifçe iner-kalkar (herkes aynı vuruş sayısını kullanır)
    const swing = Math.sin((beat.count % 1) * Math.PI) * 0.05 * raise;
    const drop = HOLD.dropResting + (HOLD.dropDancing - HOLD.dropResting) * raise - swing;
    const fwd = (HOLD.forwardResting + (HOLD.forwardDancing - HOLD.forwardResting) * raise) / 2;
    const r1 = this.group.rotation.y;
    const r2 = n.group.rotation.y;
    out.addVectors(_a, _b).multiplyScalar(0.5);
    out.x += (Math.sin(r1) + Math.sin(r2)) * fwd;
    out.z += (Math.cos(r1) + Math.cos(r2)) * fwd;
    out.y -= drop;
    return mine;
  }

  /** Dünya noktasını gövdenin yerel koordinatına çevirir (matris güncellemesi beklemeden) */
  private toBody(v: THREE.Vector3): THREE.Vector3 {
    v.sub(this.group.position);
    const r = -this.group.rotation.y;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const x = v.x * c + v.z * s;
    v.z = -v.x * s + v.z * c;
    v.x = x;
    v.sub(this.body.position);
    return v.applyQuaternion(_q.copy(this.body.quaternion).invert());
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
      pos.y = m.from.y + (m.to.y - m.from.y) * smooth(k) + Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
      const dx = m.to.x - m.from.x;
      const dz = m.to.z - m.from.z;
      if (dx * dx + dz * dz > 0.01) this.facing = Math.atan2(dx, dz);
      if (k >= 1) {
        pos.y = m.to.y;
        this.motion = { kind: 'idle' };
      }
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

    // ---- bacaklar ve gövde
    const dancing = beat.playing && m.kind === 'idle' && this.outfit !== 'kaynana';
    const dancer = this.outfit === 'guest' || this.outfit === 'gelin' || this.outfit === 'damat';
    const b = beat.count + (this.outfit === 'guest' ? 0 : this.phase * 0.1);
    const step = b % 4; // 4 vuruşluk halay figürü: sağ, sol, sağ, tekme
    const lift = Math.max(0, Math.sin((b % 1) * Math.PI));
    if (m.kind === 'walk') {
      const s = Math.sin(m.t * 12);
      this.legL.rotation.x = s * 0.5;
      this.legR.rotation.x = -s * 0.5;
    } else if (dancing && dancer) {
      this.legL.rotation.x = step < 1 || (step >= 2 && step < 3) ? 0 : -lift * 0.35;
      this.legR.rotation.x = step >= 3 ? -lift * 1.1 : step < 1 ? -lift * 0.35 : 0;
      // Hafif sekme: etekli gelinde etek yerden kopmasın diye çok az
      this.body.position.y = lift * (this.outfit === 'gelin' ? 0.02 : 0.045 * (1 + beat.heat));
      // Omuz titremesi / gelinin salınması: gövde döner, tutulan eller yerinde kalır
      this.body.rotation.y = this.outfit === 'gelin'
        ? Math.sin(b * Math.PI) * 0.14
        : Math.sin(t * 28) * 0.07 * beat.heat + Math.sin(b * Math.PI) * 0.04;
    } else {
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
      this.body.position.y *= 0.8;
      this.body.rotation.y *= 0.85;
    }
    if (now < this.hopUntil) {
      const k = 1 - (this.hopUntil - now) / 0.6;
      this.body.position.y = Math.sin(k * Math.PI) * 0.7;
    }
    if (this.outfit === 'zurnaci') this.body.rotation.x = beat.playing ? Math.sin(t * 3) * 0.08 : this.body.rotation.x * 0.9;

    this.raise += ((dancing ? 1 : 0) - this.raise) * Math.min(1, dt * 3);
    this.poseArms(dt, now, t, b, beat, dancing && dancer);

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

  private poseArms(dt: number, now: number, t: number, b: number, beat: Beat, dancing: boolean): void {
    const arms = this.arms;
    arms[0].begin();
    arms[1].begin();
    const mode = [-1, -1];
    const m = this.motion;

    // 1) Komşuların elini tut (iki taraf da birbirini listeliyorsa)
    if (this.canHold(now)) {
      for (let li = 0; li < 2; li++) {
        const n = this.links[li];
        if (!n || !n.canHold(now) || (n.links[0] !== this && n.links[1] !== this)) continue;
        const side = this.meetPoint(n, beat, _m);
        if (side < 0 || mode[side] >= 0) continue;
        const sgn = side * 2 - 1;
        arms[side].ik(this.toBody(_m), _pole.set(sgn * 0.7, -1, -0.45));
        mode[side] = M_HOLD;
      }
    }

    // 2) Boştaki kollar
    const head = this.ringTarget !== null && this.links[0] === null;
    let mendilSide = -1;
    if (this.mendil) mendilSide = mode[1] < 0 ? 1 : mode[0] < 0 ? 0 : -1;
    for (let i = 0; i < 2; i++) {
      if (mode[i] >= 0) continue;
      const arm = arms[i];
      const sgn = i * 2 - 1;
      if (m.kind === 'thrown' || m.kind === 'fallen') {
        // Fırlarken/düşerken kollar açık, çırpınır
        arm.fk(0, 2.4 + Math.sin(t * 20 + i) * 0.4, 0.3);
        mode[i] = M_FLAIL;
      } else if (now < this.waveUntil) {
        // "Hooop!": iki kol havada, biri sallanır
        arm.fk(-0.15, i === 1 ? 2.6 + Math.sin(t * 12) * 0.35 : 2.3, i === 1 ? 0.5 : 0.35);
        mode[i] = M_WAVE;
      } else if (m.kind === 'walk') {
        const s = Math.sin(m.t * 12) * sgn;
        arm.fk(s * 0.45, 0.14, 0.35);
        mode[i] = M_WALK;
      } else if (this.outfit === 'davulcu') {
        this.playDrum(arm, i, beat);
        mode[i] = M_PLAY;
      } else if (this.outfit === 'zurnaci') {
        // İki el de zurnanın üstünde, parmaklar deliklerde
        const along = i === 0 ? 0.2 : 0.37;
        _m.set(0, 1.68 + ZURNA.y * along + 0.03, 0.27 + ZURNA.z * along);
        arm.ik(_m, _pole.set(sgn, -0.6, -0.2));
        mode[i] = M_PLAY;
      } else if (this.outfit === 'kaynana') {
        if (i === 1 && this.bubble) {
          // Parmak sallar
          _m.set(0.26 + Math.sin(t * 14) * 0.06, 1.78, 0.32);
          arm.ik(_m, _pole.set(1, -1, -0.2));
          mode[i] = M_WAG;
        } else if (i === 1) {
          // Eli belde, dirsek dışarıda
          _m.set(0.37, 0.98, 0.03);
          arm.ik(_m, _pole.set(1, 0, -0.5));
          mode[i] = M_HIP;
        } else {
          // Çantayı taşıyan sol kol hafif önde sarkar
          arm.fk(-0.12, 0.16, 0.35);
          mode[i] = M_IDLE;
        }
      } else if (i === mendilSide) {
        // Halaybaşı mendili havada çevirir
        if (dancing) arm.fk(-0.1, 2.65 + Math.sin(t * 9) * 0.25, 0.35);
        else arm.fk(-0.2, 0.5, 0.6);
        mode[i] = M_MENDIL;
      } else if (dancing && (this.outfit === 'gelin' || this.outfit === 'damat')) {
        // Gelin/damat: boştaki kol(lar) vuruşla havada salınır
        const k = Math.sin(b * Math.PI + i * 1.3);
        arm.fk(-0.15, 2.15 + k * 0.3, 0.75 + k * 0.2);
        mode[i] = M_RAISE;
      } else if (dancing && head) {
        // Mendilsiz halaybaşı: boş kolu yukarıda açık
        arm.fk(-0.2, 1.9 + lift01(b) * 0.25, 0.6);
        mode[i] = M_RAISE;
      } else if (dancing && this.ringTarget) {
        // Zincirin sonundaki boş kol vuruşla öne-arkaya sallanır
        arm.fk(-0.15 - lift01(b) * 0.25, 0.22, 0.45);
        mode[i] = M_SWING;
      } else if (dancing) {
        arm.fk(-0.1, 1.0 + lift01(b) * 0.25, 0.5);
        mode[i] = M_RAISE;
      } else {
        arm.fk(0.04, 0.12 + Math.sin(t * 1.2 + i) * 0.03, 0.15);
        mode[i] = M_IDLE;
      }
    }
    arms[0].end(mode[0], dt);
    arms[1].end(mode[1], dt);

    if (this.mendil) {
      if (mendilSide >= 0 && this.mendil.parent !== arms[mendilSide].hand) arms[mendilSide].hand.add(this.mendil);
      this.mendil.rotation.y = dancing ? t * 9 : 0;
    }
  }

  private playDrum(arm: Arm, i: number, beat: Beat): void {
    const ph = (beat.count % 1) * Math.PI * 2;
    if (i === 1) {
      // Sağ el (tokmak) vuruşta davulun sağ yüzüne iner
      const hit = beat.playing ? Math.pow(Math.max(0, Math.cos(ph)), 4) : 0;
      _m.set(0.28 + (1 - hit) * 0.14, 1.12 + (1 - hit) * 0.28, 0.5 - (1 - hit) * 0.06);
      arm.ik(_m, _pole.set(1, -0.3, -0.6));
      const drum = this.outfitGroup.getObjectByName('davul');
      if (drum) drum.scale.setScalar(1 + hit * 0.05);
    } else {
      // Sol el (çubuk) ara vuruşlarda sol yüze dokunur
      const tap = beat.playing ? Math.pow(Math.max(0, Math.cos(ph * 2 + Math.PI)), 6) : 0;
      _m.set(-0.28 - (1 - tap) * 0.06, 1.08 + (1 - tap) * 0.1, 0.45);
      arm.ik(_m, _pole.set(-1, -0.3, -0.6));
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (!shared.has(o.geometry)) o.geometry.dispose();
        const mat = o.material as THREE.Material;
        if (!shared.has(mat)) mat.dispose();
      }
    });
    if (this.tag) disposeSprite(this.tag);
    if (this.bubble) disposeSprite(this.bubble);
    this.group.removeFromParent();
  }
}

/**
 * Konuşma balonu: dar dikey kadrajda yandaki TikTok düğmelerine taşmasın diye genişliği sınırlı,
 * metin en fazla 3 satıra kırılır, sığmayan kısım "…" ile kesilir.
 */
const BUBBLE = { font: '600 44px Segoe UI, sans-serif', size: 44, maxLine: 400, maxLines: 3, pad: 18, worldPerPx: 0.6 / 95 } as const;
let bubbleMeasure: CanvasRenderingContext2D | null = null;

function wrapLines(ctx: CanvasRenderingContext2D, text: string): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= BUBBLE.maxLine;
  const lines: string[] = [];
  let line = '';
  const words = text.trim().split(/\s+/);
  for (let wi = 0; wi < words.length; wi++) {
    let w = words[wi];
    // Tek başına sığmayan uzun kelime harf harf bölünür
    while (!fits(w)) {
      const chars = [...w];
      let n = chars.length - 1;
      while (n > 1 && !fits(chars.slice(0, n).join(''))) n--;
      if (line) lines.push(line);
      lines.push(chars.slice(0, n).join(''));
      line = '';
      w = chars.slice(n).join('');
    }
    const next = line ? `${line} ${w}` : w;
    if (fits(next)) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > BUBBLE.maxLines) {
    lines.length = BUBBLE.maxLines;
    let last = lines[BUBBLE.maxLines - 1];
    while (last && !fits(last + '…')) last = [...last].slice(0, -1).join('');
    lines[BUBBLE.maxLines - 1] = last + '…';
  }
  return lines.length ? lines : [''];
}

function createBubble(text: string, color: string, background: string): THREE.Sprite {
  bubbleMeasure ??= document.createElement('canvas').getContext('2d')!;
  bubbleMeasure.font = BUBBLE.font;
  const lines = wrapLines(bubbleMeasure, text);
  const lineH = Math.round(BUBBLE.size * 1.25);
  const textW = Math.max(...lines.map((l) => bubbleMeasure!.measureText(l).width));
  const tailH = BUBBLE.size * 0.4;
  const boxH = lineH * lines.length + BUBBLE.size * 0.1 + BUBBLE.pad * 2;
  const width = Math.ceil(textW) + BUBBLE.pad * 2 + 8;
  const height = Math.ceil(boxH + tailH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, boxH, Math.min(40, boxH / 2));
  ctx.moveTo(width / 2 - tailH, boxH);
  ctx.lineTo(width / 2, height);
  ctx.lineTo(width / 2 + tailH, boxH);
  ctx.fill();
  ctx.font = BUBBLE.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  const top = (boxH - lineH * lines.length) / 2;
  lines.forEach((l, i) => ctx.fillText(l, width / 2, top + lineH * (i + 0.5) + BUBBLE.size * 0.04));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width * BUBBLE.worldPerPx, height * BUBBLE.worldPerPx, 1);
  return sprite;
}

/** Zurnanın ağızdan çıkış yönü (öne-aşağı, birim) */
const ZURNA = { y: -0.7, z: 0.714 } as const;

const lift01 = (b: number) => Math.max(0, Math.sin((b % 1) * Math.PI));

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
    d.links[0] = d.links[1] = null;
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
    return this.pointAt(this.order.length, new THREE.Vector3());
  }

  private pointAt(i: number, out: THREE.Vector3): THREE.Vector3 {
    const a = this.offset - (i * RING.spacing) / this.radius;
    return out.set(Math.sin(a) * this.radius, 0, Math.cos(a) * this.radius);
  }

  update(dt: number, beat: Beat, beatsPerSecond: number): void {
    const n = Math.max(this.order.length, 1);
    // Zincir çemberin %85'ini kaplar
    const wanted = Math.max(RING.minRadius, (n * RING.spacing) / (Math.PI * 2 * 0.85));
    this.radius += (wanted - this.radius) * Math.min(1, dt * 0.8);
    // Halay müzik çaldıkça sağa doğru ilerler; tekme vuruşunda durur
    if (beat.playing) this.offset += dt * beatsPerSecond * 0.09;
    const order = this.order;
    for (let i = 0; i < order.length; i++) {
      const d = order[i];
      const p = this.pointAt(i, (d.ringTarget ??= new THREE.Vector3()));
      d.links[0] = order[i - 1] ?? null;
      d.links[1] = order[i + 1] ?? null;
      // Yüz kameraya (+z) dönük ama omuzlar zincir boyunca: arka yarıda halkanın içine, ön yarıda
      // dışarı bakar. Eskiden yanlarda yüz zincir yönüne dönüyor, komşular önde/arkada kalıyordu.
      const len = Math.hypot(p.x, p.z) || 1;
      const nx = -p.x / len;
      const nz = -p.z / len;
      const k = 3 * nz; // işaretli: ön yarıda normal ters çevrilir
      d.facing = Math.atan2(nx * k, nz * k + 1);
    }
  }
}
