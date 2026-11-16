import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GiftEvent, Viewer } from '../shared/events.ts';
import { GiftStreaks, normalize, normalizeGiftCompletion } from '../server/normalize.ts';
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
    group = new THREE.Group(); arrive = vi.fn(); leave = vi.fn(); update = vi.fn(); reset = vi.fn();
  },
}));
vi.mock('../client/src/games/dugun/hud.ts', () => ({
  Hud: class {
    setTempo = vi.fn(); setClock = vi.fn(); setCountdown = vi.fn();
    announce = vi.fn(); flash = vi.fn(); dispose = vi.fn();
    setVisible = vi.fn();
    setMenu = vi.fn();
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
    fall = vi.fn(); update = vi.fn(); throwUp = vi.fn(); dispose = vi.fn(); settle = vi.fn();
    headWorld() { return this.group.position.clone(); }
  },
}));

import { DugunGame } from '../client/src/games/dugun/DugunGame.ts';

const viewer = (id: string): Viewer => ({ id, name: id, avatar: '' });
const gift = (name: string, count: number, giftId = '5655'): GiftEvent => ({
  type: 'gift', id: `${name}-${count}`, at: 0, viewer: viewer(name),
  count, giftId, giftName: 'test', unitValue: 1, value: count,
});

describe('proto v3 hediye alanları', () => {
  it('gift.type = 1 olan gül serisi adet adet gelir ve sonda toplamı verir', () => {
    const streaks = new GiftStreaks();
    const raw = (repeatCount: number, repeatEnd: number) => ({
      giftId: 5655, repeatCount, repeatEnd, groupId: '1794831734189',
      user: { userId: '42', nickname: 'Zeyno' },
      gift: { name: 'Rose', type: 1, combo: true, diamondCount: 1 },
    });
    const counts = [1, 2, 3, 3].map((n, i) => normalize('gift', raw(n, i === 3 ? 1 : 0), 0, streaks));
    expect(counts.map((r) => (r.ok && r.event.type === 'gift' ? r.event.count : 0))).toEqual([1, 1, 1, 0]);
    const ids = counts.flatMap((r) => (r.ok ? [r.event.id] : []));
    expect(new Set(ids).size).toBe(3);
    const done = normalizeGiftCompletion(raw(3, 1));
    expect(done.ok && done.event.type === 'gift-finished' && done.event.count).toBe(3);
  });
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
  /** Hediye gönderir ve sayacın oturmasını bekler (sonraki hediye ayrı sayılır) */
  const sendGift = (e: GiftEvent) => {
    game.onEvent(e);
    state.now += 31;
    state.updateGiftTally();
  };
  const tick = (seconds: number) => {
    state.now += seconds;
    state.updateGiftTally();
  };

  it('seri bitişi beklenmeden rol verilir; kısa arayla gelen ayrı seriler toplanır', () => {
    const inc = (n: number, total: number): GiftEvent => ({ ...gift('zeyno', n), id: `z${total}`, streakTotal: total });
    game.onEvent(inc(1, 1)); game.onEvent(inc(4, 5));
    tick(0.5);
    expect(state.halaybasi).toBeNull();
    tick(1);
    expect(state.halaybasi?.viewer.id).toBe('zeyno');
    // Seri bitti sinyali hiç gelmedi; ikinci seri 5 gül daha: toplam 10 = gelin
    game.onEvent(inc(5, 5));
    tick(1.5);
    expect(state.thrones.gelin.dancer?.viewer.id).toBe('zeyno');
    // Geç gelen seri sonu (toplam 5) tekrar saymaz
    game.onEvent({ ...gift('zeyno', 5), type: 'gift-finished', id: 'fz' } as never);
    tick(1.5);
    expect(state.thrones.damat.dancer).toBeNull();
  });

  it('artışlar kaçarsa seri sonu toplamı eksikleri tamamlar', () => {
    game.onEvent({ ...gift('ali', 2), streakTotal: 2 });
    game.onEvent({ ...gift('ali', 7), type: 'gift-finished', id: 'fa', giftId: '6064' } as never);
    game.onEvent({ ...gift('ali', 10), type: 'gift-finished', id: 'fb' } as never);
    expect(state.thrones.gelin.dancer?.viewer.id).toBe('ali');
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

  it('gül serisinde ara roller verilmez; seri bitince tek kez en yüksek rol atanır', () => {
    const streaks = new GiftStreaks();
    for (const total of [1, 9, 10, 11, 20, 21]) {
      const result = normalize('gift', {
        user: { userId: 'ayse', nickname: 'Ayşe' }, giftId: '5655', groupId: '1',
        giftDetails: { giftType: 1, diamondCount: 1 }, repeatCount: total,
      }, 0, streaks);
      expect(result.ok).toBe(true);
      if (result.ok && result.event.type === 'gift') game.onEvent(result.event);
      expect(state.thrones.damat.dancer).toBeNull();
      expect(state.thrones.gelin.dancer).toBeNull();
      expect(state.halaybasi).toBeNull();
    }
    const completed = normalizeGiftCompletion({ user: { userId: 'ayse', nickname: 'Ayşe' }, giftId: '5655', groupId: '1',
      giftDetails: { giftType: 1, diamondCount: 1 }, repeatCount: 21, repeatEnd: true });
    if (completed.ok) game.onEvent(completed.event);
    expect(state.thrones.damat.dancer.viewer.id).toBe('ayse');
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.dancers.size).toBe(1);
  });

  it('aynı anda tek rol: kaynana devralınır, eski sahibi halaya döner', () => {
    sendGift(gift('ayse', 10));
    sendGift(gift('ayse', 10, '5487'));
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.kaynana.viewer.id).toBe('ayse');
    sendGift(gift('fatma', 10, '5487'));
    expect(state.kaynana.viewer.id).toBe('fatma');
    expect(state.ring.order.map((d: any) => d.viewer.id)).toEqual(['ayse']);
    sendGift(gift('fatma', 20));
    expect(state.kaynana).toBeNull();
    expect(state.thrones.damat.dancer.viewer.id).toBe('fatma');
  });

  it('kaynana yalnız izleyici rolü alınca halayı durdurur', () => {
    game.update(120);
    expect(state.kaynana).toBeNull();
    sendGift(gift('fatma', 10, '5487'));
    game.update(111);
    game.update(3);
    expect(state.kaynanaState.state).toBe('scold');
    game.update(5);
    expect(state.kaynanaState.state).toBe('wander');
  });

  it('çift yokken fırlatma ve tek kişiyle düğün finali hata vermez', () => {
    sendGift(gift('ayse', 1, '5585'));
    sendGift(gift('ayse', 10));
    game.update(600);
    expect(state.car.arrive).not.toHaveBeenCalled();
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.ring.order).toHaveLength(1);
  });

  it('finalde çift sabit kalır; yeni düğünde çift halaya döner ve roller boşalır', () => {
    sendGift(gift('ayse', 10));
    sendGift(gift('ali', 20));
    game.update(600);
    expect(state.car.arrive).toHaveBeenCalledWith('ayse ♥ ali');
    sendGift(gift('veli', 10));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    game.update(6);
    expect(state.thrones.gelin.dancer.group.visible).toBe(false);
    game.update(6);
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.thrones.damat.dancer).toBeNull();
    expect(state.ring.order).toHaveLength(3);
    expect(state.ring.order.every((d: any) => d.group.visible)).toBe(true);
  });

  it('panelden başlangıç rolleri atanır; aynı isim tekrar karakter oluşturmaz', () => {
    game.onAdmin({ action: 'assign', person: { name: 'Ayşe' }, role: 'gelin' });
    game.onAdmin({ action: 'assign', person: { name: 'Ali' }, role: 'damat' });
    game.onAdmin({ action: 'assign', person: { name: 'AYŞE' }, role: 'kaynana' });
    const snapshot = game.getAdminState();
    expect(snapshot.participants).toHaveLength(2);
    expect(snapshot.participants.find((p) => p.role === 'kaynana')?.viewer.name).toBe('Ayşe');
    expect(snapshot.participants.filter((p) => p.role === 'gelin')).toHaveLength(0);
    game.onAdmin({ action: 'assign', person: { id: 'manual:ayşe' }, role: 'halaybasi' });
    expect(game.getAdminState().participants.find((p) => p.role === 'halaybasi')?.viewer.id).toBe('manual:ayşe');
    expect(state.kaynana).toBeNull();
  });

  it('tek Parmak Kalp kaynana yapmaz; küçük gül mevcut gelin/damat rolünü bozmaz', () => {
    sendGift(gift('ayse', 1, '5487'));
    expect(state.kaynana).toBeNull();
    sendGift(gift('ayse', 10));
    sendGift(gift('ayse', 1));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    expect(state.halaybasi).toBeNull();
  });

  it('GG eşikleri çalgıcıları atar, rol devri ve panelden boşaltma tek rol kuralını korur', () => {
    sendGift(gift('ali', 5, '6064'));
    sendGift(gift('veli', 10, '6064'));
    expect(game.getAdminState().participants.find((p) => p.role === 'davulcu')?.viewer.id).toBe('ali');
    expect(game.getAdminState().participants.find((p) => p.role === 'zurnaci')?.viewer.id).toBe('veli');
    expect(state.ring.order).toHaveLength(0);
    game.onAdmin({ action: 'assign', person: { id: 'ali' }, role: 'zurnaci' });
    expect(state.musicians.davulcu).toBeNull();
    expect(state.ring.order.map((d: any) => d.viewer.id)).toEqual(['veli']);
    game.onAdmin({ action: 'clear-role', role: 'zurnaci' });
    expect(state.ring.order).toHaveLength(2);
    expect(game.getAdminState().participants.every((p) => p.role === 'guest')).toBe(true);
  });

  it('etkileşim kapalıyken sohbetten seçilen kişi gerçek hesabıyla sahneye eklenir', () => {
    game.onAdmin({ action: 'set-option', option: 'interactionsEnabled', value: false });
    const author = { id: 'real-42', name: 'Ayşe', avatar: '' };
    game.onAdmin({ action: 'assign', person: { viewer: author }, role: 'gelin' });
    game.onAdmin({ action: 'assign', person: { viewer: author }, role: 'damat' });
    expect(game.getAdminState().participants).toEqual([{ viewer: author, role: 'damat', manual: false }]);
  });

  it('rol kilidi hediyeyi engeller; panel yöneticisi kilitliyken de rol atayabilir', () => {
    game.onAdmin({ action: 'set-option', option: 'rolesLocked', value: true });
    sendGift(gift('ayse', 10));
    expect(state.thrones.gelin.dancer).toBeNull();
    game.onAdmin({ action: 'assign', person: { id: 'ayse' }, role: 'gelin' });
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    game.onAdmin({ action: 'set-option', option: 'interactionsEnabled', value: false });
    sendGift(gift('veli', 20));
    expect(state.dancers.has('veli')).toBe(false);
  });

  it('panelden süre değiştirilir ve yeni düğün ayarlanan süreyi kullanır', () => {
    game.onAdmin({ action: 'set-duration', value: 90 });
    game.update(10);
    expect(game.getAdminState().remainingSeconds).toBe(80);
    game.onAdmin({ action: 'set-time', value: 20 });
    expect(game.getAdminState().remainingSeconds).toBe(20);
    game.onAdmin({ action: 'new-wedding' });
    expect(game.getAdminState().remainingSeconds).toBe(90);
  });

  it('kişiyi kaldırmak rolü ve sabit kamerayı temizler; diğer kişiler kalır', () => {
    sendGift(gift('ayse', 10));
    sendGift(gift('ali', 20));
    game.onAdmin({ action: 'camera', view: 'person', id: 'ayse' });
    game.onAdmin({ action: 'remove', id: 'ayse' });
    expect(game.getAdminState().camera).toBe('auto');
    expect(game.getAdminState().participants.map((p) => p.viewer.id)).toEqual(['ali']);
    expect(state.thrones.gelin.dancer).toBeNull();
    game.update(1 / 60);
  });

  it('tören sırasında panel düzenlemesi görünmez kişi bırakmadan töreni kapatır', () => {
    sendGift(gift('ayse', 10)); sendGift(gift('ali', 20));
    game.onAdmin({ action: 'finish-wedding' }); game.update(6);
    expect(state.thrones.gelin.dancer.group.visible).toBe(false);
    game.onAdmin({ action: 'assign', person: { name: 'Veli' }, role: 'damat' });
    expect(game.getAdminState().phase).toBe('wedding');
    expect(state.dancers.get('ayse').group.visible).toBe(true);
    expect(state.dancers.get('ali').group.visible).toBe(true);
    expect(game.getAdminState().participants.find((p) => p.role === 'damat')?.viewer.name).toBe('Veli');
  });

  it('panelden hediye eşlemesi değişir; çakışan eşik kabul edilmez', () => {
    game.onAdmin({ action: 'set-gift', rule: { moment: 'gelin', giftId: '5658', count: 1 } });
    sendGift(gift('ayse', 1, '5658'));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    game.onAdmin({ action: 'set-gift', rule: { moment: 'damat', giftId: '5658', count: 1 } });
    expect(game.getAdminState().giftRules.find((rule) => rule.moment === 'damat')?.giftId).toBe('5655');
  });

  it('otomatik kaynana kapalıyken panelden müdahale yine çalışır', () => {
    game.onAdmin({ action: 'assign', person: { name: 'Fatma' }, role: 'kaynana' });
    game.onAdmin({ action: 'set-option', option: 'kaynanaEnabled', value: false });
    game.onAdmin({ action: 'effect', effect: 'scold' });
    expect(game.getAdminState().musicPlaying).toBe(false);
    game.update(5);
    expect(game.getAdminState().musicPlaying).toBe(true);
  });
});

it('menü eşikleri aynı seri içindir; yeni seri tekrar halaybaşı olabilir', () => {
  expect(MENU.filter((m) => m.giftId === '5655').map((m) => m.count)).toEqual([1, 10, 20]);
  expect(momentFor(gift('a', 20))).toBe('damat');
  expect(momentFor(gift('a', 10))).toBe('gelin');
  expect(momentFor(gift('a', 1))).toBe('mendil');
  expect(momentFor(gift('a', 1, '999'))).toBeNull();
});
