import { describe, expect, it } from 'vitest';
import { cleanName, normalize } from '../server/normalize.ts';
import { Dedupe } from '../server/dedupe.ts';

const user = { userId: '42', nickname: 'Ayşe', profilePicture: { url: ['https://p.example/a.jpg'] } };

describe('normalize', () => {
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
