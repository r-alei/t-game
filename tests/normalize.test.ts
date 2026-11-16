import { describe, expect, it } from 'vitest';
import { GiftStreaks, cleanName, normalize, normalizeGiftCompletion } from '../server/normalize.ts';
import { Dedupe } from '../server/dedupe.ts';

const user = { userId: '42', nickname: 'Ayşe', profilePicture: { url: ['https://p.example/a.jpg'] } };

describe('normalize', () => {
  it('seri sonunda artış sıfır olsa bile ayrı tamamlama olayı üretir; hediye artışını tekrar saymaz', () => {
    const streaks = new GiftStreaks();
    const raw = { user, giftId: '5655', groupId: 's1', repeatCount: 20, giftDetails: { giftType: 1, diamondCount: 1 } };
    expect(normalize('gift', { ...raw, repeatEnd: false }, 0, streaks)).toMatchObject({ ok: true, event: { type: 'gift', count: 20 } });
    expect(normalize('gift', { ...raw, repeatEnd: true }, 0, streaks)).toMatchObject({ ok: false, reason: 'skip' });
    expect(normalizeGiftCompletion({ ...raw, repeatEnd: true }, 0)).toMatchObject({ ok: true, event: { type: 'gift-finished', count: 20, id: 'finished:gift:42:5655:group:s1' } });
    expect(normalizeGiftCompletion({ ...raw, repeatEnd: false }, 0)).toMatchObject({ ok: false, reason: 'skip' });
    expect(normalizeGiftCompletion({ ...raw, giftDetails: { giftType: 0, diamondCount: 1 }, repeatEnd: true }, 0)).toMatchObject({ ok: false, reason: 'skip' });
  });
  it('yorumu çevirir', () => {
    const r = normalize('comment', { user, comment: ' selam ', common: { msgId: '9' } });
    expect(r).toMatchObject({ ok: true, event: { type: 'comment', text: 'selam', id: 'comment:9' } });
    if (r.ok) expect(r.event.viewer).toEqual({ id: '42', name: 'Ayşe', avatar: 'https://p.example/a.jpg' });
  });

  it('kimliksiz kullanıcıyı reddeder', () => {
    expect(normalize('comment', { user: {}, comment: 'x' })).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('seri hediyede yalnız son güncellemeyi sayar', () => {
    const base = { user, giftId: '5655', groupId: '7', giftDetails: { giftType: 1, diamondCount: 1 } };
    expect(normalize('gift', { ...base, repeatCount: 2, repeatEnd: false })).toMatchObject({ ok: false, reason: 'skip' });
    const end = normalize('gift', { ...base, repeatCount: 3, repeatEnd: true });
    expect(end).toMatchObject({ ok: true, event: { count: 3, value: 3, id: 'gift:42:5655:group:7' } });
  });

  it('seri hediyeyi adet adet, anında verir (GiftStreaks ile)', () => {
    const streaks = new GiftStreaks();
    const base = { user, giftId: '5655', groupId: '7', giftDetails: { giftType: 1, diamondCount: 1 } };
    const step = (repeatCount: number, repeatEnd = false) => normalize('gift', { ...base, repeatCount, repeatEnd }, 0, streaks);
    expect(step(1)).toMatchObject({ ok: true, event: { count: 1, id: 'gift:42:5655:group:7:1' } });
    expect(step(1)).toMatchObject({ ok: false, reason: 'skip' }); // aynı güncelleme tekrar
    expect(step(4)).toMatchObject({ ok: true, event: { count: 3, value: 3 } }); // atlanan güncellemeler toplanır
    expect(step(4, true)).toMatchObject({ ok: false, reason: 'skip' }); // seri sonu, yeni adet yok
    // Aynı grup yeniden başlarsa baştan sayılır
    expect(step(2, true)).toMatchObject({ ok: true, event: { count: 2 } });
  });

  it('değer yoksa bilinen hediye tablosuna düşer, bilinmiyorsa reddeder', () => {
    expect(normalize('gift', { user, giftId: '5712', common: { msgId: '1' } })).toMatchObject({
      ok: true, event: { unitValue: 500, giftName: 'Kupa' },
    });
    expect(normalize('gift', { user, giftId: '999999', common: { msgId: '2' } })).toMatchObject({ ok: false });
  });

  it('http (güvensiz) avatarı kullanmaz', () => {
    const r = normalize('like', { user: { userId: '1', profilePicture: { url: ['http://x'] } }, likeCount: 5 });
    expect(r).toMatchObject({ ok: true, event: { count: 5, viewer: { avatar: '' } } });
  });
});

describe('cleanName', () => {
  it('kontrol karakterlerini atar ve kısaltır', () => {
    expect(cleanName('‮ab\u0000c')).toBe('abc');
    expect([...cleanName('x'.repeat(50))].length).toBe(20);
    expect(cleanName('')).toBe('İzleyici');
  });
});

describe('Dedupe', () => {
  it('aynı kimliği ikinci kez kabul etmez ve sınırı korur', () => {
    const d = new Dedupe(2);
    expect(d.accept('a')).toBe(true);
    expect(d.accept('a')).toBe(false);
    d.accept('b');
    d.accept('c');
    expect(d.accept('a')).toBe(true); // en eski atıldı
  });
});
