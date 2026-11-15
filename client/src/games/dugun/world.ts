/**
 * Mahalle meydanı, ikindi vakti. Ortada halay alanı; arkada çalgıcı sahnesi ve evler,
 * yanlarda beyaz örtülü masalar, tepede süs bayrakları ve ampul zincirleri.
 * Gündüz: telefonda isimler ve yüzler okunur kalsın.
 */
import * as THREE from 'three';
import { createTextSprite, disposeSprite } from '../../engine/textSprite.ts';

const mat = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });

export const SPOTS = {
  /** Çalgıcıların durduğu sahne (halkanın hemen arkası, biraz sağda: dikey kadraja sığsın) */
  musicians: new THREE.Vector3(4.2, 0.5, -13),
  /** Gelin arabasının durduğu yer (halkanın arkası) */
  car: new THREE.Vector3(-3, 0, -9.2),
};

export class World {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  private readonly bunting: THREE.Group[] = [];
  private t = 0;

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color('#9fcbec');
    scene.fog = new THREE.Fog('#d9e6ef', 45, 120);

    // Gök: alttan açık, üstten mavi
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'varying vec3 d; void main(){ float h = clamp(d.y,0.,1.); gl_FragColor = vec4(mix(vec3(.96,.9,.82), vec3(.36,.62,.88), pow(h,.6)), 1.); }',
      }),
    );
    sky.renderOrder = -10;
    this.group.add(sky);

    this.group.add(new THREE.HemisphereLight('#fff6e8', '#8a7a62', 1.25));
    // İkindi güneşi: kameranın sol arkasından, yüzleri önden aydınlatır
    this.sun = new THREE.DirectionalLight('#fff0d8', 2.4);
    this.sun.position.set(-18, 26, 22);
    this.sun.castShadow = true;
    // Gölge kutusu tüm meydanı (yan evler, masalar, sahne) kapsar; kenarda kesik gölge çizgisi olmasın
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -32; c.right = 32; c.top = 32; c.bottom = -32; c.near = 1; c.far = 100;
    this.sun.shadow.normalBias = 0.04;
    this.group.add(this.sun, this.sun.target);

    this.buildGround();
    this.buildHouses();
    this.buildTables();
    this.buildStage();
    this.buildBunting();
    this.buildTrees();
    scene.add(this.group);
  }

  private buildGround(): void {
    // Toprak meydan + ortada taş döşeli halay alanı
    const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48), mat('#cbb48a', 1));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#d9cdb6';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const l = 70 + Math.random() * 14;
        g.fillStyle = `hsl(35, 18%, ${l}%)`;
        g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 32 + 1, 30, 30);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(10.5, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.03;
    (floor.material as THREE.MeshStandardMaterial).polygonOffset = true;
    (floor.material as THREE.MeshStandardMaterial).polygonOffsetFactor = -2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private buildHouses(): void {
    // Arkada ve yanlarda kiremit çatılı pastel evler
    const walls = ['#f3dcc0', '#e9c9c9', '#d8e3c8', '#f5e6a8', '#cfdbe8', '#f0d2b0'];
    const roof = mat('#b4532f', 0.9);
    const windowMat = mat('#4b6a86', 0.4);
    const place = (x: number, z: number, rotY: number, i: number) => {
      const w = 6 + (i % 3) * 1.5;
      const h = 6 + ((i * 7) % 4) * 1.6;
      const d = 6;
      const house = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(walls[i % walls.length], 0.95));
      body.position.y = h / 2;
      body.castShadow = body.receiveShadow = true;
      const top = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.6, 4), roof);
      top.position.y = h + 1.3;
      top.rotation.y = Math.PI / 4;
      top.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
      house.add(body, top);
      for (let fy = 2.2; fy < h - 1; fy += 2.6) {
        for (let fx = -w / 2 + 1.4; fx < w / 2 - 0.8; fx += 2) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), windowMat);
          win.position.set(fx + 0.3, fy, d / 2 + 0.03);
          house.add(win);
        }
      }
      house.position.set(x, 0, z);
      house.rotation.y = rotY;
      this.group.add(house);
    };
    let i = 0;
    for (let x = -30; x <= 30; x += 8.5) place(x, -30 - (i % 2) * 2, 0, i++);
    // Yan sıralar: z≈-9'da sokak ağzı boş kalır, gelin arabası evlerin içinden geçmesin
    for (const z of [-22, -0.5, 8.5]) {
      place(-27, z, Math.PI / 2, i++);
      place(27, z, -Math.PI / 2, i++);
    }
    // Çalgıcı sahnesinin arka bezine asılı "HOŞ GELDİNİZ" pankartı. Sprite değil düz levha:
    // kameraya dönmez, uzaktaki evin tepesinde (başlığın arkasında) kalmaz.
    const sprite = createTextSprite('HOŞ GELDİNİZ', { color: '#b3141b', background: '#fff8ea', font: '900 90px Segoe UI, sans-serif', height: 0.8, padding: 26 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sprite.scale.x, sprite.scale.y), new THREE.MeshBasicMaterial({ map: sprite.material.map, transparent: true }));
    sprite.material.dispose();
    sign.position.set(SPOTS.musicians.x, 3.25, SPOTS.musicians.z - 1.95);
    this.group.add(sign);
  }

  private buildTables(): void {
    const cloth = mat('#fbfbf7', 0.9);
    const chair = mat('#c8202a', 0.6);
    const leg = mat('#777', 0.5);
    const bottle = new THREE.MeshStandardMaterial({ color: '#d84a2a', roughness: 0.4 });
    const add = (x: number, z: number) => {
      const t = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.9, 20), cloth);
      top.position.y = 0.45;
      top.castShadow = top.receiveShadow = true;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8), bottle);
      b.position.y = 1.07;
      t.add(top, b);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        const ch = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chair);
        seat.position.y = 0.5;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.06), chair);
        back.position.set(0, 0.82, 0.26);
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), leg);
        l.position.y = 0.25;
        ch.add(seat, back, l);
        ch.position.set(Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7);
        ch.rotation.y = -a + Math.PI / 2;
        t.add(ch);
      }
      t.position.set(x, 0, z);
      this.group.add(t);
    };
    for (const z of [-6, -1, 4]) {
      add(-15, z);
      add(15, z);
    }
    for (const x of [-11, -5]) add(x, -15.5);
  }

  private buildStage(): void {
    // Çalgıcı sahnesi: alçak tahta platform + arka bez
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 4), mat('#8a5a34', 0.8));
    deck.position.set(SPOTS.musicians.x, 0.25, SPOTS.musicians.z);
    deck.castShadow = deck.receiveShadow = true;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.6), new THREE.MeshStandardMaterial({ color: '#c8202a', side: THREE.DoubleSide }));
    back.position.set(SPOTS.musicians.x, 2.3, SPOTS.musicians.z - 2);
    back.receiveShadow = true;
    // Bez havada durmasın: iki direğe gerili
    const poleMat = mat('#6b4a2e');
    for (const sx of [-3.05, 3.05]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), poleMat);
      p.position.set(SPOTS.musicians.x + sx, 2.1, SPOTS.musicians.z - 2);
      p.castShadow = true;
      this.group.add(p);
    }
    this.group.add(deck, back);
  }

  private buildBunting(): void {
    // Direkler ve aralarına gerili süs bayrakları; halkanın üstünden çapraz geçer
    const pole = mat('#6b4a2e');
    const poles = [
      new THREE.Vector3(-12, 0, -11), new THREE.Vector3(12, 0, -11),
      new THREE.Vector3(-12, 0, 9), new THREE.Vector3(12, 0, 9),
    ];
    for (const p of poles) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 8, 8), pole);
      m.position.set(p.x, 4, p.z);
      m.castShadow = true;
      this.group.add(m);
    }
    const colors = ['#e30a17', '#ffffff', '#ffd25e', '#2f7fd8', '#33c27a', '#ff6fb1'];
    const flagGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.28, 0, 0, 0.28, 0, 0, 0, -0.55, 0], 3));
    flagGeo.computeVertexNormals();
    const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff2b8' });
    const ropeMat = mat('#f4efe4', 0.9);
    const line = (a: THREE.Vector3, b: THREE.Vector3, sag: number) => {
      const g = new THREE.Group();
      const at = (k: number) => {
        const p = a.clone().lerp(b, k);
        p.y = 7.6 - Math.sin(k * Math.PI) * sag;
        return p;
      };
      // Bayrakların asılı olduğu ip: direk tepesinden direk tepesine
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 16; k++) pts.push(at(k / 16));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.025, 4), ropeMat));
      const n = Math.round(a.distanceTo(b) / 0.8);
      for (let i = 1; i < n; i++) {
        const k = i / n;
        const p = at(k);
        const f = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide }));
        f.position.copy(p);
        f.lookAt(p.x + (b.z - a.z), p.y, p.z - (b.x - a.x));
        f.userData.phase = i * 0.7;
        g.add(f);
        if (i % 3 === 0) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbMat);
          // Ampul iki bayrağın arasında, ipin üstünde
          bulb.position.copy(at((i + 0.5) / n)).add(new THREE.Vector3(0, -0.05, 0));
          g.add(bulb);
        }
      }
      this.bunting.push(g);
      this.group.add(g);
    };
    line(poles[0], poles[3], 2.2);
    line(poles[1], poles[2], 2.2);
    line(poles[0], poles[1], 1.2);
    line(poles[0], poles[2], 1.4);
    line(poles[1], poles[3], 1.4);
  }

  private buildTrees(): void {
    const trunk = mat('#6b4a2e');
    const leaves = mat('#4f8a3a', 0.9);
    for (const [x, z] of [[-20, -16], [20, -18], [-21, 12], [21, 13], [-9, -22], [11, -23]]) {
      const t = new THREE.Group();
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), trunk);
      tr.position.y = 1.5;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1), leaves);
      crown.position.y = 4.3;
      tr.castShadow = crown.castShadow = true;
      t.add(tr, crown);
      t.position.set(x, 0, z);
      this.group.add(t);
    }
  }

  update(dt: number): void {
    this.t += dt;
    for (const g of this.bunting) {
      for (const f of g.children) {
        if (f.userData.phase !== undefined) f.rotation.x = Math.sin(this.t * 2.4 + f.userData.phase) * 0.25;
      }
    }
  }
}

