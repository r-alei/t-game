/**
 * İstanbul kıyıları. Kara (rıhtım + tepeler) sabit duran uzun bir şerittir;
 * üstündeki evler, camiler, kuleler kümeler hâlinde +z yönünde akar.
 * İstanbul'u tanıtan öğeler: tepelere tırmanan kiremit çatılı evler, tepede
 * kubbeli-minareli camiler, Galata Kulesi, rıhtımdaki yalılar, asma köprü, Kız Kulesi.
 *
 * Evler InstancedMesh ile çizilir: küme başına 3 çizim çağrısı.
 */
import * as THREE from 'three';
import { TIMING } from '../config.ts';
import { dayWindowTexture } from './textures.ts';
import { createTextSprite, disposeSprite } from '../../../engine/textSprite.ts';
import { makeTurkishFlag, type Flag } from './flag.ts';

const SPAWN_Z = -620;
const DESPAWN_Z = 140;
/** Rıhtımın vapura uzaklığı */
const SHORE_X = 42;
const QUAY_Y = 1.4;

/** Kıyıdan içeri d birim gidince arazinin yüksekliği */
export function landHeight(d: number): number {
  const pts: [number, number][] = [[0, QUAY_Y], [10, QUAY_Y], [45, 14], [95, 32], [165, 44], [300, 50]];
  if (d <= 0) return QUAY_Y;
  for (let i = 1; i < pts.length; i++) {
    const [d1, h1] = pts[i];
    const [d0, h0] = pts[i - 1];
    if (d <= d1) return h0 + ((d - d0) / (d1 - d0)) * (h1 - h0);
  }
  return pts[pts.length - 1][1];
}

// -------------------------------------------------------------- ortak malzemeler
const STONE = new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.9 });
const LEAD = new THREE.MeshStandardMaterial({ color: '#8d979e', roughness: 0.6, metalness: 0.3 });
const wallMat = new THREE.MeshStandardMaterial({ map: dayWindowTexture(), roughness: 0.85 });
const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
const treeMat = new THREE.MeshStandardMaterial({ color: '#4f7a3e', roughness: 1, flatShading: true });
const wallGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const roofGeo = new THREE.ConeGeometry(0.75, 0.45, 4).rotateY(Math.PI / 4).translate(0, 0.225, 0);
const treeGeo = new THREE.IcosahedronGeometry(1, 0);

const WALLS = ['#f3e6cf', '#e9d3b0', '#f2c9b8', '#d9e2e8', '#efe0a8', '#e6b89c', '#ffffff', '#cfd8c0', '#f0d0d8'];
const ROOFS = ['#b5532f', '#a8472a', '#c4643a', '#9b4a33'];
const YALI = ['#ffffff', '#f6e7d0', '#8e3b2e', '#f0c9a8', '#dce8ee'];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

interface Piece {
  object: THREE.Object3D;
  kind: 'shore' | 'bridge' | 'tower' | 'pier';
}

// -------------------------------------------------------------- simge yapılar
function mosque(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = false;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(26, 10, 26).translate(0, 5, 0), STONE);
  add(new THREE.CylinderGeometry(9.5, 9.5, 4, 24).translate(0, 12, 0), STONE);
  add(new THREE.SphereGeometry(9.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), LEAD, 0, 14, 0);
  add(new THREE.ConeGeometry(0.5, 3, 8), LEAD, 0, 25, 0);
  // Yarım kubbeler
  for (const [x, z] of [[0, -9], [0, 9], [-9, 0], [9, 0]]) {
    add(new THREE.SphereGeometry(5.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), LEAD, x, 10, z);
  }
  // Köşe kubbecikleri
  for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
    add(new THREE.SphereGeometry(2.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), LEAD, x, 10, z);
  }
  // Kalem minareler (şerefeli)
  for (const [x, z] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) {
    add(new THREE.CylinderGeometry(0.9, 1.1, 38, 10).translate(0, 19, 0), STONE, x, 0, z);
    for (const y of [24, 31]) add(new THREE.CylinderGeometry(1.5, 1.3, 0.8, 10), STONE, x, y, z);
    add(new THREE.ConeGeometry(1.0, 7, 10).translate(0, 3.5, 0), LEAD, x, 38, z);
  }
  g.scale.setScalar(scale);
  return g;
}

