/**
 * BOĞAZ VAPURU
 * İstanbul Boğazı'nda bitmeyen bir sabah seferi. Yorum yazan vapura biner; her hediye
 * hediyeyi atan kişiye isimli, kameranın gittiği bir an verir.
 *
 * Bu dosya yalnız yönetir: olayı → yolcu + an + kamera çekimine çevirir.
 * Dünya parçaları world/, efektler effects.ts, ekran yazıları hud.ts içindedir.
 */
import * as THREE from 'three';
import type { GiftEvent, LiveEvent, Viewer } from '../../../../shared/events.ts';
import { tierOf } from '../../../../shared/gifts.ts';
import type { Game, GameContext } from '../Game.ts';
import { Director, type Pose, type Shot } from '../../engine/director.ts';
import { createTextSprite, disposeSprite } from '../../engine/textSprite.ts';
import { horn } from '../../engine/sfx.ts';
import { Environment } from './world/environment.ts';
import { Ferry } from './world/ferry.ts';
import { Scenery, type Pier } from './world/scenery.ts';
import { Passenger, Passengers } from './passengers.ts';
import { Gulls, Steam, makeMic, makeSimit, makeTea } from './effects.ts';
import { Confetti, Floaters } from '../../engine/particles.ts';
import { Hud } from './hud.ts';
import { PIERS, SHIP, TIMING, momentFor, type MomentId } from './config.ts';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const pose = (pos: THREE.Vector3, look: THREE.Vector3): Pose => ({ pos, look });

interface Supporter {
  viewer: Viewer;
  total: number;
}

/** İskele durağı: seyir → yavaşla → yanaş (in) → kalk */
type Voyage =
  | { phase: 'cruise'; since: number }
  | { phase: 'approach'; pier: Pier }
  | { phase: 'docked'; pier: Pier; t: number }
  | { phase: 'depart'; t: number };

interface SkyLabel {
  sprite: THREE.Sprite;
  until: number;
}

export class VapurGame implements Game {
  private ctx!: GameContext;
  private env!: Environment;
  private ferry!: Ferry;
  private scenery!: Scenery;
  private passengers!: Passengers;
  private gulls!: Gulls;
  private confetti!: Confetti;
  private floaters!: Floaters;
  private singer: Passenger | null = null;
  private noteTimer = 0;
  private steam!: Steam;
  private director!: Director;
  private hud!: Hud;
  private skyLabels: SkyLabel[] = [];
  private supporters = new Map<string, Supporter>();
  private captain: Passenger | null = null;
  private now = 0;
  private hudDirty = true;
  private speed: number = TIMING.cruiseSpeed;
  private voyage: Voyage = { phase: 'cruise', since: 0 };
  private pierIndex = 0;

  start(ctx: GameContext): void {
    this.ctx = ctx;
    const { scene, camera } = ctx.stage;
    camera.fov = 42;
    camera.far = 2000;
    camera.updateProjectionMatrix();
    // Gündüz sahnesinde parlama (bloom) neredeyse görünmüyordu ama GPU'yu en çok o yoruyordu: kapalı.
    ctx.stage.renderer.toneMappingExposure = 1.0;

    this.env = new Environment(scene);
    this.ferry = new Ferry();
    scene.add(this.ferry.group);
    this.scenery = new Scenery(scene);
    this.passengers = new Passengers(this.ferry.deck, this.ferry.seats);
    this.gulls = new Gulls(scene);
    this.confetti = new Confetti(scene);
    this.floaters = new Floaters(scene);
    this.steam = new Steam(this.ferry.deck, v(0, SHIP.funnel.top, SHIP.funnel.z));
    this.director = new Director(camera, this.idleShots());
    this.hud = new Hud(ctx.hud);
  }

  // ------------------------------------------------------------------ olaylar

