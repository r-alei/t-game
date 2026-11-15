/**
 * Düğün Var! ayarları. Hediye → an eşlemesi ve süreler tek yerde durur.
 */
import type { GiftTier } from '../../../../shared/gifts.ts';

export type MomentId =
  | 'ceyrek'   // çeyrek altın takılır, sunucu adını bağırır
  | 'mendil'   // halaybaşı ol
  | 'gelin'    // gelin ol
  | 'damat'    // damat ol
  | 'havaya';  // damadı havaya atın

export interface MenuItem {
  giftId: string;
  icon: string;
  label: string;
  moment: MomentId;
}

/** Ekrandaki hediye menüsü (tek satır) */
export const MENU: readonly MenuItem[] = [
  { giftId: '5655', icon: '/gifts/rose.webp', label: 'ÇEYREK', moment: 'ceyrek' },
  { giftId: '5487', icon: '/gifts/finger-heart.webp', label: 'MENDİL', moment: 'mendil' },
  { giftId: '5658', icon: '/gifts/perfume.webp', label: 'GELİN OL', moment: 'gelin' },
  // Damat için ~20 jetonluk ikinci hediye: gerçek odanın kataloğundan seçilip burada değiştirilmeli
  { giftId: '5879', icon: '/gifts/doughnut.webp', label: 'DAMAT OL', moment: 'damat' },
  { giftId: '5585', icon: '/gifts/confetti.webp', label: 'HAVAYA AT', moment: 'havaya' },
];

/** Menüde olmayan hediyeler değerine göre bu anlara düşer */
export const TIER_FALLBACK: Record<GiftTier, MomentId> = {
  small: 'ceyrek',
  medium: 'ceyrek',
  large: 'havaya',
};

export function momentFor(giftId: string, tier: GiftTier): MomentId {
  return MENU.find((m) => m.giftId === giftId)?.moment ?? TIER_FALLBACK[tier];
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
  /** Halkadaki en fazla kişi; fazlası olunca en eski sessiz halaycı çıkar */
  max: 36,
  /** Gerçek izleyici azsa halkayı dolduran isimsiz misafirler */
  minCrowd: 10,
  /** Kişiler arası yay uzunluğu */
  spacing: 1.05,
  minRadius: 4.2,
} as const;