function galata(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 30, 20).translate(0, 15, 0), new THREE.MeshStandardMaterial({ color: '#cdbfa8', roughness: 0.95 }));
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 2.2, 20).translate(0, 31, 0), STONE);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 11, 20).translate(0, 37.5, 0), new THREE.MeshStandardMaterial({ color: '#5e6f7a', roughness: 0.5, metalness: 0.3 }));
  g.add(body, gallery, roof);
  return g;
}

// -------------------------------------------------------------- köprü
export class Bridge {
  readonly group = new THREE.Group();
  private banner: THREE.Mesh | null = null;
  private label: THREE.Sprite | null = null;
  static readonly DECK_Y = 42;

  constructor() {
    const g = this.group;
    const deckY = Bridge.DECK_Y;
    const steel = new THREE.MeshStandardMaterial({ color: '#c9ced3', roughness: 0.5, metalness: 0.4 });
    const deckMat = new THREE.MeshStandardMaterial({ color: '#9aa3ab', roughness: 0.7 });
    for (const x of [-60, 60]) {
      for (const dz of [-2.5, 2.5]) g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 100, 2.2).translate(x, 50, dz), steel));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 7).translate(x, 96, 0), steel));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 7).translate(x, 62, 0), steel));
    }
    g.add(new THREE.Mesh(new THREE.BoxGeometry(340, 2.4, 7).translate(0, deckY, 0), deckMat));

    // Ana kablolar ve askılar
    const cableMat = new THREE.MeshStandardMaterial({ color: '#e7ebee', roughness: 0.4 });
    const curvePts = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag, 0));
      }
      return pts;
    };
    for (const dz of [-2.8, 2.8]) {
      for (const [x0, y0, x1, y1, sag] of [[-170, deckY + 1, -60, 99, -8], [-60, 99, 60, 99, 52], [60, 99, 170, deckY + 1, -8]] as const) {
        const curve = new THREE.CatmullRomCurve3(curvePts(x0, y0, x1, y1, sag));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.35, 6), cableMat);
        tube.position.z = dz;
        g.add(tube);
        // Askılar
        for (let i = 1; i < 24; i += 2) {
          const p = curve.getPoint(i / 24);
          if (p.y - deckY < 2) continue;
          const h = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, p.y - deckY, 4), cableMat);
          h.position.set(p.x, (p.y + deckY) / 2, dz);
          g.add(h);
        }
      }
    }
  }

  /** Köprüye izleyicinin renginde dev pankart asar */
  dedicate(name: string, color: string): void {
    this.clear();
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 996, 228);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 150px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 512, 136, 940);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.banner = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    this.banner.position.set(0, Bridge.DECK_Y - 9.5, 3.7);
    this.group.add(this.banner);
  }

  clear(): void {
    if (this.banner) {
      this.banner.geometry.dispose();
      const m = this.banner.material as THREE.MeshStandardMaterial;
      m.map?.dispose();
      m.dispose();
      this.banner.removeFromParent();
      this.banner = null;
    }
    if (this.label) disposeSprite(this.label);
    this.label = null;
  }

  update(_dt: number): void {}
}

// -------------------------------------------------------------- Kız Kulesi
export class Tower {
  readonly group = new THREE.Group();
  readonly flag: Flag;
  private label: THREE.Sprite | null = null;