  onEvent(e: LiveEvent): void {
    switch (e.type) {
      case 'comment': {
        const { passenger, joined } = this.passengers.board(e.viewer, this.now);
        passenger.say(e.text, this.now);
        // Aynı anda en fazla 3 konuşma balonu: en eskisi kapanır
        const talking = this.passengers.all.filter((p) => p.bubbleAt > this.now).sort((a, b) => a.bubbleAt - b.bubbleAt);
        for (const p of talking.slice(0, Math.max(0, talking.length - 3))) p.hideBubble();
        if (joined) this.welcome(passenger);
        this.hudDirty = true;
        break;
      }
      case 'like':
        this.gulls.excite(Math.ceil(e.count / 5), this.now);
        // Beğeni de "hâlâ buradayım" sayılır: iskelede inmez
        this.passengers.find(e.viewer.id)?.markActive(this.now);
        break;
      case 'follow':
      case 'share': {
        const p = this.passengers.find(e.viewer.id);
        if (p) {
          p.wave(this.now);
          p.touch(this.now);
        }
        break;
      }
      case 'gift':
        this.onGift(e);
        break;
    }
  }

  private welcome(p: Passenger): void {
    p.wave(this.now, 2.5);
    // Kalabalıkta her katılıma kamera gitmez; kuyruk boşsa gider
    if (this.director.pending < 2) this.director.push(this.closeUp(p, 'katılım', 1, 3));
  }

  private onGift(e: GiftEvent): void {
    const { passenger: p, joined } = this.passengers.board(e.viewer, this.now);
    p.touch(this.now, 12);
    if (joined) p.wave(this.now);
    const s = this.supporters.get(e.viewer.id) ?? { viewer: e.viewer, total: 0 };
    s.total += e.value;
    s.viewer = e.viewer;
    this.supporters.set(e.viewer.id, s);
    this.hud.flash(e.giftId);
    this.hudDirty = true;
    this.play(momentFor(e.giftId, tierOf(e.value)), p, e);
  }

  /** Her hediye anı: görsel efekt + (gerekirse) rol + kamera çekimi */
  private play(moment: MomentId, p: Passenger, e: GiftEvent): void {
    const now = this.now;
    const name = e.viewer.name;
    switch (moment) {
      case 'simit': {
        p.hold(makeSimit(), now, 6);
        this.gulls.swarm(() => p.headWorld(), Math.min(2 + e.count, 10), now, 5);
        this.director.push(this.closeUp(p, 'simit', 2, 3.5));
        break;
      }
      case 'duduk': {
        horn();
        this.steam.burst();
        this.passengers.waveAll(now, 2);
        p.wave(now, 3);
        this.director.push(this.funnelShot(2, 3.2));
        break;
      }
      case 'cay': {
        p.hold(makeTea(), now, TIMING.teaSeconds);
        this.director.push(this.closeUp(p, 'çay', 2, 3.5));
        break;
      }
      case 'foto': {
        p.wave(now, 3);
        this.hud.snapshot(e.viewer);
        this.director.push(this.closeUp(p, 'foto', 3, 4.5));
        break;
      }
      case 'onGuverte': {
        const taken = this.passengers.countRole('bow');
        if (taken.length >= SHIP.bow.length) this.passengers.sendHome(taken.sort((a, b) => a.roleUntil - b.roleUntil)[0]);
        const used = new Set(this.passengers.countRole('bow').map((b) => b.group.userData.bowSlot as number));
        const slot = SHIP.bow.findIndex((_, i) => !used.has(i));
        const spot = SHIP.bow[slot];
        p.group.userData.bowSlot = slot;
        p.role = 'bow';
        p.roleUntil = now + TIMING.bowSeconds;
        p.walkTo(v(spot.x, SHIP.hullTop, spot.z), 2.5);
        this.director.push(this.bowShot(p, 3, 5));
        break;
      }
      case 'konfeti': {
        // Güvertenin üstünde patlar; adı göğe yazılır
        const bursts = 2 + Math.min(e.count, 4);
        for (let i = 0; i < bursts; i++) {
          this.confetti.burst(v((Math.random() - 0.5) * 6, 12 + Math.random() * 3, 3 + Math.random() * 8), p.color, 150, { delay: i * 0.5 });
        }
        this.skyLabel(name, p.color, v(0, 17, -10), 6);
        this.ctx.banner.show(e.viewer, 'konfeti patlattı!', 'Bütün vapur onun adını gördü');
        this.director.push(this.skyShot(4, 6));
        break;
      }
      case 'sarki': {
        this.passengers.releaseRole('stage', p);
        p.role = 'stage';
        p.roleUntil = now + TIMING.singSeconds;
        p.walkTo(v(SHIP.stage.x, SHIP.upperDeck + 0.18, SHIP.stage.z), 2);
        p.hold(makeMic(), now, TIMING.singSeconds);
        this.passengers.swayAll(now + 2, TIMING.singSeconds - 2);
        this.singer = p;
        this.ctx.banner.show(e.viewer, 'sahnede!', 'Güverte şarkıya eşlik ediyor');
        this.director.push(this.stageShot(p, 4, 7));
        break;
      }
      case 'kaptan': {
        if (this.captain && this.captain !== p) this.passengers.sendHome(this.captain);
        this.captain = p;
        p.role = 'captain';
        p.roleUntil = Infinity;
        p.walkTo(v(SHIP.bridge.x, SHIP.bridge.y, SHIP.bridge.z), 2.5);
        this.ferry.setCaptain(name, p.color);
        horn(2.2);
        this.steam.burst(36);
        this.ctx.banner.show(e.viewer, 'kaptan oldu! ⚓', 'Dümen artık onda');
        this.director.push(this.captainShot(p, 4, 7));
        break;
      }
      case 'kopru': {
        const bridge = this.scenery.upcomingBridge();
        bridge.dedicate(name, p.color);
        this.ctx.banner.show(e.viewer, 'köprüye adını astı!', 'Boğaz Köprüsü’nde dev pankart');
        this.director.push(this.bridgeShot(bridge.group, 4, 7));
        break;
      }
      case 'kizKulesi': {
        const tower = this.scenery.upcomingTower();
        const top = tower.dedicate(name, p.color);
        const base = tower.group.position;
        for (let i = 0; i < 6; i++) {
          this.confetti.burst(v(base.x + (Math.random() - 0.5) * 30, 18 + Math.random() * 18, base.z + (Math.random() - 0.5) * 20), i % 2 ? p.color : '#e30a17', 140, { delay: 0.6 + i * 0.4, spread: 16, scale: 4 });
        }
        void top;
        horn(2.6);
        this.ctx.banner.show(e.viewer, 'Kız Kulesi’nde! ✦', 'Boğaz’ın yıldızı', 4200);
        this.director.addShake(0.4);
        this.director.push(this.towerShot(tower.group, 4, 9));
        break;
      }
    }
  }

