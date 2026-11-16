/**
 * Düğün Dernek ayarları. Hediye → an eşlemesi ve süreler tek yerde durur.
 */
import type { GiftEvent } from '../../../../shared/events.ts';

export type MomentId =
  | 'ortaya'   // ortada mendilli solo
  | 'ceyrek'   // çeyrek altın takılır, sunucu adını bağırır
  | 'para'     // dekoratif oyun banknotları saçılır
  | 'mendil'   // halaybaşı ol
  | 'gelin'    // gelin ol
  | 'damat'    // damat ol
  | 'kaynana'
  | 'davulcu'
  | 'zurnaci'
  | 'havaya';  // damadı havaya atın

export interface MenuItem {
  giftId: string;
  giftName?: string;
  count: number;
  icon: string;
  label: string;
  moment: MomentId;
}

/** Yönetim eşlemeleri; yayında menü çizilmez. */
export const MENU: readonly MenuItem[] = [
  { giftId: '5879', count: 1, icon: '/gifts/doughnut.webp', label: 'ORTAYA ÇIK', moment: 'ortaya' },
  { giftId: '5655', count: 1, icon: '/gifts/rose.webp', label: 'GELİNE ALTIN', moment: 'ceyrek' },
  { giftId: '5487', count: 1, icon: '/gifts/finger-heart.webp', label: 'HALAYBAŞI', moment: 'mendil' },
  { giftId: 'bouquet', giftName: 'bouquet', count: 1, icon: '/gifts/unknown.svg', label: 'GELİN OL', moment: 'gelin' },
  { giftId: '5658', count: 1, icon: '/gifts/perfume.webp', label: 'DAMAT OL', moment: 'damat' },
  { giftId: 'tea', giftName: 'tea', count: 1, icon: '/gifts/unknown.svg', label: 'ZURNACI', moment: 'zurnaci' },
  { giftId: '6064', count: 1, icon: '/gifts/gg.webp', label: 'OYUN PARASI', moment: 'para' },
  { giftId: 'heart', giftName: 'heart', count: 1, icon: '/gifts/unknown.svg', label: 'KAYNANA', moment: 'kaynana' },
  { giftId: '5585', count: 1, icon: '/gifts/confetti.webp', label: 'HAVAYA AT', moment: 'havaya' },
];

/** Doğrulanmış kimlik veya tanımlı hediye adı; iki Kalp türü birbirinden ayrılır. */
export function giftMatches(
  rule: { giftId: string; giftName?: string },
  event: { giftId: string; giftName?: string; unitValue?: number },
): boolean {
  if (rule.giftId === 'heart' && event.unitValue !== undefined && event.unitValue !== 10) return false;
  if (rule.giftId === event.giftId) return true;
  if (!rule.giftName) return false;
  const name = event.giftName?.toLowerCase() ?? '';
  const expected = rule.giftName.toLowerCase();
  const canonical = name.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (expected === 'tea') return ['tea', 'cay', 'turkish tea', 'turk cayi', 'tea cup'].includes(canonical);
  if (expected === 'heart') return ['heart', 'kalp', 'normal kalp'].includes(canonical);
  return name.includes(expected) || (expected === 'bouquet' && name.includes('buket'));
}

/** Ulaşılan en yüksek yeni eşik seçilir. */
export function momentFor(event: GiftEvent, menu: readonly MenuItem[] = MENU): MomentId | null {
  const total = event.streakTotal ?? event.count;
  const previous = total - event.count;
  return menu.filter((m) => giftMatches(m, event) && m.count > previous && m.count <= total)
    .sort((a, b) => b.count - a.count)[0]?.moment ?? null;
}

export const TEMPO = {
  /** Davulun dinlenme hızı (vuruş/dk) */
  base: 96,
  /** Her beğeninin eklediği hız */
  perLike: 0.6,
  /** Bunu geçince halay zinciri kopar */
  breakAt: 168,
  /** Saniyede dinlenme hızına dönüş */
  decay: 2.2,
  /** Kopunca yerde kalma süresi (sn) */
  fallenSeconds: 4.5,
} as const;

export const TIMING = {
  /** Bir düğünün süresi; sonunda gelin arabası kalkar, yeni düğün başlar */
  weddingSeconds: 600,
  /** Son geri sayım */
  countdownSeconds: 30,
  /** Gelin arabası töreni */
  carSeconds: 12,
  tagSeconds: 7,
  bubbleSeconds: 4,
  /** Kaynananın müziği kesme aralığı (sn, rastgele bu aralıkta) */
  kaynanaEvery: [70, 110] as const,
  kaynanaStopSeconds: 4,
} as const;

/** Figür ölçüleri (dancers.ts) */
export const BODY = {
  /** Omuz ekleminin gövde ortasından uzaklığı ve yüksekliği */
  shoulderX: 0.31,
  shoulderY: 1.45,
  /** Üst kol ve ön kol boyu: el, komşunun eline bu erimde uzanır */
  upperArm: 0.33,
  foreArm: 0.31,
  /** Bacak ucunun y'si: meydan döşemesi y=0.03'te, ayak onun hemen üstünde */
  footLift: 0.035,
} as const;

/** Halay halkası */
export const RING = {
  /** Kişiler arası yay uzunluğu */
  spacing: 1.05,
  minRadius: 4.2,
  /** Dış sıra bundan büyümez: halka pistte ve kadrajda kalır */
  maxRadius: 8.5,
  /** Dış sıra dolunca içeride yeni sıra açılır; sıralar arası mesafe */
  rowGap: 1.5,
  maxRows: 3,
  /** Bir sıranın çemberin kaplayabileceği oranı (baş ile son arasında boşluk kalır) */
  arc: 0.85,
} as const;
