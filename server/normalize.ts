/**
 * tiktok-live-connector'ın ham olaylarını ortak LiveEvent biçimine çevirir.
 * Saf fonksiyondur; test edilebilir, ağa dokunmaz.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { LiveEvent, LiveEventType, Viewer } from '../shared/events.ts';
import { findGift } from '../shared/gifts.ts';

// Ham veri kütüphane sürümüne göre değiştiği için gevşek tipliyoruz.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

export type NormalizeResult =
  | { ok: true; event: LiveEvent }
  | { ok: false; reason: 'skip' | 'invalid'; detail?: string };

const MAX_NAME = 20;

/**
 * Seri hediyelerin (gül vb.) o ana kadar sayılmış adedi. TikTok seri sürerken artan toplamla
 * ara güncellemeler gönderir; her güncellemede yalnız yeni eklenen adet olay olur, böylece
 * her gül ekranda o saniye karşılık bulur. Seri bitince kayıt silinir.
 */
export class GiftStreaks {
  private readonly counted = new Map<string, number>();
  constructor(private readonly limit = 5_000) {}

  /** Bu güncellemeyle eklenen adet (0 ise yeni bir şey yok) */
  delta(key: string, total: number, end: boolean): number {
    const before = this.counted.get(key) ?? 0;
    if (end) this.counted.delete(key);
    else {
      this.counted.delete(key); // ekleme sırası: en son güncellenen sona
      this.counted.set(key, Math.max(before, total));
      if (this.counted.size > this.limit) {
        const oldest = this.counted.keys().next().value;
        if (oldest !== undefined) this.counted.delete(oldest);
      }
    }
    return Math.max(0, total - before);
  }
}

function positiveInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function cleanName(input: unknown): string {
  const text = String(input ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f​-‏‪-‮]/g, '')
    .trim();
  if (!text) return 'İzleyici';
  return [...text].slice(0, MAX_NAME).join('');
}

function viewerOf(raw: Raw): Viewer | null {
  const user = raw.user ?? {};
  const id = String(user.userId ?? user.id ?? raw.userId ?? '');
  if (!id || id === '0') return null;
  const image = user.profilePicture ?? user.avatarThumb ?? {};
  const urls: unknown[] = image.url ?? image.urlList ?? image.url_list ?? [];
  const avatar =
    urls.find((u): u is string => typeof u === 'string' && u.startsWith('https://')) ??
    (typeof raw.profilePictureUrl === 'string' && raw.profilePictureUrl.startsWith('https://')
      ? raw.profilePictureUrl
      : '');
  return {
    id,
    name: cleanName(user.nickname ?? user.uniqueId ?? raw.nickname ?? raw.uniqueId),
    avatar,
  };
}

function messageId(type: LiveEventType, raw: Raw, viewer: Viewer): string {
  const msg = String(raw.common?.msgId ?? raw.msgId ?? '');
  if (msg && msg !== '0') return `${type}:${msg}`;
  const created = raw.common?.createTime;
  if (created) {
    const hash = createHash('sha1')
      .update(JSON.stringify([type, viewer.id, created, raw.comment ?? raw.content, raw.likeCount]))
      .digest('hex');
    return `${type}:${hash}`;
  }
  return `${type}:${randomUUID()}`;
}

/**
 * `streaks` verilirse seri hediyeler adet adet (artış olarak) gelir; verilmezse eski davranış:
 * yalnız seri sonundaki toplam sayılır.
 */
export function normalize(type: LiveEventType, raw: Raw, now = Date.now(), streaks?: GiftStreaks): NormalizeResult {
  const viewer = viewerOf(raw);
  if (!viewer) return { ok: false, reason: 'invalid', detail: 'kullanıcı kimliği yok' };
  const base = { at: now, viewer };

  switch (type) {
    case 'comment': {
      const text = String(raw.comment ?? raw.content ?? '').trim().slice(0, 200);
      if (!text) return { ok: false, reason: 'skip' };
      return { ok: true, event: { ...base, type, id: messageId(type, raw, viewer), text } };
    }
    case 'like': {
      const count = positiveInt(raw.likeCount ?? raw.count) ?? 1;
      return { ok: true, event: { ...base, type, id: messageId(type, raw, viewer), count } };
    }
    case 'gift': {
      const giftId = String(raw.giftId ?? raw.giftDetails?.id ?? '');
      const details = raw.giftDetails ?? raw.gift ?? {};
      // Tür 1 = seri hediye (gül vb.). Seri sürerken artan toplamla ara güncellemeler gelir.
      const giftType = Number(details.giftType ?? raw.giftType);
      const streak = giftType === 1;
      if (streak && !raw.repeatEnd && !streaks) return { ok: false, reason: 'skip' };

      const known = findGift(giftId);
      const unitValue = positiveInt(details.diamondCount ?? raw.diamondCount) ?? known?.diamonds ?? null;
      if (!unitValue) return { ok: false, reason: 'invalid', detail: `hediye ${giftId} değeri bilinmiyor` };
      const total = positiveInt(raw.repeatCount) ?? 1;

      const group = String(raw.groupId ?? '');
      let stable = group && group !== '0' ? `group:${group}` : messageId('gift', raw, viewer);
      let count = total;
      if (streak && streaks) {
        const key = group && group !== '0' ? `${viewer.id}:${giftId}:${group}` : `${viewer.id}:${giftId}`;
        count = streaks.delta(key, total, Boolean(raw.repeatEnd));
        if (count === 0) return { ok: false, reason: 'skip' };
        // Her artış ayrı olay: kimlik o ana kadarki toplamı içerir (tekrar gelirse dedupe eler)
        stable = `${stable}:${total}`;
      }
      return {
        ok: true,
        event: {
          ...base,
          type,
          id: `gift:${viewer.id}:${giftId}:${stable}`,
          giftId,
          giftName: String(details.giftName ?? details.name ?? known?.name ?? 'Hediye'),
          count,
          ...(streak ? { streakTotal: total } : {}),
          unitValue,
          value: unitValue * count,
        },
      };
    }
    case 'follow':
    case 'share':
    case 'join':
      return { ok: true, event: { ...base, type, id: messageId(type, raw, viewer) } };
  }
}
