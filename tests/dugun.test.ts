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
vi.mock('../client/src/games/dugun/money.ts', () => ({
  MoneyRain: class { burst = vi.fn(); update = vi.fn(); dispose = vi.fn(); },
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
    game.onDayiCue = vi.fn();
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

  it('Donut tek kişiyi ortaya çıkarır, ikinci Donut eskisini halaya döndürür; 12 sn sonra solo biter', () => {
    expect(momentFor(gift('ayse', 1, '5879'))).toBe('ortaya');
    sendGift(gift('ayse', 1, '5879'));
    expect(game.onDayiCue).toHaveBeenLastCalledWith('clap');
    const first = state.dancers.get('ayse');
    expect(state.solo.dancer).toBe(first);
    expect(state.ring.has(first)).toBe(false);
    expect(first.setMendil).toHaveBeenLastCalledWith(true);
    const target = first.walkTo.mock.calls.at(-1)[0];
    expect(Math.hypot(target.x, target.z)).toBeLessThan(1.5);
    expect(target.y).toBe(0);
    expect(target.z).toBeLessThan(0.6);
    first.group.position.copy(target);
    const shot = state.closeUp(first, 'ortaya', 3, 3.5).pose(0);
    expect(shot.pos.y - first.headWorld().y).toBe(5.5);
    expect(state.director.queue.some((s: any) => s.name === 'ortaya kuşbakışı' && s.duration === 8.5)).toBe(true);
    expect(state.hud.announce).toHaveBeenLastCalledWith('💃 ayse ortaya çıktı!');
    sendGift(gift('ali', 1, '5879'));
    expect(state.solo.dancer.viewer.id).toBe('ali');
    expect(state.ring.has(first)).toBe(true);
    expect(first.setMendil).toHaveBeenLastCalledWith(false);
    game.update(12);
    expect(state.solo).toBeNull();
    expect(state.ring.order.map((d: any) => d.viewer.id).sort()).toEqual(['ali', 'ayse']);
  });

  it('ortaya çık rol kilidi ve araba törenine uyar, tören sırasında sonraya birikmez', () => {
    game.onAdmin({ action: 'set-option', option: 'rolesLocked', value: true });
    sendGift(gift('ayse', 1, '5879'));
    expect(state.solo).toBeNull();
    expect(state.ring.has(state.dancers.get('ayse'))).toBe(true);
    game.onAdmin({ action: 'set-option', option: 'rolesLocked', value: false });
    sendGift({ ...gift('gelin', 1, '9999'), giftName: 'Bouquet' }); sendGift(gift('damat', 1, '5658'));
    sendGift(gift('ayse', 1, '5879'));
    game.onAdmin({ action: 'finish-wedding' });
    expect(state.solo).toBeNull();
    sendGift(gift('ali', 1, '5879'));
    expect(state.solo).toBeNull();
    expect(state.thrones.gelin.dancer.viewer.id).toBe('gelin');
    game.update(12);
    expect(state.solo).toBeNull();
  });

  it('solodan başka role atama, silme ve yeni düğün mendili ve solo kaydını temizler', () => {
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    sendGift(gift('ayse', 1, '5879'));
    expect(state.thrones.gelin.dancer).toBeNull();
    game.onAdmin({ action: 'assign', person: { id: 'ayse' }, role: 'davulcu' });
    expect(state.solo).toBeNull();
    expect(state.dancers.get('ayse').setMendil).toHaveBeenLastCalledWith(false);
    sendGift(gift('ali', 1, '5879'));
    game.onAdmin({ action: 'remove', id: 'ali' });
    expect(state.solo).toBeNull();
    sendGift(gift('veli', 1, '5879'));
    game.onAdmin({ action: 'new-wedding' });
    expect(state.solo).toBeNull();
    expect(state.ring.has(state.dancers.get('veli'))).toBe(true);
  });

  it('ortaya eşlemesi panelden değişir; Dayı katılımcı ve hediye rolü değildir', () => {
    game.onAdmin({ action: 'set-gift', rule: { moment: 'ortaya', giftId: '5658', count: 2 } });
    sendGift(gift('ayse', 1, '5879'));
    expect(state.solo).toBeNull();
    sendGift(gift('ali', 2, '5658'));
    expect(state.solo.dancer.viewer.id).toBe('ali');
    expect(game.getAdminState().participants.map((p) => p.viewer.id)).toEqual(['ayse', 'ali']);
    expect(game.getAdminState()).not.toHaveProperty('microphone');
  });

  it('oyun yalnız jest bildirir; sıfırlama ayrı ekranı etkilemez', () => {
    expect(state).not.toHaveProperty('dayi');
    expect(state).not.toHaveProperty('microphone');
    game.onAdmin({ action: 'assign', person: { name: 'Ayşe' }, role: 'gelin' });
    expect(game.onDayiCue).toHaveBeenLastCalledWith('cheer');
    game.onAdmin({ action: 'effect', effect: 'break-halay' });
    expect(game.onDayiCue).toHaveBeenLastCalledWith('shock');
    const callback = game.onDayiCue;
    game.reset();
    expect(game.onDayiCue).toBe(callback);
    expect(game.getAdminState().options).not.toHaveProperty('dayiVisible');
    game.dispose();
  });

  it('GG para efektini yeniler; geç gelen seri sonu aynı adedi tekrar oynatmaz', () => {
    const inc = (n: number, total: number): GiftEvent => ({ ...gift('zeyno', n, '6064'), id: `z${total}`, streakTotal: total });
    game.onEvent(inc(1, 1)); game.onEvent(inc(4, 5));
    tick(0.5);
    expect(state.halaybasi).toBeNull();
    tick(1);
    expect(state.money.burst).toHaveBeenCalledTimes(1);
    expect(state.musicians.davulcu).toBeNull();
    game.onEvent(inc(5, 5));
    tick(1.5);
    expect(state.money.burst).toHaveBeenCalledTimes(2);
    expect(state.musicians.zurnaci).toBeNull();
    // Geç gelen seri sonu (toplam 5) tekrar saymaz
    game.onEvent({ ...gift('zeyno', 5, '6064'), type: 'gift-finished', id: 'fz' } as never);
    tick(1.5);
    expect(state.money.burst).toHaveBeenCalledTimes(2);
    expect(state.thrones.damat.dancer).toBeNull();
  });

  it('artışlar kaçarsa seri sonu toplamı eksikleri tamamlar', () => {
    game.onEvent({ ...gift('ali', 2, '6064'), streakTotal: 2 });
    game.onEvent({ ...gift('ali', 7), type: 'gift-finished', id: 'fa', giftId: '6064' } as never);
    game.onEvent({ ...gift('ali', 10, '6064'), type: 'gift-finished', id: 'fb' } as never);
    expect(state.money.burst).toHaveBeenCalledTimes(2);
    expect(state.musicians.zurnaci).toBeNull();
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

  it('20 gülü aşan seri rol değiştirmez; gelin yoksa takı bildirimi gösterir', () => {
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
    expect(state.thrones.damat.dancer).toBeNull();
    expect(state.halaybasi).toBeNull();
    expect(state.hud.announce).toHaveBeenCalledWith('Ayşe altın gönderdi; gelin rolü henüz boş.');
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.dancers.size).toBe(1);
  });

  it('aynı anda tek rol: kaynana devralınır, eski sahibi halaya döner', () => {
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    sendGift({ ...gift('ayse', 1, 'heart'), unitValue: 10 });
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.kaynana.viewer.id).toBe('ayse');
    sendGift({ ...gift('fatma', 1, 'heart'), unitValue: 10 });
    expect(state.kaynana.viewer.id).toBe('fatma');
    expect(state.ring.order.map((d: any) => d.viewer.id)).toEqual(['ayse']);
    sendGift(gift('fatma', 1, '5658'));
    expect(state.kaynana).toBeNull();
    expect(state.thrones.damat.dancer.viewer.id).toBe('fatma');
  });

  it('kaynana yalnız izleyici rolü alınca halayı durdurur', () => {
    game.update(120);
    expect(state.kaynana).toBeNull();
    sendGift({ ...gift('fatma', 1, 'heart'), unitValue: 10 });
    game.update(111);
    game.update(3);
    expect(state.kaynanaState.state).toBe('scold');
    game.update(5);
    expect(state.kaynanaState.state).toBe('wander');
  });

  it('çift yokken fırlatma ve tek kişiyle düğün finali hata vermez', () => {
    sendGift(gift('ayse', 1, '5585'));
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    game.update(600);
    expect(state.car.arrive).not.toHaveBeenCalled();
    expect(state.thrones.gelin.dancer).toBeNull();
    expect(state.ring.order).toHaveLength(1);
  });

  it('finalde çift sabit kalır; yeni düğünde çift halaya döner ve roller boşalır', () => {
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    sendGift(gift('ali', 1, '5658'));
    game.update(600);
    expect(state.car.arrive).toHaveBeenCalledWith('ayse ♥ ali');
    sendGift({ ...gift('veli', 1, '9999'), giftName: 'Bouquet' });
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

  it('Parmak Kalp halaybaşı yapar; Gül gelinin rolünü bozmadan ona altın takar', () => {
    sendGift(gift('ayse', 1, '5487'));
    expect(state.kaynana).toBeNull();
    expect(state.halaybasi.viewer.id).toBe('ayse');
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    sendGift(gift('ayse', 1));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    expect(state.halaybasi).toBeNull();
    expect(state.coins).toHaveLength(1);
    expect(state.coins[0].to).toBe(state.thrones.gelin.dancer);
    expect(state.hud.announce).toHaveBeenCalledWith('ayse geline altın taktı!');
  });

  it('kısa aralıkla gelen her Gül tekrar altın takar; hedef yalnız gelindir', () => {
    game.onAdmin({ action: 'assign', person: { name: 'Gelin' }, role: 'gelin' });
    game.onAdmin({ action: 'assign', person: { name: 'Damat' }, role: 'damat' });
    game.onEvent(gift('ali', 1)); tick(1.3);
    game.onEvent(gift('ali', 1)); tick(1.3);
    expect(state.coins).toHaveLength(2);
    expect(state.coins.every((c: any) => c.to === state.thrones.gelin.dancer)).toBe(true);
  });

  it('davulcu panelden, zurnacı Çay ile atanır; rol devri tek rol kuralını korur', () => {
    game.onAdmin({ action: 'assign', person: { name: 'ali' }, role: 'davulcu' });
    const aliId = 'manual:ali';
    sendGift({ ...gift('veli', 1, 'real-tea'), giftName: 'Çay' });
    expect(game.getAdminState().participants.find((p) => p.role === 'davulcu')?.viewer.id).toBe(aliId);
    expect(game.getAdminState().participants.find((p) => p.role === 'zurnaci')?.viewer.id).toBe('veli');
    expect(state.ring.order).toHaveLength(0);
    game.onAdmin({ action: 'assign', person: { id: aliId }, role: 'zurnaci' });
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
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
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
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    sendGift(gift('ali', 1, '5658'));
    game.onAdmin({ action: 'camera', view: 'person', id: 'ayse' });
    game.onAdmin({ action: 'remove', id: 'ayse' });
    expect(game.getAdminState().camera).toBe('auto');
    expect(game.getAdminState().participants.map((p) => p.viewer.id)).toEqual(['ali']);
    expect(state.thrones.gelin.dancer).toBeNull();
    game.update(1 / 60);
  });

  it('tören sırasında panel düzenlemesi görünmez kişi bırakmadan töreni kapatır', () => {
    sendGift({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' }); sendGift(gift('ali', 1, '5658'));
    game.onAdmin({ action: 'finish-wedding' }); game.update(6);
    expect(state.thrones.gelin.dancer.group.visible).toBe(false);
    game.onAdmin({ action: 'assign', person: { name: 'Veli' }, role: 'damat' });
    expect(game.getAdminState().phase).toBe('wedding');
    expect(state.dancers.get('ayse').group.visible).toBe(true);
    expect(state.dancers.get('ali').group.visible).toBe(true);
    expect(game.getAdminState().participants.find((p) => p.role === 'damat')?.viewer.name).toBe('Veli');
  });

  it('panelden hediye eşlemesi değişir; çakışan eşik kabul edilmez', () => {
    game.onAdmin({ action: 'set-gift', rule: { moment: 'gelin', giftId: '8750', count: 1 } });
    sendGift(gift('ayse', 1, '8750'));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    game.onAdmin({ action: 'set-gift', rule: { moment: 'damat', giftId: '8750', count: 1 } });
    expect(game.getAdminState().giftRules.find((rule) => rule.moment === 'damat')?.giftId).toBe('5658');
  });

  it('Buket adı ve kimliği aynı sayacı kullanır; gerçek kimlikte ad eşleşmesi kapanır', () => {
    game.onEvent({ ...gift('ayse', 1, '9999'), giftName: 'Bouquet' });
    game.onEvent({ ...gift('ayse', 1, 'bouquet'), giftName: 'Buket', type: 'gift-finished' });
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    expect(state.giftTally.size).toBe(1);
    expect([...state.giftTally.values()][0].total).toBe(1);
    game.onAdmin({ action: 'set-gift', rule: { moment: 'gelin', giftId: '9999', count: 1 } });
    sendGift({ ...gift('ali', 1, '8888'), giftName: 'Bouquet' });
    expect(state.thrones.gelin.dancer.viewer.id).toBe('ayse');
    sendGift(gift('veli', 1, '9999'));
    expect(state.thrones.gelin.dancer.viewer.id).toBe('veli');
    expect(game.getAdminState().giftRules.find((r) => r.moment === 'gelin')?.giftName).toBeUndefined();
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

it('gül yalnız takı, Parmak Kalp yalnız halaybaşı, GG yalnız para efektidir', () => {
  expect(MENU.filter((m) => m.giftId === '5655').map((m) => m.count)).toEqual([1]);
  expect(momentFor(gift('a', 20))).toBe('ceyrek');
  expect(momentFor(gift('a', 10))).toBe('ceyrek');
  expect(momentFor(gift('a', 1))).toBe('ceyrek');
  expect(momentFor(gift('a', 1, '5487'))).toBe('mendil');
  expect(momentFor(gift('a', 10, '6064'))).toBe('para');
  expect(momentFor(gift('a', 1, '999'))).toBeNull();
});

it('normal Kalp 10 jeton olmalıdır; Parmak Kalp ve diğer kalplerle karışmaz', () => {
  expect(momentFor({ ...gift('a', 1, 'real-heart'), giftName: 'Heart', unitValue: 10 })).toBe('kaynana');
  expect(momentFor({ ...gift('a', 1, 'real-heart'), giftName: 'Kalp', unitValue: 10 })).toBe('kaynana');
  expect(momentFor({ ...gift('a', 1, 'real-heart'), giftName: 'Heart', unitValue: 1 })).toBeNull();
  expect(momentFor({ ...gift('a', 1, 'other'), giftName: 'Finger Heart', unitValue: 10 })).toBeNull();
  expect(momentFor({ ...gift('a', 1, 'other'), giftName: 'Heart Me', unitValue: 10 })).toBeNull();
  expect(momentFor({ ...gift('a', 1, 'other'), giftName: 'Team', unitValue: 1 })).toBeNull();
  expect(momentFor({ ...gift('a', 1, 'real-tea'), giftName: 'Tea' })).toBe('zurnaci');
});

it('Parfüm damat, bilinmeyen kimlikli Bouquet ve Türkçe Buket gelin yapar', () => {
  expect(momentFor(gift('a', 1, '5658'))).toBe('damat');
  for (const giftName of ['Bouquet', 'BÜYÜK BUKET', 'Flower Bouquet']) {
    expect(momentFor({ ...gift('a', 1, '9999'), giftName })).toBe('gelin');
  }
});
