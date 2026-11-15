/**
 * DÜĞÜN VAR!
 * Mahalle düğünü. Yorum yazan halaya girer; beğeni davulu hızlandırır, çok hızlanırsa halay kopar.
 * Gelinlik, damatlık ve mendil ucuz hediyelerle elden ele geçer. Düğün sonunda o anki gelin ve
 * damat gelin arabasına biner. Kaynana rolünü alan izleyici ara sıra müziği keser.
 *
 * Bu dosya yönetir: olay → halaycı + an + kamera; tempo, düğün döngüsü ve kaynana.
 * Figürler dancers.ts, sahne world.ts, ekran yazıları hud.ts içinde.
 */
import * as THREE from 'three';
import type { GiftEvent, LiveEvent, Viewer } from '../../../../shared/events.ts';
import type { Game, GameContext } from '../Game.ts';
import { Director, type Pose, type Shot } from '../../engine/director.ts';
import { Confetti, Floaters } from '../../engine/particles.ts';
import { Dancer, Ring, type Beat } from './dancers.ts';
import { SPOTS, WeddingCar, World } from './world.ts';
import { Hud } from './hud.ts';
import { SCREEN } from '../../engine/layout.ts';
import { TEMPO, TIMING, momentFor, type MomentId } from './config.ts';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const pose = (pos: THREE.Vector3, look: THREE.Vector3): Pose => ({ pos, look });
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Bakış yönü + uzaklıktan kamera konumu (yaw 0 = önden, +z tarafından) */
const orbit = (look: THREE.Vector3, yaw: number, pitch: number, dist: number): Pose => ({
  pos: look.clone().add(v(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist)),
  look,
});

/**
 * Kameranın baktığı nokta ekranın ortasına değil, oyunun açık kalan bölgesinin ortasına düşer:
 * üstte başlık/kartlar/tempo (~y 480'e kadar), altta duyuru + çağrı ve TikTok yorumları,
 * sağda TikTok düğmeleri. Bakış noktası 1080×1920 karede bu noktaya kaydırılır.
 */
const FRAME_CENTER = { x: 470, y: 800 };

const GELIN_SPOT = v(-0.8, 0, 0.6);
const DAMAT_SPOT = v(0.8, 0, 0.6);

type RoleName = 'gelin' | 'damat';

interface Throne {
  dancer: Dancer | null;
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
  private thrones!: Record<RoleName, Throne>;
  private records = new Map<string, WeddingRecord>();
  private halaybasi: Dancer | null = null;
  private kaynana: Dancer | null = null;
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
  private flyingDamat: Dancer | null = null;
  private hudTimer = 0;

  start(ctx: GameContext): void {
    this.ctx = ctx;
    const { scene, camera } = ctx.stage;
    camera.fov = 44;
    camera.far = 700;
    camera.setViewOffset(SCREEN.width, SCREEN.height, SCREEN.width / 2 - FRAME_CENTER.x, SCREEN.height / 2 - FRAME_CENTER.y, SCREEN.width, SCREEN.height);
    camera.updateProjectionMatrix();
    ctx.stage.renderer.toneMappingExposure = 1.0;

    this.world = new World(scene);
    this.car = new WeddingCar(scene);
    this.confetti = new Confetti(scene);
    this.floaters = new Floaters(scene);
    this.ring = new Ring();
    this.dancers = new Map();
    this.records = new Map();
    this.coins = [];
    this.halaybasi = null;
    this.now = 0;
    this.bpm = TEMPO.base;
    this.beatCount = 0;
    this.brokenUntil = 0;
    this.elapsed = 0;
    this.carPhase = null;
    this.flyingDamat = null;

    this.kaynana = null;
    this.kaynanaState = { state: 'wander', next: 0 };
    this.thrones = {
      gelin: { dancer: null, since: 0 },
      damat: { dancer: null, since: 0 },
    };
    this.lastLiker = null;
    this.hudTimer = 0;

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
    const moment = momentFor(e);
    if (moment) this.play(moment, d, e);
  }

