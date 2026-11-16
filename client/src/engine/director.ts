/**
 * Yönetmen kamera. Sahne boştayken "gezinti" çekimlerini sırayla oynatır;
 * bir olay olunca (yeni yolcu, hediye) öncelikli çekimi kuyruğa alır.
 *
 * Öncelik: 0 = gezinti, 1 = katılım, 2 = küçük hediye, 3 = orta, 4 = büyük.
 * Kuyruk dolarsa düşük öncelikli çekimler atlanır; efekt yine oynar, kamera gitmez.
 */
import * as THREE from 'three';

export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

export interface Shot {
  name: string;
  priority: number;
  /** saniye */
  duration: number;
  /** true ise geçiş kesme ile olur (yumuşak kaydırma yerine) */
  cut?: boolean;
  /** t = çekimin başından beri geçen süre */
  pose: (t: number) => Pose;
  /** Çekimin odaklandığı nesne (oyun, diğer etiketleri gizlemek için kullanabilir) */
  focus?: unknown;
}

const MAX_QUEUE = 4;

export class Director {
  private queue: Shot[] = [];
  private current: Shot | null = null;
  private t = 0;
  private idleIndex = 0;
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private ready = false;
  private held: Shot | null = null;
  private shake = 0;
  /** Kamera yumuşaklığı: büyük = hızlı yetişir */
  smoothing = 2.4;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly idle: Shot[],
  ) {}

  /** Çekimi kuyruğa alır. Alınamadıysa false döner. */
  push(shot: Shot): boolean {
    if (this.held) return false;
    if (this.queue.length >= MAX_QUEUE) {
      const weakest = this.queue[this.queue.length - 1];
      if (weakest.priority >= shot.priority) return false;
      this.queue.pop();
    }
    this.queue.push(shot);
    this.queue.sort((a, b) => b.priority - a.priority);
    return true;
  }

  hold(shot: Shot | null): void {
    this.held = shot;
    this.current = null;
    this.queue = [];
    this.t = 0;
  }

  /** Şu anki çekimin odağı (yoksa null) */
  get focus(): unknown {
    return this.current?.focus ?? null;
  }

  /** Kuyrukta bekleyen olay çekimi sayısı */
  get pending(): number {
    return this.queue.length;
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt: number): void {
    this.t += dt;
    const idleNow = !this.current || this.current.priority === 0;
    const finished = !this.current || this.t >= this.current.duration;
    // Daha yüksek öncelikli çekim gelirse mevcut çekimi kes
    const preempt = this.queue.length > 0 && this.current && this.queue[0].priority > this.current.priority + 1;

    let snap = false;
    if (this.held && this.current !== this.held) {
      this.current = this.held;
      this.t = 0;
      snap = true;
    } else if (!this.held && (finished || (idleNow && this.queue.length > 0) || preempt)) {
      this.current = this.queue.shift() ?? this.nextIdle();
      this.t = 0;
      snap = !!this.current.cut;
    }

    const target = this.current!.pose(this.t);
    if (!this.ready || snap) {
      this.pos.copy(target.pos);
      this.look.copy(target.look);
      this.ready = true;
    } else {
      const k = 1 - Math.exp(-dt * this.smoothing);
      this.pos.lerp(target.pos, k);
      this.look.lerp(target.look, k);
    }

    this.shake = Math.max(0, this.shake - dt * 1.5);
    const s = this.shake * this.shake;
    this.camera.position.set(
      this.pos.x + (Math.random() - 0.5) * s,
      this.pos.y + (Math.random() - 0.5) * s,
      this.pos.z,
    );
    this.camera.lookAt(this.look);
  }

  private nextIdle(): Shot {
    const shot = this.idle[this.idleIndex % this.idle.length];
    this.idleIndex++;
    return shot;
  }
}