  private skyLabel(text: string, color: string, at: THREE.Vector3, seconds: number, delay = 0): void {
    const sprite = createTextSprite(text, { color, stroke: '#ffffff', font: '900 110px Segoe UI, sans-serif', height: 7 });
    sprite.position.copy(at);
    sprite.visible = delay === 0;
    sprite.userData.showAt = this.now + delay;
    this.ctx.stage.scene.add(sprite);
    // Gökyüzünde aynı anda tek isim: öncekiler hızla söner
    for (const old of this.skyLabels) old.until = Math.min(old.until, this.now + delay + 0.4);
    this.skyLabels.push({ sprite, until: this.now + delay + seconds });
  }

  // ------------------------------------------------------------------ kamera

  /** Boştayken dönen gezinti çekimleri (her biri ~9 sn, yavaş kayar) */
  private idleShots(): Shot[] {
    const idle = (name: string, f: (t: number) => Pose): Shot => ({ name, priority: 0, duration: 9, pose: f });
    return [
      // Dikey ekranda yatay açı dar (~25°): geniş çekimler uzaktan yapılır
      // Bakış noktası hedefin altında tutulur ki vapur ekranın üst-orta güvenli alanına otursun
      // Alçak kamera: ufuk çizgisi (İstanbul silüeti) menünün hemen altında görünür
      idle('kıçtan geniş', (t) => pose(v(16 - t * 1.2, 11, 50), v(-12, 3, -30))),
      idle('yolcular', (t) => pose(v(-6 + t * 1.2, 12, 28), v(0, 2.5, 4))),
      idle('yandan', (t) => pose(v(-34, 6, 24 - t * 2.5), v(4, 2.5, -14))),
      idle('ufuk', (t) => pose(v(5, 12 + t * 0.3, 42), v(0, 10, -150))),
      idle('kuşbakışı', (t) => pose(v(Math.sin(t * 0.12) * 14, 70, 48), v(0, -8, -14))),
      idle('baca ve ampuller', (t) => pose(v(12 - t * 0.8, 12, 18 + t * 0.4), v(0, 5, -2))),
    ];
  }

