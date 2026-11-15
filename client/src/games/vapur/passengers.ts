/**
 * Yolcular: her izleyici güvertede oturan basit bir figür.
 * Gerçek izleyici sayısı azsa isimsiz yolcular boşluğu doldurur ve
 * gerçek izleyici gelince yerini ona bırakır.
 */
import * as THREE from 'three';
import type { Viewer } from '../../../../shared/events.ts';
import { colorFor, createNameTag } from '../../engine/nameTag.ts';
import { createTextSprite, disposeSprite } from '../../engine/textSprite.ts';
import { MIN_CROWD, SHIP, TIMING } from './config.ts';

export type Role = 'seat' | 'bow' | 'stage' | 'captain';

const SKIN = ['#f1c7a5', '#e0ac85', '#c98e66', '#a8714f', '#f5d6bd'];
const HAIR = ['#2b1d14', '#4a2f1e', '#7a5634', '#1a1a1a', '#b88a4a'];

function pick<T>(list: readonly T[], id: string, salt = 0): T {
  let h = salt;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

interface Prop {
  object: THREE.Object3D;
  until: number;
}

export class Passenger {
  readonly group = new THREE.Group();
  readonly color: string;
  private readonly armR: THREE.Object3D;
  private readonly armL: THREE.Object3D;
  private readonly hand = new THREE.Object3D();
  private tag: THREE.Sprite | null = null;
  private bubble: THREE.Sprite | null = null;
  private bubbleUntil = 0;
  private props: Prop[] = [];
  private walk: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number } | null = null;
  private waveUntil = 0;
  private swayUntil = 0;
  role: Role = 'seat';
  roleUntil = Infinity;
  tagUntil = 0;
  lastActive = 0;
  readonly phase = Math.random() * 10;

  constructor(
    readonly viewer: Viewer | null,
    public seat: number,
    readonly home: THREE.Vector3,
  ) {
    const id = viewer?.id ?? `npc-${Math.random()}`;
    this.color = viewer ? colorFor(viewer.id) : pick(['#4a5568', '#5a4a6a', '#3f5a5a', '#6a4a4a'], id);
    const shirt = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: pick(SKIN, id), roughness: 0.8 });
    const hair = new THREE.MeshStandardMaterial({ color: pick(HAIR, id, 7), roughness: 0.9 });
    const pants = new THREE.MeshStandardMaterial({ color: '#2a2f3a' });

    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), pants);
    legs.position.y = 0.45;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10), shirt);
    body.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin);
    head.position.y = 1.68;
    // Saç arkaya doğru eğik; yüz +z (kıç/kamera) yönüne bakar
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.295, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    cap.position.set(0, 1.72, -0.03);
    cap.rotation.x = -0.45;
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a1410' });
    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
      eye.position.set(ex, 1.7, 0.255);
      this.group.add(eye);
    }

    const arm = () => {
      const pivot = new THREE.Object3D();
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 4, 6), shirt);
      a.position.y = -0.3;
      pivot.add(a);
      return pivot;
    };
    this.armR = arm();
    this.armR.position.set(0.33, 1.32, 0);
    this.armL = arm();
    this.armL.position.set(-0.33, 1.32, 0);
    this.hand.position.set(0, -0.62, 0.05);
    this.armR.add(this.hand);

    for (const m of [legs, body, head, cap]) m.castShadow = true;
    this.group.add(legs, body, head, cap, this.armR, this.armL);
    this.group.position.copy(home);

    if (viewer) {
      this.tag = createNameTag(viewer);
      this.tag.scale.set(2.2, 0.55, 1);
      this.tag.position.y = 2.35;
      this.group.add(this.tag);
    }
  }

  get isNpc(): boolean {
    return this.viewer === null;
  }

  /** Başın üstündeki nokta (kamera ve efektler için, dünya koordinatı) */
  headWorld(target = new THREE.Vector3()): THREE.Vector3 {
    return this.group.localToWorld(target.set(0, 1.65, 0));
  }

  handWorld(target = new THREE.Vector3()): THREE.Vector3 {
    return this.hand.getWorldPosition(target);
  }

  touch(now: number, showTagFor: number = TIMING.tagSeconds): void {
    this.lastActive = now;
    this.tagUntil = Math.max(this.tagUntil, now + showTagFor);
  }

  /** Etiketi göstermeden "hâlâ burada" say (beğeniler için) */
  markActive(now: number): void {
    this.lastActive = now;
  }

  say(text: string, now: number): void {
    if (this.bubble) disposeSprite(this.bubble);
    const short = [...text].length > 34 ? [...text].slice(0, 32).join('') + '…' : text;
    this.bubble = createTextSprite(short, {
      color: '#1a1a1a',
      background: 'rgba(205,210,220,0.95)',
      font: '600 44px Segoe UI, sans-serif',
      height: 0.6,
      padding: 18,
      tail: true,
    });
    this.bubble.material.toneMapped = false;
    this.bubble.position.y = 3.05;
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

  sway(now: number, seconds: number): void {
    this.swayUntil = now + seconds;
  }

  /** Eline bir nesne verir (simit, çay…) */
  hold(object: THREE.Object3D, now: number, seconds: number): void {
    this.hand.add(object);
    this.props.push({ object, until: now + seconds });
  }

  /** Güvertede bir noktaya yürür */
  walkTo(to: THREE.Vector3, seconds = 1.6): void {
    this.walk = { from: this.group.position.clone(), to: to.clone(), t: 0, dur: seconds };
  }

  update(dt: number, now: number, focus: Passenger | null = null): void {
    const t = now + this.phase;
    if (this.walk) {
      this.walk.t += dt;
      const k = Math.min(1, this.walk.t / this.walk.dur);
      const e = k * k * (3 - 2 * k);
      this.group.position.lerpVectors(this.walk.from, this.walk.to, e);
      this.group.position.y += Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
      if (k >= 1) this.walk = null;
    }
    // Koltukta kıça (kameraya), özel rollerde pruvaya / seyirciye döner
    const facing = this.role === 'seat' ? 0 : Math.PI;
    this.group.rotation.y += (facing - this.group.rotation.y) * Math.min(1, dt * 4);

    // Kollar
    if (now < this.waveUntil) {
      this.armR.rotation.z = 2.6 + Math.sin(t * 12) * 0.35;
    } else if (this.props.length) {
      this.armR.rotation.set(-1.1, 0, 0.15);
    } else {
      this.armR.rotation.set(0, 0, 0.12 + Math.sin(t * 1.3) * 0.03);
    }
    this.armL.rotation.z = -0.12 - Math.sin(t * 1.1) * 0.03;
    if (now < this.swayUntil) {
      this.group.rotation.z = Math.sin(t * 4) * 0.12;
      this.armL.rotation.z = -2.4 + Math.sin(t * 4) * 0.3;
    } else {
      this.group.rotation.z *= 0.9;
    }

    // Etiket: yeni gelen / aktif / özel roldekiler görünür
    if (this.tag) {
      // Yakın çekimde yalnız odaktaki kişinin etiketi görünür
      const visible = focus ? focus === this : this.role !== 'seat' || now < this.tagUntil;
      const mat = this.tag.material;
      mat.opacity += ((visible ? 1 : 0) - mat.opacity) * Math.min(1, dt * 5);
      this.tag.visible = mat.opacity > 0.02;
    }
    if (this.bubble && now > this.bubbleUntil) {
      disposeSprite(this.bubble);
      this.bubble = null;
    }
    this.props = this.props.filter((p) => {
      if (now < p.until) return true;
      p.object.removeFromParent();
      return false;
    });
  }

  dispose(): void {
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

/** Koltuk dağıtımı, katılım ve boşaltma kuralları. */
export class Passengers {
  private readonly list: Passenger[] = [];
  private readonly byViewer = new Map<string, Passenger>();
  /** İskelede inen, borda tarafına yürüyüp kaybolacak yolcular */
  private leaving: { p: Passenger; at: number }[] = [];
  /** Kameranın yakın çekimdeki yolcusu */
  focus: Passenger | null = null;

  constructor(
    private readonly deck: THREE.Object3D,
    private readonly seats: THREE.Vector3[],
  ) {
    this.fillNpcs();
  }

  get real(): Passenger[] {
    return this.list.filter((p) => !p.isNpc);
  }

  get all(): readonly Passenger[] {
    return this.list;
  }

  find(viewerId: string): Passenger | undefined {
    return this.byViewer.get(viewerId);
  }

  /**
   * İzleyiciyi vapura bindirir. Yeni bindiyse `joined` true döner.
   * Yer yoksa en uzun süredir sessiz olan sıradan yolcu iner.
   */
  board(viewer: Viewer, now: number): { passenger: Passenger; joined: boolean } {
    const existing = this.byViewer.get(viewer.id);
    if (existing) {
      existing.touch(now);
      return { passenger: existing, joined: false };
    }
    const seat = this.freeSeat() ?? this.evict();
    const p = new Passenger(viewer, seat, this.seats[seat]);
    p.touch(now, TIMING.tagSeconds + 3);
    this.deck.add(p.group);
    this.list.push(p);
    this.byViewer.set(viewer.id, p);
    this.trimNpcs();
    return { passenger: p, joined: true };
  }

  private freeSeat(): number | null {
    const taken = new Set(this.list.map((p) => p.seat));
    // Önce kameraya yakın (kıç) koltuklar, ortadan kenara
    const order = [...this.seats.keys()].sort((a, b) => {
      const sa = this.seats[a];
      const sb = this.seats[b];
      return sb.z - sa.z || Math.abs(sa.x) - Math.abs(sb.x);
    });
    return order.find((i) => !taken.has(i)) ?? null;
  }

  /** Önce isimsiz yolcu, sonra en eski sessiz izleyici iner. Boşalan koltuğu döner. */
  private evict(): number {
    const npc = this.list.find((p) => p.isNpc);
    const victim =
      npc ??
      this.list
        .filter((p) => p.role === 'seat')
        .sort((a, b) => a.lastActive - b.lastActive)[0];
    this.remove(victim);
    return victim.seat;
  }

  private remove(p: Passenger): void {
    this.list.splice(this.list.indexOf(p), 1);
    if (p.viewer) this.byViewer.delete(p.viewer.id);
    p.dispose();
  }

  private fillNpcs(): void {
    while (this.list.length < MIN_CROWD) {
      const seat = this.freeSeat();
      if (seat === null) return;
      const p = new Passenger(null, seat, this.seats[seat]);
      this.deck.add(p.group);
      this.list.push(p);
    }
  }

  private trimNpcs(): void {
    const npcs = this.list.filter((p) => p.isNpc);
    let extra = this.list.length - MIN_CROWD;
    for (const npc of npcs) {
      if (extra-- <= 0) break;
      this.remove(npc);
    }
  }

  /** Rolü biten yolcuyu koltuğuna döndürür */
  sendHome(p: Passenger): void {
    p.role = 'seat';
    p.roleUntil = Infinity;
    p.walkTo(this.seats[p.seat]);
  }

  /** Belirli rolden birini çıkarır (ör. yeni kaptan gelince eskisi iner) */
  releaseRole(role: Role, except?: Passenger): void {
    for (const p of this.list) if (p.role === role && p !== except) this.sendHome(p);
  }

  countRole(role: Role): Passenger[] {
    return this.list.filter((p) => p.role === role);
  }

  /**
   * İskelede iner: `idleSeconds` boyunca hiçbir şey yapmamış gerçek yolcular.
   * Sahnedeki ve pruvadaki yolcular yakın zamanda hediye attığı için kapsam dışı.
   * Koltukları hemen boşalır; kendileri iskele tarafına yürüyüp kaybolur.
   */
  disembark(now: number, idleSeconds: number): Passenger[] {
    const gone = this.list.filter(
      (p) => !p.isNpc && now - p.lastActive > idleSeconds && p.role !== 'stage' && p.role !== 'bow',
    );
    for (const p of gone) {
      this.list.splice(this.list.indexOf(p), 1);
      this.byViewer.delete(p.viewer!.id);
      p.role = 'seat';
      p.tagUntil = now + 3;
      const pos = p.group.position;
      p.walkTo(new THREE.Vector3(3.3, pos.y, pos.z), 1.6);
      this.leaving.push({ p, at: now + 1.9 });
    }
    this.fillNpcs();
    return gone;
  }

  update(dt: number, now: number): void {
    for (const p of this.list) {
      if (p.role !== 'seat' && now > p.roleUntil) this.sendHome(p);
      p.update(dt, now, this.focus);
    }
    this.leaving = this.leaving.filter(({ p, at }) => {
      if (now < at) {
        p.update(dt, now, null);
        return true;
      }
      p.dispose();
      return false;
    });
  }

  /** Herkes el sallasın */
  waveAll(now: number, seconds = 2): void {
    for (const p of this.list) p.wave(now + Math.random() * 0.4, seconds);
  }

  swayAll(now: number, seconds: number): void {
    for (const p of this.list) if (p.role === 'seat') p.sway(now, seconds);
  }
}

export const SEAT_Y = SHIP.upperDeck;