  constructor() {
    const g = this.group;
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 2.6, 12), new THREE.MeshStandardMaterial({ color: '#8b8478', roughness: 1 }));
    rock.position.y = 0.4;
    const walls = new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.9 });
    const house = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 8).translate(0, 2.5, 0), walls);
    house.position.y = 1.7;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 15, 12).translate(0, 7.5, 0), walls);
    tower.position.set(2.5, 1.7, 0);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2, 12).translate(0, 1, 0), new THREE.MeshStandardMaterial({ color: '#d8e4ea' }));
    lantern.position.set(2.5, 16.7, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5, 12).translate(0, 2.5, 0), LEAD);
    roof.position.set(2.5, 18.7, 0);
    g.add(rock, house, tower, lantern, roof);
    this.flag = makeTurkishFlag(3.2);
    this.flag.object.position.set(-4, 6.7, 0);
    g.add(this.flag.object);
  }

  /** Göğe dev yazı (kulenin üstünde) */
  dedicate(name: string, color: string): THREE.Vector3 {
    this.clear();
    this.label = createTextSprite(name, { color, stroke: '#ffffff', font: '900 130px Segoe UI, sans-serif', height: 14 });
    this.label.position.set(2, 34, 0);
    this.group.add(this.label);
    return this.label.position.clone();
  }

  clear(): void {
    if (this.label) disposeSprite(this.label);
    this.label = null;
  }
}

// -------------------------------------------------------------- iskele
/**
 * Klasik vapur iskelesi: kıyıdan vapura uzanan iskele, kiremit çatılı bekleme
 * binası, saat kulesi ve uzaktan okunan büyük tabela. Sağ yakada durur;
 * ucu vapurun sancak bordasına (x ≈ 4,5) değer.
 */
export class Pier {
  readonly group = new THREE.Group();
  private readonly sign: THREE.Sprite;

  constructor(readonly name: string) {
    const g = this.group;
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.9 });
    const cream = new THREE.MeshStandardMaterial({ color: '#f1e6cf', roughness: 0.85 });
    const roof = new THREE.MeshStandardMaterial({ color: '#a8472a', roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: '#3b3f46' });
    const startX = 4.6;
    const len = SHORE_X - startX;
    // İskele tabliyesi ve kazıklar
    g.add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 7).translate(startX + len / 2, QUAY_Y - 0.25, 0), wood));
    for (let x = startX + 1; x < SHORE_X; x += 4) {
      for (const z of [-3, 3]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 6).translate(x, QUAY_Y - 2.2, z), dark));
    }
    // Bekleme binası (uçta) + kırma çatı
    const bx = startX + 8;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(12, 5, 11).translate(bx, QUAY_Y + 2.5, 0), cream));
    const r = new THREE.Mesh(new THREE.ConeGeometry(9, 3.5, 4).rotateY(Math.PI / 4).translate(bx, QUAY_Y + 6.75, 0), roof);
    r.scale.set(0.95, 1, 0.88);
    g.add(r);
    // Pencere şeridi ve kapı
    const glass = new THREE.MeshStandardMaterial({ color: '#2d4456', roughness: 0.2, metalness: 0.5 });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 8).translate(bx - 6.02, QUAY_Y + 3, 0), glass));
    // Saat kulesi
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 6, 2.6).translate(bx + 3, QUAY_Y + 8, -3.5), cream));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.6, 4).rotateY(Math.PI / 4).translate(bx + 3, QUAY_Y + 12.3, -3.5), roof));
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
    clock.rotation.y = -Math.PI / 2;
    clock.position.set(bx + 1.68, QUAY_Y + 9.5, -3.5);
    g.add(clock);
    // Babalar (halat bağlama)
    for (const z of [-2.8, 2.8]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8).translate(startX + 0.6, QUAY_Y + 0.4, z), dark));
    // Tabela: kameraya hep dönük, uzaktan okunur
    this.sign = createTextSprite(name, { color: '#ffffff', background: '#0b3a5a', font: '900 96px Segoe UI, sans-serif', height: 2.2, padding: 26 });
    // Vapura yakın uçta: dikey ekranda sağ kenara (TikTok butonlarının altına) taşmasın
    this.sign.position.set(startX + 2.5, QUAY_Y + 12.5, 3);
    g.add(this.sign);
  }

  dispose(): void {
    disposeSprite(this.sign);
  }
}

