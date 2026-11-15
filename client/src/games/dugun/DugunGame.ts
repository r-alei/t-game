/**
 * DÜĞÜN VAR!
 * Mahalle düğünü. Yorum yazan halaya girer; beğeni davulu hızlandırır, çok hızlanırsa halay kopar.
 * Gelinlik, damatlık ve mendil ucuz hediyelerle elden ele geçer. Düğün sonunda o anki gelin ve
 * damat gelin arabasına biner. Kaynana ara sıra müziği keser.
 *
 * Bu dosya yönetir: olay → halaycı + an + kamera; tempo, düğün döngüsü ve kaynana.
 * Figürler dancers.ts, sahne world.ts, ekran yazıları hud.ts içinde.
 */
import * as THREE from 'three';
import type { GiftEvent, LiveEvent, Viewer } from '../../../../shared/events.ts';
import { tierOf } from '../../../../shared/gifts.ts';
import type { Game, GameContext } from '../Game.ts';
import { Director, type Pose, type Shot } from '../../engine/director.ts';
import { Confetti, Floaters } from '../../engine/particles.ts';
import { Dancer, Ring, type Beat } from './dancers.ts';
import { SPOTS, WeddingCar, World } from './world.ts';
import { Hud } from './hud.ts';
import { RING, TEMPO, TIMING, momentFor, type MomentId } from './config.ts';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const pose = (pos: THREE.Vector3, look: THREE.Vector3): Pose => ({ pos, look });
const rand = (a: number, b: number) => a + Math.random() * (b - a);

const GELIN_SPOT = v(-0.8, 0, 0.6);
const DAMAT_SPOT = v(0.8, 0, 0.6);

type RoleName = 'gelin' | 'damat';

interface Throne {
  dancer: Dancer;
  since: number;
}

interface WeddingRecord {
  viewer: Viewer;
  gelin: number;
  damat: number;
}

type Kaynana =
  | { state: 'wander'; next: number }
  | { state: 'toMusic'; until: number }
  | { state: 'scold'; until: number };

interface FlyingCoin {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: Dancer;
  t: number;
}

export class DugunGame implements Game {
  private ctx!: GameContext;
  private world!: World;
  private car!: WeddingCar;
  private director!: Director;
  private hud!: Hud;
  private confetti!: Confetti;
  private floaters!: Floaters;
  private ring!: Ring;
  private dancers = new Map<string, Dancer>();
  private npcs: Dancer[] = [];
  private thrones!: Record<RoleName, Throne>;
  private records = new Map<string, WeddingRecord>();
  private halaybasi: Dancer | null = null;
  private davulcu!: Dancer;
  private zurnaci!: Dancer;
  private kaynana!: Dancer;
  private kaynanaState: Kaynana = { state: 'wander', next: 0 };
  private nextScold = 0;
  private coins: FlyingCoin[] = [];
  private now = 0;
  private bpm: number = TEMPO.base;
  private beatCount = 0;
  private brokenUntil = 0;
  private lastLiker: Viewer | null = null;
  private elapsed = 0;
  private carPhase: { t: number } | null = null;
  private damatInAir = false;
  private hudTimer = 0;

  start(ctx: GameContext): void {
    this.ctx = ctx;
    const { scene, camera } = ctx.stage;
    camera.fov = 42;
    camera.far = 700;
    camera.updateProjectionMatrix();
    ctx.stage.renderer.toneMappingExposure = 1.0;

    this.world = new World(scene);
    this.car = new WeddingCar(scene);
    this.confetti = new Confetti(scene);
    this.floaters = new Floaters(scene);
    this.ring = new Ring();
    this.dancers = new Map();
    this.npcs = [];
    this.records = new Map();
    this.coins = [];
    this.halaybasi = null;
    this.now = 0;
    this.bpm = TEMPO.base;
    this.beatCount = 0;
    this.brokenUntil = 0;
    this.elapsed = 0;
    this.carPhase = null;
    this.damatInAir = false;

    this.davulcu = this.spawnNpc('davulcu', SPOTS.musicians.clone().add(v(-1, 0, 0)));
    this.zurnaci = this.spawnNpc('zurnaci', SPOTS.musicians.clone().add(v(1.2, 0, 0)));
    for (const m of [this.davulcu, this.zurnaci]) m.facing = -0.5;
    this.kaynana = this.spawnNpc('kaynana', v(-8, 0, -6));
    this.kaynanaState = { state: 'wander', next: 0 };
    this.nextScold = rand(...TIMING.kaynanaEvery);

    this.thrones = {
      gelin: { dancer: this.spawnNpc('gelin', GELIN_SPOT.clone()), since: 0 },
      damat: { dancer: this.spawnNpc('damat', DAMAT_SPOT.clone()), since: 0 },
    };
    this.fillNpcs();

    this.director = new Director(camera, this.idleShots());
    this.hud = new Hud(ctx.hud);
    this.refreshHud(true);
  }

