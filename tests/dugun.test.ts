import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GiftEvent, Viewer } from '../shared/events.ts';
import { GiftStreaks, normalize } from '../server/normalize.ts';
import { MENU, momentFor } from '../client/src/games/dugun/config.ts';
import type { GameContext } from '../client/src/games/Game.ts';

vi.mock('../client/src/engine/particles.ts', () => ({
  Confetti: class { burst = vi.fn(); update = vi.fn(); },
  Floaters: class { spawn = vi.fn(); update = vi.fn(); },
}));
vi.mock('../client/src/games/dugun/world.ts', () => ({
  SPOTS: { car: new THREE.Vector3(), musicians: new THREE.Vector3() },
  World: class { update = vi.fn(); },
  WeddingCar: class {
    group = new THREE.Group(); arrive = vi.fn(); leave = vi.fn(); update = vi.fn();
  },
}));
vi.mock('../client/src/games/dugun/hud.ts', () => ({
  Hud: class {
    setRole = vi.fn(); setTempo = vi.fn(); setClock = vi.fn(); setCountdown = vi.fn();
    announce = vi.fn(); flash = vi.fn(); dispose = vi.fn();
  },
}));
vi.mock('../client/src/games/dugun/dancers.ts', async (original) => ({
  ...await original<object>(),
  Dancer: class {
    group = new THREE.Group(); links = [null, null]; ringTarget = null;
    name: string; color = '#ffffff'; bubbleAt = 0; busy = false; airborne = false;
    pinnedTag = false; lastActive = 0;
    constructor(public viewer: Viewer) { this.name = viewer.name; }
    touch = vi.fn(); say = vi.fn(); hideBubble = vi.fn(); hop = vi.fn(); wave = vi.fn();
    dress = vi.fn(); clearCoins = vi.fn(); setMendil = vi.fn(); walkTo = vi.fn();
    fall = vi.fn(); update = vi.fn(); throwUp = vi.fn();
    headWorld() { return this.group.position.clone(); }
  },
}));

import { DugunGame } from '../client/src/games/dugun/DugunGame.ts';

const viewer = (id: string): Viewer => ({ id, name: id, avatar: '' });
const gift = (name: string, count: number, giftId = '5655'): GiftEvent => ({
  type: 'gift', id: `${name}-${count}`, at: 0, viewer: viewer(name),
  count, giftId, giftName: 'test', unitValue: 1, value: count,
});

describe('Düğün gerçek izleyici akışı', () => {
  let game: DugunGame;
  // Özel durumları doğrulamak için yalnız testte iç duruma erişilir.
  let state: any;
  beforeEach(() => {
    game = new DugunGame();
    game.start({
      stage: { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(),
        renderer: {}, clear: vi.fn() }, hud: {}, banner: { show: vi.fn() },
    } as unknown as GameContext);
    state = game;
  });

  it('başlangıç, boş geçen düğün ve sıfırlama yapay karakter üretmez', () => {
    expect(state.dancers.size).toBe(0);
    expect(state.ring.order).toHaveLength(0);
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.thrones.damat.dancer).toBeNull();
    expect(state.kaynana).toBeNull();
    game.update(600);
    expect(state.car.arrive).not.toHaveBeenCalled();
    game.reset();
    expect(state.dancers.size).toBe(0);
    expect(state.ring.order).toHaveLength(0);
  });

  it('1000 farklı izleyici katılır; kimse kapasite nedeniyle çıkarılmaz', () => {
    for (let i = 0; i < 1000; i++) game.onEvent({
      type: 'comment', id: String(i), at: 0, viewer: viewer(String(i)), text: 'selam',
    });
    expect(state.ring.order).toHaveLength(1000);
    expect(state.dancers.size).toBe(1000);
    game.onEvent({ type: 'like', id: 'likes', at: 0, viewer: viewer('0'), count: 1000 });
    game.update(1 / 60);
    for (const d of state.ring.order) {
      const [, seconds, delay] = d.fall.mock.calls[0];
      expect(seconds).toBeGreaterThan(0);
      expect(seconds + delay).toBeCloseTo(4.5);
    }
  });

  it('gül serisi 1 → 10 → 20 eşiklerinde rol değiştirir; aradaki güller rolü bozmaz', () => {
    const streaks = new GiftStreaks();
    const roles: (string | null)[] = [];
    for (const total of [1, 9, 10, 11, 20, 21]) {
      const result = normalize('gift', {
        user: { userId: 'ayse', nickname: 'Ayşe' }, giftId: '5655', groupId: '1',
        giftDetails: { giftType: 1, diamondCount: 1 }, repeatCount: total,
      }, 0, streaks);
      expect(result.ok).toBe(true);
      if (result.ok && result.event.type === 'gift') game.onEvent(result.event);
      roles.push(state.thrones.damat.dancer ? 'damat' : state.thrones.gelin.dancer ? 'gelin' : 'halaybasi');
    }
    expect(roles).toEqual(['halaybasi', 'halaybasi', 'gelin', 'gelin', 'damat', 'damat']);
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.dancers.size).toBe(1);
  });

  it('aynı anda tek rol: kaynana devralınır, eski sahibi halaya döner', () => {
    game.onEvent(gift('ayse', 10));
    game.onEvent(gift('ayse', 1, '5487'));
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.kaynana.viewer.id).toBe('ayse');
    game.onEvent(gift('fatma', 1, '5487'));
    expect(state.kaynana.viewer.id).toBe('fatma');
    expect(state.ring.order.map((d: any) => d.viewer.id)).toEqual(['ayse']);
    game.onEvent(gift('fatma', 20));
    expect(state.kaynana).toBeNull();
    expect(state.thrones.damat.dancer.viewer.id).toBe('fatma');
  });

  it('kaynana yalnız izleyici rolü alınca halayı durdurur', () => {
    game.update(120);
    expect(state.kaynana).toBeNull();
    game.onEvent(gift('fatma', 1, '5487'));
    game.update(111);
    game.update(3);
    expect(state.kaynanaState.state).toBe('scold');
    game.update(5);
    expect(state.kaynanaState.state).toBe('wander');
  });

  it('çift yokken fırlatma ve tek kişiyle düğün finali hata vermez', () => {
    game.onEvent(gift('ayse', 1, '5585'));
    game.onEvent(gift('ayse', 10));
    game.update(600);
    expect(state.car.arrive).not.toHaveBeenCalled();
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.ring.order).toHaveLength(1);
  });

  it('finalde çift sabit kalır; yeni düğünde çift halaya döner ve roller boşalır', () => {
    game.onEvent(gift('ayse', 10));
    game.onEvent(gift('ali', 20));
    game.update(600);
    expect(state.car.arrive).toHaveBeenCalledWith('ayse ♥ ali');
    game.onEvent(gift('veli', 10));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    game.update(6);
    expect(state.thrones.gelin.dancer.group.visible).toBe(false);
    game.update(6);
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.thrones.damat.dancer).toBeNull();
    expect(state.ring.order).toHaveLength(3);
    expect(state.ring.order.every((d: any) => d.group.visible)).toBe(true);
  });
});

it('menü eşikleri aynı seri içindir; yeni seri tekrar halaybaşı olabilir', () => {
  expect(MENU.filter((m) => m.giftId === '5655').map((m) => m.count)).toEqual([1, 10, 20]);
  expect(momentFor(gift('a', 20))).toBe('damat');
  expect(momentFor(gift('a', 10))).toBe('gelin');
  expect(momentFor(gift('a', 1))).toBe('mendil');
  expect(momentFor(gift('a', 1, '999'))).toBeNull();
});