  private closeUp(p: Passenger, name: string, priority: number, duration: number): Shot {
    return {
      name,
      priority,
      duration,
      focus: p,
      pose: (t) => {
        const head = p.headWorld();
        const a = 0.35 + t * 0.12;
        // Bakış başın biraz üstünde: yolcu, üstteki menünün altında ve yorum akışının üstünde (ekran ortası) kalır
        return pose(head.clone().add(v(Math.sin(a) * 8, 2.2, Math.cos(a) * 8)), head.clone().add(v(0, -0.1, 0)));
      },
    };
  }

  private bowShot(p: Passenger, priority: number, duration: number): Shot {
    return { name: 'ön güverte', priority, duration, focus: p, pose: (t) => {
      const head = p.headWorld();
      return pose(v(-6 + t * 0.6, SHIP.hullTop + 6, -27), head.clone().add(v(0, -2, 0)));
    } };
  }

  private stageShot(p: Passenger, priority: number, duration: number): Shot {
    return { name: 'sahne', priority, duration, focus: p, pose: (t) => {
      const head = p.headWorld();
      // Seyircilerin başının üstünden, sahneye doğru
      return pose(head.clone().add(v(3 - t * 0.6, 5, -10)), head.clone().add(v(0, -1.6, 0)));
    } };
  }

  private captainShot(p: Passenger, priority: number, duration: number): Shot {
    return { name: 'kaptan', priority, duration, focus: p, pose: (t) => {
      const head = p.headWorld();
      // Pruvanın sağ üstünden: kaptanın yüzü, dümen ve adı yazan baca aynı karede
      return pose(v(7 - t * 0.5, 14, -20 + t * 0.3), head.clone().add(v(0, -1.6, 1.5)));
    } };
  }

  private funnelShot(priority: number, duration: number): Shot {
    return { name: 'düdük', priority, duration, pose: (t) => pose(v(6 + t * 0.4, 10, 7), v(0, SHIP.funnel.top + 1 + t, SHIP.funnel.z)) };
  }

  private skyShot(priority: number, duration: number): Shot {
    return { name: 'gökyüzü', priority, duration, pose: (t) => pose(v(7 - t * 0.6, 15, 36), v(0, 11, -12)) };
  }

  private bridgeShot(bridge: THREE.Object3D, priority: number, duration: number): Shot {
    return { name: 'köprü', priority, duration, pose: (t) => pose(v(4 - t * 0.4, 16, 46), v(0, 30, bridge.position.z)) };
  }

  private towerShot(tower: THREE.Object3D, priority: number, duration: number): Shot {
    return { name: 'kız kulesi', priority, duration, cut: true, pose: (t) => {
      // Vapurun sol arkasından, kuleye ve üstündeki dev isme bakar
      const target = tower.position.clone().add(v(0, 16 + t * 0.6, 0));
      return pose(v(-14 + t * 0.8, 13, 40), target);
    } };
  }

  // ------------------------------------------------------------------ iskele

  /** İskele zamanlaması ve vapurun hızı. Kıyı, deniz ve dalga izi bu hıza göre akar. */
  private updateVoyage(dt: number): void {
    const cruise = TIMING.cruiseSpeed;
    const v0 = this.voyage;
    switch (v0.phase) {
      case 'cruise': {
        this.speed = cruise;
        v0.since += dt;
        if (v0.since >= TIMING.pierEvery) {
          const name = PIERS[this.pierIndex++ % PIERS.length];
          // ~22 sn sonra vapurun yanına gelecek mesafede belirir
          const pier = this.scenery.spawnPier(name, -cruise * 22);
          this.voyage = { phase: 'approach', pier };
        }
        break;
      }
      case 'approach': {
        const dist = -v0.pier.group.position.z; // iskelenin vapura uzaklığı
        // Son 45 birimde sabit frenleme (≈13 sn): hız mesafenin kareköküyle düşer
        this.speed = Math.max(0.6, cruise * Math.sqrt(Math.min(1, dist / 45)));
        if (dist <= 0.2) {
          this.speed = 0;
          this.voyage = { phase: 'docked', pier: v0.pier, t: 0 };
          this.dock(v0.pier);
        }
        break;
      }
      case 'docked': {
        this.speed = 0;
        v0.t += dt;
        if (v0.t >= TIMING.dockSeconds) {
          horn(1.2);
          this.steam.burst(16);
          this.voyage = { phase: 'depart', t: 0 };
        }
        break;
      }
      case 'depart': {
        v0.t += dt;
        this.speed = cruise * Math.min(1, v0.t / 5);
        if (v0.t >= 5) this.voyage = { phase: 'cruise', since: 0 };
        break;
      }
    }
  }