  // ------------------------------------------------------------------ olaylar

  onEvent(e: LiveEvent): void {
    switch (e.type) {
      case 'comment': {
        const { dancer, joined } = this.join(e.viewer);
        dancer.say(e.text, this.now);
        const talking = this.everyone().filter((d) => d.bubbleAt > this.now).sort((a, b) => a.bubbleAt - b.bubbleAt);
        for (const d of talking.slice(0, Math.max(0, talking.length - 3))) d.hideBubble();
        if (joined && this.director.pending < 2) this.director.push(this.closeUp(dancer, 'katılım', 1, 3));
        break;
      }
      case 'like': {
        this.lastLiker = e.viewer;
        const d = this.dancers.get(e.viewer.id);
        if (d) d.lastActive = this.now;
        if (this.playing) this.bpm += e.count * TEMPO.perLike;
        break;
      }
      case 'follow':
      case 'share': {
        const d = this.dancers.get(e.viewer.id);
        if (d) {
          d.hop(this.now);
          d.wave(this.now);
          d.touch(this.now);
          this.floaters.spawn('HOOOP!', d.color, d.headWorld().add(v(0, 0.8, 0)));
        }
        break;
      }
      case 'gift':
        this.onGift(e);
        break;
    }
  }

  private onGift(e: GiftEvent): void {
    const { dancer: d } = this.join(e.viewer);
    d.touch(this.now, 12);
    this.hud.flash(e.giftId);
    this.play(momentFor(e.giftId, tierOf(e.value)), d, e);
  }

  private play(moment: MomentId, d: Dancer, e: GiftEvent): void {
    const name = e.viewer.name;
    switch (moment) {
      case 'ceyrek': {
        // Takı: çeyrek gelin ya da damada takılır (gerçek izleyici olana öncelik)
        const target = this.takiTarget(d);
        const n = Math.min(e.count, 10);
        for (let i = 0; i < n; i++) this.flyCoin(d, target, i * 0.12);
        const who = target === this.thrones.gelin.dancer ? 'geline' : 'damada';
        this.hud.announce(n > 1 ? `📢 ${name} ${who} ${n} çeyrek taktı!` : `📢 ${name} ${who} bir çeyrek taktı!`);
        if (this.director.pending < 2) this.director.push(this.coupleShot(2, 3.2));
        break;
      }
      case 'mendil': {
        if (!this.ring.has(d)) {
          // Gelin/damat halayda değil: mendil yerine coşar
          d.hop(this.now);
          this.hud.announce(`${name} mendili havaya fırlattı!`);
          break;
        }
        if (this.halaybasi && this.halaybasi !== d) {
          this.halaybasi.setMendil(false);
          this.halaybasi.pinnedTag = false;
        }
        this.halaybasi = d;
        this.ring.toHead(d);
        d.setMendil(true);
        d.pinnedTag = true;
        if (this.playing) this.bpm += 6;
        this.hud.announce(`🔴 Halaybaşı: ${name}!`);
        this.director.push(this.closeUp(d, 'halaybaşı', 3, 4));
        break;
      }
      case 'gelin':
      case 'damat':
        this.crown(moment, d);
        break;
      case 'havaya': {
        const damat = this.thrones.damat.dancer;
        if (damat.airborne || this.carPhase) {
          this.hud.announce(`${name}: damadı bir daha havaya atın!`);
          break;
        }
        damat.throwUp(rand(8, 11));
        this.damatInAir = true;
        for (let i = 0; i < 4; i++) {
          this.confetti.burst(v(rand(-3, 3), rand(5, 8), rand(-2, 2)), d.color, 120, { delay: i * 0.35 });
        }
        this.ctx.banner.show(e.viewer, 'damadı havaya attırdı! 🎉', 'Halaycılar damadı fırlatıyor');
        this.director.push(this.throwShot(damat, 4, 5));
        break;
      }
    }
  }