// -------------------------------------------------------------- yönetici
export class Scenery {
  readonly group = new THREE.Group();
  private pieces: Piece[] = [];
  /** Her kıyıda sıradaki kümenin başlayacağı z (ufka doğru negatif) */
  private frontier = { left: DESPAWN_Z, right: DESPAWN_Z };
  private sinceBridge = TIMING.bridgeEvery - 20;
  private sinceTower = TIMING.towerEvery - 45;
  private sinceLandmark = { left: 0, right: 0 };
  readonly bridges: Bridge[] = [];
  readonly towers: Tower[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.buildLand();
    this.fillShores();
    // Açılışta bir köprü ufukta görünsün
    this.spawnBridge(-420);
  }

  /** Sabit kara şeridi: rıhtım + tepeler (iki yakada) */
  private buildLand(): void {
    const shape = new THREE.Shape();
    shape.moveTo(-1.5, -2);
    shape.lineTo(-1.5, QUAY_Y);
    for (const d of [10, 25, 45, 70, 95, 130, 165, 230, 300]) shape.lineTo(d, landHeight(d));
    shape.lineTo(300, -2);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1000, bevelEnabled: false });
    const grass = new THREE.MeshStandardMaterial({ color: '#7f8f5c', roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const quay = new THREE.MeshStandardMaterial({ color: '#c8c0ad', roughness: 0.9 });
    for (const side of [-1, 1] as const) {
      const land = new THREE.Mesh(geo, grass);
      land.position.set(side * SHORE_X, 0, -860);
      land.scale.x = side;
      land.receiveShadow = true;
      this.group.add(land);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1000), quay);
      edge.position.set(side * (SHORE_X - 0.2), QUAY_Y + 0.05, -360);
      this.group.add(edge);
    }
  }

  private fillShores(): void {
    for (const key of ['left', 'right'] as const) {
      const side = key === 'left' ? -1 : 1;
      while (this.frontier[key] > SPAWN_Z) this.frontier[key] = this.spawnShore(side, key, this.frontier[key]);
    }
  }

  /** [z - uzunluk, z] aralığına evler, ağaçlar ve arada bir simge yapı koyar. */
  private spawnShore(side: -1 | 1, key: 'left' | 'right', z: number): number {
    const cluster = new THREE.Group();
    const length = 50 + Math.random() * 30;
    type House = { d: number; dz: number; w: number; h: number; depth: number; wall: string; roof: string };
    const houses: House[] = [];
    // Rıhtımda yalılar
    for (let dz = 2; dz < length - 4; dz += 7 + Math.random() * 4) {
      if (Math.random() < 0.8) houses.push({ d: 4, dz, w: 6 + Math.random() * 2, h: 6 + Math.random() * 3, depth: 5, wall: pick(YALI), roof: '#6b3a2a' });
    }
    // Tepeye tırmanan sık evler: kıyıya yakın daha sık
    for (let d = 14; d < 175; d += 7 + d * 0.035) {
      for (let dz = Math.random() * 4; dz < length - 3; dz += 5.5 + Math.random() * 3 + d * 0.02) {
        if (Math.random() < 0.15) continue;
        houses.push({ d: d + Math.random() * 3, dz, w: 4 + Math.random() * 3, h: 4 + Math.random() * (d < 60 ? 9 : 5), depth: 4 + Math.random() * 2, wall: pick(WALLS), roof: pick(ROOFS) });
      }
    }
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, houses.length);
    const roofs = new THREE.InstancedMesh(roofGeo, roofMat, houses.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    houses.forEach((h, i) => {
      // Yamaçta alt kenar havada kalmasın diye biraz gömülür
      const y = landHeight(h.d) - (h.d > 10 ? 1.4 : 0.1);
      const x = side * (SHORE_X + h.d);
      m.compose(new THREE.Vector3(x, y, -h.dz), q, new THREE.Vector3(h.w, h.h, h.depth));
      walls.setMatrixAt(i, m);
      walls.setColorAt(i, color.set(h.wall));
      m.compose(new THREE.Vector3(x, y + h.h, -h.dz), q, new THREE.Vector3(h.w * 1.08, h.w * 0.9, h.depth * 1.15));
      roofs.setMatrixAt(i, m);
      roofs.setColorAt(i, color.set(h.roof).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06));
    });
    walls.castShadow = false;
    cluster.add(walls, roofs);

    // Ağaçlar
    const treeCount = 18;
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const d = 8 + Math.random() * 120;
      const s = 2 + Math.random() * 2.5;
      m.compose(new THREE.Vector3(side * (SHORE_X + d), landHeight(d) + s * 0.6, -Math.random() * length), q, new THREE.Vector3(s, s * 1.2, s));
      trees.setMatrixAt(i, m);
    }
    cluster.add(trees);

    // Simge yapılar: her yakada belli aralıkla cami ya da Galata
    this.sinceLandmark[key] += length;
    if (this.sinceLandmark[key] > 150 + Math.random() * 80) {
      this.sinceLandmark[key] = 0;
      const isGalata = Math.random() < 0.3;
      const d = isGalata ? 55 + Math.random() * 20 : 95 + Math.random() * 50;
      const lm = isGalata ? galata() : mosque(1.1 + Math.random() * 0.3);
      lm.position.set(side * (SHORE_X + d), landHeight(d) - 0.5, -length / 2);
      cluster.add(lm);
    }

    cluster.position.z = z;
    this.group.add(cluster);
    this.pieces.push({ object: cluster, kind: 'shore' });
    return z - length - 2;
  }

  spawnBridge(z = SPAWN_Z): Bridge {
    const bridge = new Bridge();
    bridge.group.position.z = z;
    this.group.add(bridge.group);
    this.pieces.push({ object: bridge.group, kind: 'bridge' });
    this.bridges.push(bridge);
    this.sinceBridge = 0;
    return bridge;
  }

  /** İskeleyi önümüze, sağ yakaya yerleştirir */
  spawnPier(name: string, z: number): Pier {
    const pier = new Pier(name);
    pier.group.position.z = z;
    pier.group.userData.pier = pier;
    this.group.add(pier.group);
    this.pieces.push({ object: pier.group, kind: 'pier' });
    return pier;
  }

  spawnTower(z = SPAWN_Z): Tower {
    const tower = new Tower();
    tower.group.position.set(30, 0, z);
    this.group.add(tower.group);
    this.pieces.push({ object: tower.group, kind: 'tower' });
    this.towers.push(tower);
    this.sinceTower = 0;
    return tower;
  }

  /** Önümüzde görünür mesafedeki köprü; yoksa yakına yenisini getirir */
  upcomingBridge(): Bridge {
    const ahead = this.bridges.find((b) => b.group.position.z > -420 && b.group.position.z < -80);
    return ahead ?? this.spawnBridge(-230);
  }

  upcomingTower(): Tower {
    const ahead = this.towers.find((t) => t.group.position.z > -320 && t.group.position.z < -60);
    return ahead ?? this.spawnTower(-170);
  }

  update(dt: number, speed: number): void {
    const dz = speed * dt;
    for (const p of this.pieces) p.object.position.z += dz;
    for (const t of this.towers) t.flag.update(dt);

    this.pieces = this.pieces.filter((p) => {
      if (p.object.position.z < DESPAWN_Z + (p.kind === 'shore' ? 0 : 60)) return true;
      p.object.removeFromParent();
      if (p.kind === 'bridge') {
        const i = this.bridges.findIndex((b) => b.group === p.object);
        this.bridges[i].clear();
        this.bridges.splice(i, 1);
      }
      if (p.kind === 'pier') (p.object.userData.pier as Pier).dispose();
      if (p.kind === 'tower') {
        const i = this.towers.findIndex((t) => t.group === p.object);
        this.towers[i].clear();
        this.towers.splice(i, 1);
      }
      p.object.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
        else if (o instanceof THREE.Mesh && ![wallGeo, roofGeo, treeGeo].includes(o.geometry)) o.geometry.dispose();
      });
      return false;
    });

    this.frontier.left += dz;
    this.frontier.right += dz;
    this.fillShores();

    this.sinceBridge += dt;
    this.sinceTower += dt;
    if (this.sinceBridge > TIMING.bridgeEvery) this.spawnBridge();
    if (this.sinceTower > TIMING.towerEvery) this.spawnTower();
  }
}
