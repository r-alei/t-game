/**
 * Vapur modeli — tamamen kodla. Pruva -z yönünde, kıç +z yönünde.
 * Yolcular `deck` grubuna eklenir; vapur sallandıkça onlar da sallanır.
 */
import * as THREE from 'three';
import { SHIP } from '../config.ts';
import { glowTexture } from './textures.ts';
import { makeTurkishFlag, type Flag } from './flag.ts';

const WHITE = new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.6 });
const HULL = new THREE.MeshStandardMaterial({ color: '#1b2233', roughness: 0.5, metalness: 0.2 });
const WOOD = new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 0.8 });
const DARK = new THREE.MeshStandardMaterial({ color: '#20242c', roughness: 0.7 });
const WINDOW = new THREE.MeshStandardMaterial({ color: '#2d4456', roughness: 0.15, metalness: 0.6 });

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class Ferry {
  readonly group = new THREE.Group();
  /** Yolcuların ve sahne nesnelerinin bağlandığı, vapurla sallanan grup */
  readonly deck = new THREE.Group();
  readonly seats: THREE.Vector3[] = [];
  private readonly funnelBand: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private readonly bunting: THREE.InstancedMesh;
  private pennantBase: THREE.Vector3[] = [];
  private readonly flag: Flag;
  private readonly wake: THREE.Mesh;
  private time = 0;

  constructor() {
    this.group.add(this.deck);
    const d = this.deck;

    // Gövde: üstten bakınca sivri pruvalı profil, yukarı doğru çekilir
    const outline = new THREE.Shape();
    outline.moveTo(-4, -15);
    outline.lineTo(4, -15);
    outline.lineTo(4, 9);
    outline.quadraticCurveTo(3.6, 14, 0, 16.5);
    outline.quadraticCurveTo(-3.6, 14, -4, 9);
    outline.closePath();
    // Şeklin +y'si, döndürmeden sonra -z (pruva) olur
    const hullGeo = new THREE.ExtrudeGeometry(outline, { depth: 3, bevelEnabled: false });
    hullGeo.rotateX(-Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, HULL);
    hull.position.y = SHIP.hullTop - 3;
    hull.castShadow = true;
    d.add(hull);
    // Beyaz bant + ana güverte zemini
    const band = new THREE.Mesh(hullGeo.clone().scale(1.01, 0.12, 1.01), WHITE);
    band.position.y = SHIP.hullTop - 0.4;
    d.add(band);
    const mainFloor = new THREE.Mesh(new THREE.ShapeGeometry(outline), WOOD);
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.y = SHIP.hullTop + 0.05;
    d.add(mainFloor);

    // Ana kabin (salon) — sıcak ışıklı pencere şeritleri
    // Salonun tavanı güverte zemininin biraz altında biter: aynı yükseklikte iki yüzey
    // kamera hareket ettikçe titreşir (z-fighting) ve zemin beyazlaşır.
    const cabinH = SHIP.upperDeck - SHIP.hullTop - 0.15;
    d.add(box(7, cabinH, 21, WHITE, 0, SHIP.hullTop + cabinH / 2, 2.5));
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        d.add(box(0.05, 0.9, 1.5, WINDOW, side * 3.52, SHIP.hullTop + 1.4, -6.5 + i * 2.3));
      }
    }
    // Kıç ve pruva tarafı kabin pencereleri
    d.add(box(5, 0.9, 0.05, WINDOW, 0, SHIP.hullTop + 1.4, 13.02));
    d.add(box(5, 0.9, 0.05, WINDOW, 0, SHIP.hullTop + 1.4, -8.02));

    // Üst güverte zemini + korkuluklar
    d.add(box(7.6, 0.2, 21.6, WOOD, 0, SHIP.upperDeck - 0.1, 2.5));
    const rail = new THREE.MeshStandardMaterial({ color: '#d9dde3' });
    for (const side of [-1, 1]) d.add(box(0.08, 0.9, 21.6, rail, side * 3.75, SHIP.upperDeck + 0.45, 2.5));
    d.add(box(7.6, 0.9, 0.08, rail, 0, SHIP.upperDeck + 0.45, 13.3));

    // Kaptan köşkü
    d.add(box(5.5, 2.4, 3.6, WHITE, 0, SHIP.upperDeck + 1.2, -6.2));
    d.add(box(5.2, 0.8, 0.05, WINDOW, 0, SHIP.upperDeck + 1.6, -8.02));
    for (const side of [-1, 1]) d.add(box(0.05, 0.8, 2.8, WINDOW, side * 2.76, SHIP.upperDeck + 1.6, -6.2));
    // Çatıdaki dümen
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 20), WOOD);
    wheel.position.set(SHIP.bridge.x, SHIP.bridge.y + 1.0, SHIP.bridge.z - 1.0);
    d.add(wheel, box(0.12, 1.0, 0.12, WOOD, SHIP.bridge.x, SHIP.bridge.y + 0.5, SHIP.bridge.z - 1.0));
    d.add(box(5.2, 0.6, 0.06, rail, 0, SHIP.bridge.y + 0.3, -7.95));

    // Baca: siyah tepe + adı yazan renkli bant
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 4.2, 24), WHITE);
    funnel.position.set(0, SHIP.upperDeck + 2.1, SHIP.funnel.z);
    funnel.castShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.7, 24), DARK);
    top.position.set(0, SHIP.upperDeck + 3.9, SHIP.funnel.z);
    this.funnelBand = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06, 1.08, 1.1, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: '#f2b21b', emissive: '#000000' }),
    );
    this.funnelBand.position.set(0, SHIP.upperDeck + 2.7, SHIP.funnel.z);
    d.add(funnel, top, this.funnelBand);

    // Direk ve seyir feneri
    d.add(box(0.12, 4, 0.12, DARK, 0, SHIP.bridge.y + 2, -7.4));

    // Banklar ve oturma yerleri (yolcular kıça, kameraya bakar)
    for (let r = 0; r < SHIP.seatRows; r++) {
      const z = SHIP.seatStartZ + r * SHIP.seatGapZ;
      d.add(box(7.0, 0.12, 0.5, WOOD, 0, SHIP.upperDeck + 0.42, z));
      d.add(box(7.0, 0.5, 0.08, WOOD, 0, SHIP.upperDeck + 0.75, z - 0.3));
      for (let c = 0; c < SHIP.seatCols; c++) {
        const x = (c - (SHIP.seatCols - 1) / 2) * SHIP.seatGapX;
        this.seats.push(new THREE.Vector3(x, SHIP.upperDeck, z));
      }
    }
    // Kıçtaki küçük sahne
    d.add(box(2.6, 0.18, 1.6, new THREE.MeshStandardMaterial({ color: '#5a1f3a' }), SHIP.stage.x, SHIP.upperDeck + 0.09, SHIP.stage.z));

    // Bayrak zinciri (süs bayrakları): direkten kıça ve korkuluk boyunca
    const pennants: THREE.Vector3[] = [];
    for (let t = 0; t <= 1.0001; t += 0.035) {
      pennants.push(new THREE.Vector3(0, SHIP.bridge.y + 3.6 - t * 4.2 - Math.sin(t * Math.PI) * 0.8, -7.4 + t * 20.6));
    }
    const triGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.5, 0], 3));
    triGeo.computeVertexNormals();
    this.bunting = new THREE.InstancedMesh(triGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), pennants.length);
    const palette = ['#e30a17', '#ffffff', '#f2b21b', '#2f7fd8', '#e30a17', '#ffffff'];
    pennants.forEach((p, i) => {
      this.bunting.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
      this.bunting.setColorAt(i, new THREE.Color(palette[i % palette.length]));
    });
    this.pennantBase = pennants;
    d.add(this.bunting);

    // Kıçta Türk bayrağı
    this.flag = makeTurkishFlag(2.4);
    this.flag.object.position.set(0, SHIP.upperDeck, 13.2);
    this.flag.object.rotation.y = Math.PI / 2;
    d.add(this.flag.object);

    // Kıç dalgası (köpük izi)
    this.wake = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 90),
      new THREE.MeshBasicMaterial({ map: glowTexture(5), color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false }),
    );
    this.wake.rotation.x = -Math.PI / 2;
    this.wake.position.set(0, 0.06, 60);
    this.group.add(this.wake);
  }

  /** Kaptanın adını bacaya yazar */
  setCaptain(name: string | null, color = '#f2b21b'): void {
    const mat = this.funnelBand.material;
    mat.map?.dispose();
    if (!name) {
      mat.map = null;
      mat.color.set('#f2b21b');
      mat.emissive.set('#000000');
    } else {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 72px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const x of [256, 768]) ctx.fillText(`⚓ ${name}`, x, 68, 480);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.color.set('#ffffff');
      mat.emissive.set('#331a00');
    }
    mat.needsUpdate = true;
  }


  /** speedFactor: 0 = duruyor, 1 = tam yol (köpük izi buna göre) */
  update(dt: number, speedFactor = 1): void {
    this.time += dt;
    const t = this.time;
    // Hafif yalpalama
    this.deck.rotation.z = Math.sin(t * 0.7) * 0.012;
    this.deck.rotation.x = Math.sin(t * 0.5 + 1) * 0.008;
    this.deck.position.y = Math.sin(t * 0.9) * 0.08;

    // Süs bayrakları rüzgârda sallanır
    const m = new THREE.Matrix4();
    const r = new THREE.Matrix4();
    this.pennantBase.forEach((p, i) => {
      r.makeRotationY(Math.PI / 2).multiply(new THREE.Matrix4().makeRotationX(0.35 + Math.sin(t * 5 + i) * 0.25));
      m.makeTranslation(p.x, p.y, p.z).multiply(r);
      this.bunting.setMatrixAt(i, m);
    });
    this.bunting.instanceMatrix.needsUpdate = true;
    this.flag.update(dt);

    (this.wake.material as THREE.MeshBasicMaterial).opacity = (0.38 + Math.sin(t * 1.3) * 0.05) * speedFactor;
  }
}