  /** Gelin ya da damat ol: eski sahibi kaynana tarafından halaya sürüklenir */
  private crown(role: RoleName, d: Dancer): void {
    const throne = this.thrones[role];
    const old = throne.dancer;
    const name = d.name;
    if (old === d) {
      d.wave(this.now, 3);
      this.hud.announce(role === 'gelin' ? `👰 ${name} gelinliği bırakmıyor!` : `🤵 ${name} damatlığı bırakmıyor!`);
      return;
    }
    const other: RoleName = role === 'gelin' ? 'damat' : 'gelin';
    // Gelin damat olmak isterse (ya da tersi) eski yerine isimsiz biri geçer
    if (this.thrones[other].dancer === d) {
      this.closeThrone(other);
      this.thrones[other] = { dancer: this.spawnNpc(other, (other === 'gelin' ? GELIN_SPOT : DAMAT_SPOT).clone().add(v(0, 0, -6))), since: this.now };
      this.thrones[other].dancer.walkTo(other === 'gelin' ? GELIN_SPOT : DAMAT_SPOT, 2);
    }

    this.closeThrone(role);
    this.dethrone(old);

    if (this.ring.has(d)) this.ring.remove(d);
    if (this.halaybasi === d) {
      d.setMendil(false);
      this.halaybasi = null;
    }
    d.dress(role);
    d.pinnedTag = true;
    d.walkTo(role === 'gelin' ? GELIN_SPOT : DAMAT_SPOT, 1.6);
    this.thrones[role] = { dancer: d, since: this.now };
    this.confetti.burst((role === 'gelin' ? GELIN_SPOT : DAMAT_SPOT).clone().add(v(0, 3, 0)), d.color, 90);
    this.hud.announce(role === 'gelin' ? `👰 Yeni gelin: ${name}!` : `🤵 Yeni damat: ${name}!`);
    this.refreshHud(false, role);
    this.director.push(this.closeUp(d, role, 3, 4));
  }

  /** Tahttan inen: gerçek izleyiciyse kaynana kolundan tutup halaya sürükler; isimsizse halaya karışır */
  private dethrone(old: Dancer): void {
    old.dress('guest');
    old.clearCoins();
    old.pinnedTag = false;
    old.touch(this.now, 4);
    this.ring.add(old);
    old.walkTo(this.ring.tailPoint(), 1.8);
    if (old.isNpc) {
      this.npcs.push(old);
      this.trimNpcs();
    }
    if (old.viewer && this.kaynanaState.state === 'wander') {
      const k = this.kaynana;
      k.walkTo(this.ring.tailPoint().multiplyScalar(1.25), 1.8);
      k.say('Hadi bakalım, halaya!', this.now, { background: 'rgba(255,225,240,0.96)' });
      this.kaynanaState = { state: 'wander', next: this.now + 4 };
    }
  }

  /** Tahtta kalma süresini o düğünün rekorlarına yazar */
  private closeThrone(role: RoleName): void {
    const { dancer, since } = this.thrones[role];
    if (!dancer.viewer) return;
    const r = this.records.get(dancer.viewer.id) ?? { viewer: dancer.viewer, gelin: 0, damat: 0 };
    r[role] += this.now - since;
    this.records.set(dancer.viewer.id, r);
  }

  private takiTarget(giver: Dancer): Dancer {
    const g = this.thrones.gelin.dancer;
    const dm = this.thrones.damat.dancer;
    if (giver === g) return dm;
    if (giver === dm) return g;
    if (g.viewer && !dm.viewer) return g;
    if (dm.viewer && !g.viewer) return dm;
    return Math.random() < 0.5 ? g : dm;
  }

