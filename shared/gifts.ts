/**
 * Bilinen TikTok hediyeleri. Kimlikler önceki projede gerçek odadan alınmıştı;
 * yine de yayına çıkmadan önce oda kataloğuyla doğrulanmalı.
 * Oyun hediyeyi ADINA göre değil, kademesine (tier) göre yorumlar.
 */

export type GiftTier = 'small' | 'medium' | 'large';

export interface GiftInfo {
  id: string;
  name: string;
  diamonds: number;
}

export const KNOWN_GIFTS: readonly GiftInfo[] = [
  { id: '5655', name: 'Gül', diamonds: 1 },
  { id: '5487', name: 'Parmak Kalp', diamonds: 5 },
  { id: '6064', name: 'GG', diamonds: 1 },
  { id: '5879', name: 'Donut', diamonds: 30 },
  { id: '5658', name: 'Parfüm', diamonds: 20 },
  { id: '5585', name: 'Konfeti', diamonds: 100 },
  { id: '8750', name: 'Mikrofon', diamonds: 100 },
  { id: '6097', name: 'Küçük Taç', diamonds: 99 },
  { id: '6267', name: 'Corgi', diamonds: 299 },
  { id: '5712', name: 'Kupa', diamonds: 500 },
];

export function findGift(id: string): GiftInfo | undefined {
  return KNOWN_GIFTS.find((g) => g.id === id);
}

/** Toplam değere göre kademe: 1–9 küçük, 10–99 orta, 100+ büyük */
export function tierOf(value: number): GiftTier {
  if (value >= 100) return 'large';
  if (value >= 10) return 'medium';
  return 'small';
}