  private play(moment: MomentId, d: Dancer, e: GiftEvent): void {
    const name = e.viewer.name;
    switch (moment) {
      case 'ceyrek': {
        // Takı: çeyrek gelin ya da damada takılır (gerçek izleyici olana öncelik)
        const target = this.takiTarget(d);
        if (!target) {
          this.hud.announce(`${name} takı gönderdi! Gelin ve damat rolleri henüz boş.`);
          break;
        }
        const n = Math.min(e.count, 10);
        for (let i = 0; i < n; i++) this.flyCoin(d, target, i * 0.12);
        const who = target === this.thrones.gelin.dancer ? 'geline' : 'damada';
        this.hud.announce(n > 1 ? `📢 ${name} ${who} ${n} çeyrek taktı!` : `📢 ${name} ${who} bir çeyrek taktı!`);
        if (this.director.pending < 2) this.director.push(this.coupleShot(2, 3.2));
        break;
      }
      case 'mendil': {
        if (this.carPhase) {
          this.hud.announce('Final sürüyor; rol kapışması yeni düğünde açılacak.');
          break;
        }
        this.releaseRole(d);
        if (!this.ring.has(d)) this.dethrone(d);
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
      case 'kaynana': {
        if (this.carPhase) {
          this.hud.announce('Final sürüyor; rol kapışması yeni düğünde açılacak.');
          break;
        }
        if (this.kaynana === d) {
          d.wave(this.now, 3);
          break;
        }
        this.releaseRole(d);
        if (this.kaynana) this.dethrone(this.kaynana);
        this.ring.remove(d);
        this.clearLeader(d);
        this.kaynana = d;
        d.dress('kaynana');
        d.pinnedTag = true;
        d.walkTo(v(-8, 0, -6), 1.6);
        this.kaynanaState = { state: 'wander', next: this.now + 3 };
        this.nextScold = this.now + rand(...TIMING.kaynanaEvery);
        this.hud.announce(`Kaynana: ${name}!`);
        this.director.push(this.closeUp(d, 'kaynana', 3, 4));
        break;
      }
      case 'gelin':
      case 'damat':
        this.crown(moment, d);
        break;
      case 'havaya': {
        const damat = this.thrones.damat.dancer;
        if (!damat) {
          this.hud.announce('Damat rolü henüz boş: Gül ×20 ile damat ol!');
          break;
        }
        if (damat.airborne || this.carPhase) {
          this.hud.announce(`${name}: damadı bir daha havaya atın!`);
          break;
        }
        damat.throwUp(rand(8, 11));
        this.flyingDamat = damat;
        for (let i = 0; i < 4; i++) {
          this.confetti.burst(v(rand(-3, 3), rand(5, 8), rand(-2, 2)), d.color, 120, { delay: i * 0.35 });
        }
        this.ctx.banner.show(e.viewer, 'damadı havaya attırdı! 🎉', 'Halaycılar damadı fırlatıyor');
        this.director.push(this.throwShot(damat, 4, 5));
        break;
      }
    }
  }

  /** Gelin ya da damat ol: eski rol sahibi halaya döner. */
  private crown(role: RoleName, d: Dancer): void {
    if (this.carPhase) {
      this.hud.announce('Final sürüyor; rol kapışması yeni düğünde açılacak.');
      return;
    }
    const throne = this.thrones[role];
    const old = throne.dancer;
    const name = d.name;
    if (old === d) {
      d.wave(this.now, 3);
      this.hud.announce(role === 'gelin' ? `👰 ${name} gelinliği bırakmıyor!` : `🤵 ${name} damatlığı bırakmıyor!`);
      return;
    }
    this.releaseRole(d);
    this.closeThrone(role);
    if (old) this.dethrone(old);
    this.ring.remove(d);
    this.clearLeader(d);
    d.dress(role);
    d.pinnedTag = true;
    d.walkTo(role === 'gelin' ? GELIN_SPOT : DAMAT_SPOT, 1.6);
    this.thrones[role] = { dancer: d, since: this.now };
    this.confetti.burst((role === 'gelin' ? GELIN_SPOT : DAMAT_SPOT).clone().add(v(0, 3, 0)), d.color, 90);
    this.hud.announce(role === 'gelin' ? `👰 Yeni gelin: ${name}!` : `🤵 Yeni damat: ${name}!`);
    this.refreshHud(false, role);
    this.director.push(this.closeUp(d, role, 3, 4));
  }

  private clearLeader(d: Dancer): void {
    if (this.halaybasi !== d) return;
    d.setMendil(false);
    d.pinnedTag = false;
    this.halaybasi = null;
  }

  /** Bir izleyici aynı anda yalnız bir özel rol üstlenebilir. */
  private releaseRole(d: Dancer): void {
    for (const role of ['gelin', 'damat'] as const) {
      if (this.thrones[role].dancer !== d) continue;
      this.closeThrone(role);
      this.thrones[role] = { dancer: null, since: this.now };
    }
    if (this.kaynana === d) {
      this.kaynana = null;
      this.kaynanaState = { state: 'wander', next: 0 };
    }
  }

  /** Eski rol sahibi gerçek izleyici olarak halaya döner. */
  private dethrone(old: Dancer): void {
    old.group.visible = true;
    old.dress('guest');
    old.clearCoins();
    old.pinnedTag = false;
    old.touch(this.now, 4);
    if (!this.ring.has(old)) this.ring.add(old);
    old.walkTo(this.ring.tailPoint(), 1.8);
  }

  /** Tahtta kalma süresini o düğünün rekorlarına yazar */
  private closeThrone(role: RoleName): void {
    const { dancer, since } = this.thrones[role];
    if (!dancer?.viewer) return;
    const r = this.records.get(dancer.viewer.id) ?? { viewer: dancer.viewer, gelin: 0, damat: 0 };
    r[role] += this.now - since;
    this.records.set(dancer.viewer.id, r);
  }

  private takiTarget(giver: Dancer): Dancer | null {
    const candidates = [this.thrones.gelin.dancer, this.thrones.damat.dancer]
      .filter((d): d is Dancer => d !== null && d !== giver);
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
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
    return this.now >= this.brokenUntil && (!this.kaynana || this.kaynanaState.state !== 'scold');
  }

  private everyone(): Dancer[] {
    return [...this.dancers.values()];
  }

  /** İzleyiciyi halaya sokar (zaten varsa yalnız etiketini gösterir) */
  private join(viewer: Viewer): { dancer: Dancer; joined: boolean } {
    const existing = this.dancers.get(viewer.id);
    if (existing) {
      existing.touch(this.now);
      return { dancer: existing, joined: false };
    }
    const d = new Dancer(viewer);
    const entry = this.ring.tailPoint();
    d.group.position.copy(entry.clone().multiplyScalar(1.8));
    d.touch(this.now, TIMING.tagSeconds + 3);
    this.ctx.stage.scene.add(d.group);
    this.ring.add(d);
    d.walkTo(entry, 1.4);
    this.dancers.set(viewer.id, d);
    return { dancer: d, joined: true };
  }

  /** Tempo sınırı aşıldı: zincir kopar, herkes domino gibi yere yığılır */
  private breakHalay(): void {
    this.brokenUntil = this.now + TEMPO.fallenSeconds;
    this.bpm = TEMPO.base;
    // Zincirin başından sonuna doğru sırayla düşerler (domino)
    const last = Math.max(1, this.ring.order.length - 1);
    this.ring.order.forEach((d, i) => {
      const delay = (i / last) * Math.min(1, last * 0.06);
      d.fall(this.now, TEMPO.fallenSeconds - delay, delay);
    });
    for (const r of ['gelin', 'damat'] as const) {
      const d = this.thrones[r].dancer;
      if (d && !d.airborne) d.fall(this.now, TEMPO.fallenSeconds);
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
    if (!k || this.carPhase) return;
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
        g?.walkTo(SPOTS.car.clone().add(v(-0.6, 0, 1.4)), 2);
        dm?.walkTo(SPOTS.car.clone().add(v(0.6, 0, 1.4)), 2);
      }
      if (c.t >= 5.5 && c.t - dt < 5.5) {
        // Arabaya bindiler
        if (g) g.group.visible = false;
        if (dm) dm.group.visible = false;
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
    if (!g || !dm) {
      this.hud.announce('Düğün sona erdi; çift tamamlanmadı. Yeni düğün başlıyor!');
      this.newWedding(false);
      return;
    }
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

  /** Yeni düğünde roller boşalır; izleyiciler halayda kalır. */
  private newWedding(announce = true): void {
    for (const role of ['gelin', 'damat'] as const) {
      const d = this.thrones[role].dancer;
      if (d) this.dethrone(d);
      this.thrones[role] = { dancer: null, since: this.now };
    }
    this.records.clear();
    this.elapsed = 0;
    this.carPhase = null;
    if (announce) this.hud.announce('💃 Yeni düğün başladı!');
    this.refreshHud(true);
  }

  // ------------------------------------------------------------------ kamera

  private idleShots(): Shot[] {
    const idle = (name: string, duration: number, f: (t: number) => Pose): Shot => ({ name, priority: 0, duration, pose: f });
    const R = () => this.ring.radius;
    return [
      // Dikey ekranda yatay açı dar (~25°). Zincir çemberin bir yayıdır ve döner: geniş çekimler
      // zincirin o anki yerine değil bütün çembere (ve arkasındaki çalgıcılara) göre kurulur.
      idle('ön geniş', 9, (t) => orbit(v(0.6, 0.8, -5), Math.sin(t * 0.08) * 0.1, 0.3, 23 + R() * 2.5)),
      idle('kuşbakışı', 8, (t) => orbit(v(0.3, 0, 1.4), Math.sin(t * 0.1) * 0.08, 0.95, 21 + R() * 2.3)),
      idle('halka içi', 9, (t) => {
        const a = 0.6 - t * 0.09;
        const r = R() + 9;
        return pose(v(Math.sin(a) * r, 5.5, Math.cos(a) * r), v(0, 0.9, 0));
      }),
      idle('gelin damat', 7, (t) => pose(v(-1 + t * 0.25, 5.5, R() + 7), v(0, 1.2, 0.6))),
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
        // Bakış başın biraz üstüne: baş kadrajın ortasının altında kalır, üstündeki isim ve
        // konuşma balonu üst yazıların (başlık, kartlar) arkasına girmez
        return pose(head.clone().addScaledVector(dir, dist).add(v(0, lift, 0)), head.clone().add(v(0, 0.25, 0)));
      },
    };
  }

  private coupleShot(priority: number, duration: number): Shot {
    return { name: 'takı', priority, duration, pose: (t) => pose(v(1.5 - t * 0.3, 6.5, this.ring.radius + 8), v(0, 1.2, 0.6)) };
  }

  private throwShot(d: Dancer, priority: number, duration: number): Shot {
    // Sabit geniş kadraj: hızlı yükselen damadı takip eden kamera geride kalıp onu üst yazıların
    // arkasına kaçırıyordu. Yerdeki halaycılardan atışın tepesine kadar hepsi kadrajda.
    return { name: 'havaya', priority, duration, cut: true, focus: d, pose: (t) =>
      pose(v(0, 6, this.ring.radius + 32 - t * 0.6), v(0, 6, 0)) };
  }

  private topShot(priority: number, duration: number): Shot {
    return { name: 'halay koptu', priority, duration, cut: true, pose: (t) => orbit(v(0.3, 0, 1.4), 0, 0.95, 20 + this.ring.radius * 2.3 - t * 0.5) };
  }

  private carShot(priority: number, duration: number): Shot {
    return { name: 'gelin arabası', priority, duration, pose: (t) => {
      const car = this.car.group.position;
      // Halkanın üstünden ama süs bayraklarının altından: öndeki halaycılar da, çapraz bayrak
      // ipleri de arabayı kapatmasın. Araba sağa çıkarken kamera çok uzağa gitmesin.
      const x = Math.max(-12, Math.min(8, car.x)) * 0.6;
      return orbit(v(x, 1, SPOTS.car.z + 1), 0, 0.27, 24 + this.ring.radius * 1.8 - t * 0.2);
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
      if (!d) continue;
      if (!d.busy) d.facing = 0;
      // Gelin ile damat el ele (dancers.ts iki taraf da birbirini yazınca eli tutar)
      d.links[0] = this.thrones[r === 'gelin' ? 'damat' : 'gelin'].dancer;
      d.links[1] = null;
    }

    // Damat yere indi mi? Bazen tutamazlar
    const damat = this.flyingDamat;
    if (damat && !damat.airborne) {
      this.flyingDamat = null;
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
      this.hud.setRole(r, dancer?.viewer ?? null, this.now - since, swapped === r);
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
    this.ctx.stage.camera.clearViewOffset();
    this.ctx.stage.clear();
  }
}

function mmss(s: number): string {
  const x = Math.max(0, Math.floor(s));
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
}