  /** Yanaşınca: düdük, sessiz yolcular iner, isimleri alt yazıda */
  private dock(pier: Pier): void {
    horn(1.8);
    this.steam.burst(24);
    const gone = this.passengers.disembark(this.now, TIMING.idleLeaveSeconds);
    if (this.captain && gone.includes(this.captain)) {
      this.captain = null;
      this.ferry.setCaptain(null);
    }
    const names = gone.map((p) => p.viewer!.name);
    const list = names.length === 0
      ? 'Kimse inmedi, herkes yolculukta!'
      : `İnenler: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
    const sign: Viewer = { id: 'iskele', name: pier.name, avatar: '' };
    this.ctx.banner.show(sign, 'iskelesi ⚓', list, 4200);
    this.hudDirty = true;
    this.director.push(this.pierShot(pier.group, 3, 7));
  }

  private pierShot(pier: THREE.Object3D, priority: number, duration: number): Shot {
    // Sol arkadan, vapur ve iskele aynı karede
    return { name: 'iskele', priority, duration, pose: (t) => pose(v(-12 + t * 0.6, 14, 34), v(9, 5, pier.position.z - 8)) };
  }

  // ------------------------------------------------------------------ döngü

  update(dt: number): void {
    this.now += dt;
    this.updateVoyage(dt);
    const speed = this.speed;
    this.env.update(dt, speed);
    this.scenery.update(dt, speed);
    this.ferry.update(dt, speed / TIMING.cruiseSpeed);
    this.passengers.update(dt, this.now);
    this.gulls.update(dt, this.now);
    this.confetti.update(dt);
    this.floaters.update(dt);
    // Şarkı söyleyenin başından notalar yükselir
    if (this.singer) {
      if (this.singer.role !== 'stage') this.singer = null;
      else if ((this.noteTimer -= dt) <= 0) {
        this.noteTimer = 0.45;
        this.floaters.spawn(Math.random() < 0.5 ? '♪' : '♫', this.singer.color, this.singer.headWorld().add(v(0, 0.6, 0)));
      }
    }
    this.steam.update(dt);

    this.skyLabels = this.skyLabels.filter((l) => {
      if (!l.sprite.visible && this.now >= l.sprite.userData.showAt) l.sprite.visible = true;
      l.sprite.material.opacity = Math.min(1, Math.max(0, l.until - this.now));
      if (this.now < l.until) return true;
      disposeSprite(l.sprite);
      return false;
    });

    if (this.captain && !this.passengers.all.includes(this.captain)) {
      this.captain = null;
      this.ferry.setCaptain(null);
      this.hudDirty = true;
    }
    this.director.update(dt);
    this.passengers.focus = (this.director.focus as Passenger | null) ?? null;

    if (this.hudDirty) {
      this.hudDirty = false;
      this.hud.setStatus(this.passengers.real.length, this.captain?.viewer?.name ?? null);
      this.hud.setTop([...this.supporters.values()].sort((a, b) => b.total - a.total));
    }
  }

  reset(): void {
    // Yeni sefer: yolcular, roller ve destek sıralaması sıfırlanır
    this.hud.dispose();
    this.ctx.stage.clear();
    this.singer = null;
    this.skyLabels = [];
    this.supporters.clear();
    this.captain = null;
    this.hudDirty = true;
    this.speed = TIMING.cruiseSpeed;
    this.voyage = { phase: 'cruise', since: 0 };
    this.start(this.ctx);
  }

  dispose(): void {
    this.hud.dispose();
    this.ctx.stage.clear();
  }
}