  private flyCoin(from: Dancer, to: Dancer, delay: number): void {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#f3cf55', metalness: 0.8, roughness: 0.25, emissive: '#6a5000' }),
    );
    mesh.visible = false;
    this.ctx.stage.scene.add(mesh);
    this.coins.push({ mesh, from: from.headWorld(), to, t: -delay });
  }

  // ------------------------------------------------------------------ halaycılar

  private get playing(): boolean {
    return this.now >= this.brokenUntil && this.kaynanaState.state !== 'scold';
  }

  private everyone(): Dancer[] {
    return [...this.ring.order, this.thrones.gelin.dancer, this.thrones.damat.dancer, this.kaynana, this.davulcu, this.zurnaci];
  }

  private spawnNpc(outfit: Parameters<Dancer['dress']>[0], at: THREE.Vector3): Dancer {
    const d = new Dancer(null, outfit);
    d.group.position.copy(at);
    this.ctx.stage.scene.add(d.group);
    return d;
  }

  /** İzleyiciyi halaya sokar (zaten varsa yalnız etiketini gösterir) */
  private join(viewer: Viewer): { dancer: Dancer; joined: boolean } {
    const existing = this.dancers.get(viewer.id);
    if (existing) {
      existing.touch(this.now);
      return { dancer: existing, joined: false };
    }
    if (this.ring.order.length >= RING.max) this.evict();
    const d = new Dancer(viewer);
    const entry = this.ring.tailPoint();
    d.group.position.copy(entry.clone().multiplyScalar(1.8));
    d.touch(this.now, TIMING.tagSeconds + 3);
    this.ctx.stage.scene.add(d.group);
    this.ring.add(d);
    d.walkTo(entry, 1.4);
    this.dancers.set(viewer.id, d);
    this.trimNpcs();
    return { dancer: d, joined: true };
  }

  /** Halka doluysa: önce isimsiz misafir, sonra en uzun süredir sessiz sıradan halaycı çıkar */
  private evict(): void {
    const victim =
      this.npcs[0] ??
      this.ring.order.filter((d) => d !== this.halaybasi).sort((a, b) => a.lastActive - b.lastActive)[0];
    if (!victim) return;
    this.removeDancer(victim);
  }

  private removeDancer(d: Dancer): void {
    this.ring.remove(d);
    this.npcs = this.npcs.filter((n) => n !== d);
    if (d.viewer) this.dancers.delete(d.viewer.id);
    if (this.halaybasi === d) this.halaybasi = null;
    d.dispose();
  }

  private fillNpcs(): void {
    while (this.ring.order.length < RING.minCrowd) {
      const d = this.spawnNpc('guest', this.ring.tailPoint());
      this.ring.add(d);
      this.npcs.push(d);
    }
  }

  private trimNpcs(): void {
    while (this.npcs.length && this.ring.order.length > RING.minCrowd) this.removeDancer(this.npcs[0]);
  }

  /** Tempo sınırı aşıldı: zincir kopar, herkes domino gibi yere yığılır */
  private breakHalay(): void {
    this.brokenUntil = this.now + TEMPO.fallenSeconds;
    this.bpm = TEMPO.base;
    // Zincirin başından sonuna doğru sırayla düşerler (domino)
    this.ring.order.forEach((d, i) => d.fall(this.now, TEMPO.fallenSeconds - i * 0.05, i * 0.06));
    for (const r of ['gelin', 'damat'] as const) {
      const d = this.thrones[r].dancer;
      if (!d.airborne) d.fall(this.now, TEMPO.fallenSeconds);
    }
    this.hud.announce('💥 HALAY KOPTU!');
    if (this.lastLiker) this.ctx.banner.show(this.lastLiker, 'halayı kopardı! 💥', 'Davul çok hızlandı, herkes yerde');
    this.director.addShake(0.5);
    this.director.push(this.topShot(4, 5));
  }

  // ------------------------------------------------------------------ kaynana

  private updateKaynana(): void {
    const k = this.kaynana;
    const s = this.kaynanaState;
    if (this.carPhase) return;
    if (s.state === 'wander') {
      if (this.now >= this.nextScold && !k.busy) {
        // Çalgıcılara yürür, müziği keser
        k.walkTo(SPOTS.musicians.clone().add(v(-2.2, -0.5, 2.2)), 2.4);
        this.kaynanaState = { state: 'toMusic', until: this.now + 2.4 };
      } else if (this.now >= s.next && !k.busy) {
        // Halkanın arka tarafında volta atar
        const a = rand(Math.PI * 0.6, Math.PI * 1.4);
        const r = this.ring.radius + 3;
        k.walkTo(v(Math.sin(a) * r, 0, Math.cos(a) * r), rand(2.5, 4));
        this.kaynanaState = { state: 'wander', next: this.now + rand(5, 9) };
      }
    } else if (s.state === 'toMusic' && this.now >= s.until) {
      k.facing = 0;
      const lines = ['Yeter bu kadar oynadınız!', 'Kısın şu davulu!', 'Gelin hâlâ oturmadı!', 'Bu ne gürültü böyle?!'];
      k.say(lines[Math.floor(Math.random() * lines.length)], this.now, { background: 'rgba(255,225,240,0.96)' });
      this.kaynanaState = { state: 'scold', until: this.now + TIMING.kaynanaStopSeconds };
      this.hud.announce('🤬 Kaynana müziği kesti!');
      this.director.push(this.closeUp(k, 'kaynana', 3, TIMING.kaynanaStopSeconds));
    } else if (s.state === 'scold' && this.now >= s.until) {
      this.nextScold = this.now + rand(...TIMING.kaynanaEvery);
      this.kaynanaState = { state: 'wander', next: this.now + 1 };
      this.hud.announce('🥁 Davul geri döndü!');
    }
  }

  // ------------------------------------------------------------------ düğün döngüsü

  private updateWedding(dt: number): void {
    if (this.carPhase) {
      const c = this.carPhase;
      c.t += dt;
      const g = this.thrones.gelin.dancer;
      const dm = this.thrones.damat.dancer;
      if (c.t >= 3 && c.t - dt < 3) {
        g.walkTo(SPOTS.car.clone().add(v(-0.6, 0, 1.4)), 2);
        dm.walkTo(SPOTS.car.clone().add(v(0.6, 0, 1.4)), 2);
      }
      if (c.t >= 5.5 && c.t - dt < 5.5) {
        // Arabaya bindiler
        g.group.visible = false;
        dm.group.visible = false;
        for (let i = 0; i < 5; i++) this.confetti.burst(SPOTS.car.clone().add(v(rand(-3, 3), rand(3, 6), rand(-1, 2))), i % 2 ? '#e01b4c' : '#ffffff', 120, { delay: i * 0.3 });
      }
      if (c.t >= 8 && c.t - dt < 8) this.car.leave();
      if (c.t >= TIMING.carSeconds) this.newWedding();
      return;
    }
    this.elapsed += dt;
    const left = TIMING.weddingSeconds - this.elapsed;
    this.hud.setCountdown(left <= TIMING.countdownSeconds && left > 0 ? left : null);
    if (left <= 0) this.endWedding();
  }

  private endWedding(): void {
    this.closeThrone('gelin');
    this.closeThrone('damat');
    const g = this.thrones.gelin.dancer;
    const dm = this.thrones.damat.dancer;
    const label = (d: Dancer, fallback: string) => d.viewer?.name ?? fallback;
    this.car.arrive(`${label(g, 'Gelin')} ♥ ${label(dm, 'Damat')}`);
    this.carPhase = { t: 0 };
    this.hud.setCountdown(null);

    const best = (role: RoleName) => [...this.records.values()].sort((a, b) => b[role] - a[role])[0];
    const bg = best('gelin');
    const bd = best('damat');
    const parts: string[] = [];
    if (bg && bg.gelin > 0) parts.push(`En uzun gelin: ${bg.viewer.name} ${mmss(bg.gelin)}`);
    if (bd && bd.damat > 0) parts.push(`En uzun damat: ${bd.viewer.name} ${mmss(bd.damat)}`);
    const couple: Viewer = { id: 'cift', name: `${label(g, 'Gelin')} & ${label(dm, 'Damat')}`, avatar: '' };
    this.ctx.banner.show(couple, 'evlendi! 💍', parts.join(' · ') || 'Gelin arabası yola çıkıyor', 5000);
    this.hud.announce('🚗 Gelin arabası geldi!');
    this.director.push(this.carShot(4, TIMING.carSeconds));
  }

  /** Yeni düğün: arabaya binenler halaya döner, gelin ve damat yeniden isimsiz */
  private newWedding(): void {
    for (const role of ['gelin', 'damat'] as const) {
      const d = this.thrones[role].dancer;
      d.group.visible = true;
      if (d.viewer) {
        d.group.position.copy(this.ring.tailPoint().multiplyScalar(1.6));
        this.dethrone(d);
      } else {
        d.dispose();
      }
      this.thrones[role] = { dancer: this.spawnNpc(role, (role === 'gelin' ? GELIN_SPOT : DAMAT_SPOT).clone()), since: this.now };
    }
    this.records.clear();
    this.elapsed = 0;
    this.carPhase = null;
    this.hud.announce('💃 Yeni düğün başladı!');
    this.refreshHud(true);
  }

  // ------------------------------------------------------------------ kamera

  private idleShots(): Shot[] {
    const idle = (name: string, duration: number, f: (t: number) => Pose): Shot => ({ name, priority: 0, duration, pose: f });
    const R = () => this.ring.radius;
    return [
      // Dikey ekranda yatay açı dar (~25°): halkanın tamamı için uzaktan bakılır
      idle('ön geniş', 9, (t) => pose(v(Math.sin(t * 0.08) * 4, 8 + R() * 0.5, R() * 2 + 11), v(0, -0.6, -0.5))),
      idle('kuşbakışı', 8, (t) => pose(v(Math.sin(t * 0.1) * 2, 16 + R() * 2.2, 6 + R() * 0.6), v(0, 0, -0.5))),
      idle('halka içi', 9, (t) => {
        const a = 0.6 - t * 0.09;
        const r = R() + 6;
        return pose(v(Math.sin(a) * r, 3.2, Math.cos(a) * r), v(0, 1.4, 0));
      }),
      idle('gelin damat', 7, (t) => pose(v(-1 + t * 0.25, 5.5, R() + 6), v(0, 1.2, 0.6))),
      idle('çalgıcılar', 7, (t) => pose(SPOTS.musicians.clone().add(v(-5 + t * 0.3, 3, 8)), SPOTS.musicians.clone().add(v(0, 1.4, 0)))),
    ];
  }

  private closeUp(d: Dancer, name: string, priority: number, duration: number): Shot {
    return {
      name,
      priority,
      duration,
      focus: d,
      pose: (t) => {
        const head = d.headWorld();
        // Halkadakine dışarıdan, ortadakine (gelin/damat) halkanın üstünden bakılır:
        // aradaki halaycılar kadrajı kapatmasın
        const flat = v(head.x, 0, head.z);
        const inner = flat.length() < 2;
        const dir = inner ? v(0, 0, 1) : flat.normalize().multiplyScalar(0.6).add(v(0, 0, 0.8)).normalize();
        dir.applyAxisAngle(v(0, 1, 0), -0.2 + t * 0.08);
        const dist = inner ? this.ring.radius + 7 : 9;
        const lift = inner ? 5.5 : 3;
        return pose(head.clone().addScaledVector(dir, dist).add(v(0, lift, 0)), head.clone().add(v(0, -0.4, 0)));
      },
    };
  }

  private coupleShot(priority: number, duration: number): Shot {
    return { name: 'takı', priority, duration, pose: (t) => pose(v(1.5 - t * 0.3, 5, this.ring.radius + 5), v(0, 1.1, 0.6)) };
  }

  private throwShot(d: Dancer, priority: number, duration: number): Shot {
    return { name: 'havaya', priority, duration, cut: true, focus: d, pose: () => {
      const head = d.headWorld();
      return pose(v(0, 3, 16), v(head.x * 0.5, Math.max(2, head.y * 0.75), 0));
    } };
  }

  private topShot(priority: number, duration: number): Shot {
    return { name: 'halay koptu', priority, duration, cut: true, pose: (t) => pose(v(0, 14 + this.ring.radius * 1.6 - t * 0.6, 10 + this.ring.radius), v(0, 0, 0)) };
  }

  private carShot(priority: number, duration: number): Shot {
    return { name: 'gelin arabası', priority, duration, pose: (t) => {
      const car = this.car.group.position;
      // Halkanın üstünden: öndeki halaycılar arabayı kapatmasın
      return pose(v(car.x * 0.4 + 2, 10 + this.ring.radius * 0.6, SPOTS.car.z + this.ring.radius + 14 - t * 0.2), v(car.x * 0.7, 0.6, SPOTS.car.z));
    } };
  }

  // ------------------------------------------------------------------ döngü

  update(dt: number): void {
    this.now += dt;

    // Tempo: dinlenme hızına yavaşça döner; sınırı geçerse halay kopar
    if (this.bpm > TEMPO.base) this.bpm = Math.max(TEMPO.base, this.bpm - TEMPO.decay * dt * (1 + (this.bpm - TEMPO.base) / 40));
    if (this.bpm >= TEMPO.breakAt && this.now >= this.brokenUntil) this.breakHalay();
    const playing = this.playing;
    if (playing) this.beatCount += (dt * this.bpm) / 60;
    const beat: Beat = { count: this.beatCount, playing, heat: Math.max(0, Math.min(1, (this.bpm - TEMPO.base) / (TEMPO.breakAt - TEMPO.base))) };

    this.updateKaynana();
    this.updateWedding(dt);

    this.ring.update(dt, beat, this.bpm / 60);
    const focus = (this.director.focus as Dancer | null) ?? null;
    for (const d of this.everyone()) d.update(dt, this.now, beat, focus);
    // Gelin ve damat kameraya bakar, halkanın ortasında oynar
    for (const r of ['gelin', 'damat'] as const) {
      const d = this.thrones[r].dancer;
      if (!d.busy) d.facing = 0;
    }

    // Damat yere indi mi? Bazen tutamazlar
    const damat = this.thrones.damat.dancer;
    if (this.damatInAir && !damat.airborne) {
      this.damatInAir = false;
      if (Math.random() < 0.35) {
        damat.fall(this.now, 2.5);
        this.hud.announce('😱 Damadı tutamadılar!');
      } else {
        damat.hop(this.now);
        this.hud.announce('🙌 Damat sağ salim indi!');
      }
    }

    this.updateCoins(dt);
    this.world.update(dt);
    this.car.update(dt);
    this.confetti.update(dt);
    this.floaters.update(dt);
    this.director.update(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.25;
      this.refreshHud(false);
    }
  }

  private updateCoins(dt: number): void {
    this.coins = this.coins.filter((c) => {
      c.t += dt;
      if (c.t < 0) return true;
      const k = Math.min(1, c.t / 0.7);
      const to = c.to.headWorld().add(v(0, -0.4, 0.3));
      c.mesh.visible = true;
      c.mesh.position.lerpVectors(c.from, to, k);
      c.mesh.position.y += Math.sin(k * Math.PI) * 2;
      c.mesh.rotation.y += dt * 14;
      if (k < 1) return true;
      c.to.pinCoin();
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
      c.mesh.removeFromParent();
      return false;
    });
  }

  private refreshHud(all: boolean, swapped?: RoleName): void {
    for (const r of ['gelin', 'damat'] as const) {
      const { dancer, since } = this.thrones[r];
      this.hud.setRole(r, dancer.viewer, this.now - since, swapped === r);
    }
    this.hud.setTempo(this.bpm, this.playing);
    this.hud.setClock(TIMING.weddingSeconds - this.elapsed);
    if (all) this.hud.setCountdown(null);
  }

  reset(): void {
    this.hud.dispose();
    this.ctx.stage.clear();
    this.start(this.ctx);
  }

  dispose(): void {
    this.hud.dispose();
    this.ctx.stage.clear();
  }
}

function mmss(s: number): string {
  const x = Math.max(0, Math.floor(s));
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
}