/** Gelin arabası: beyaz araba, kaputta kurdele, plakada çiftin adı. Soldan girer, durur, sağdan çıkar. */
export class WeddingCar {
  readonly group = new THREE.Group();
  private plate: THREE.Sprite | null = null;
  private phase: 'off' | 'in' | 'wait' | 'out' = 'off';
  private t = 0;

  constructor(scene: THREE.Scene) {
    const white = mat('#f7f7f4', 0.35);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 1.9), white);
    body.position.y = 0.85;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.7), white);
    cabin.position.set(-0.2, 1.75, 0);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.55, 1.72), new THREE.MeshStandardMaterial({ color: '#3d5872', roughness: 0.2 }));
    glass.position.set(-0.2, 1.8, 0);
    const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14).rotateX(Math.PI / 2);
    const tire = mat('#1b1b1b');
    for (const [x, z] of [[1.4, 0.95], [-1.4, 0.95], [1.4, -0.95], [-1.4, -0.95]]) {
      const w = new THREE.Mesh(wheel, tire);
      w.position.set(x, 0.42, z);
      this.group.add(w);
    }
    // Kaputta kırmızı kurdele ve çiçek
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.06, 0.25), mat('#e01b4c', 0.5));
    ribbon.position.y = 1.37;
    const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(0.22, 0.07, 32, 6), mat('#e01b4c', 0.5));
    bow.position.set(1.4, 1.55, 0);
    body.castShadow = cabin.castShadow = true;
    this.group.add(body, cabin, glass, ribbon, bow);
    this.group.visible = false;
    scene.add(this.group);
  }

  get busy(): boolean {
    return this.phase !== 'off';
  }

  arrive(names: string): void {
    if (this.plate) disposeSprite(this.plate);
    this.plate = createTextSprite(names, { color: '#b3141b', background: '#ffffff', font: '900 80px Segoe UI, sans-serif', height: 0.9, padding: 20 });
    this.plate.position.set(0, 3.0, 0);
    this.group.add(this.plate);
    this.group.visible = true;
    this.group.position.set(SPOTS.car.x - 34, 0, SPOTS.car.z);
    this.phase = 'in';
    this.t = 0;
  }

  leave(): void {
    if (this.phase === 'wait') {
      this.phase = 'out';
      this.t = 0;
    }
  }

  update(dt: number): void {
    if (this.phase === 'off') return;
    this.t += dt;
    const p = this.group.position;
    if (this.phase === 'in') {
      const k = Math.min(1, this.t / 3);
      p.x = SPOTS.car.x - 34 * (1 - k) * (1 - k);
      if (k >= 1) this.phase = 'wait';
    } else if (this.phase === 'out') {
      p.x = SPOTS.car.x + this.t * this.t * 4;
      if (p.x > 60) {
        this.phase = 'off';
        this.group.visible = false;
      }
    }
  }
}
