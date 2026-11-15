/**
 * Boğaz Vapuru ayarları. Hediye → an eşlemesi tek yerde durur;
 * yeni an eklemek ya da hediyeyi değiştirmek için yalnız bu dosya değişir.
 */
import type { GiftTier } from '../../../../shared/gifts.ts';

export type MomentId =
  | 'simit'      // martılar sana gelir
  | 'duduk'      // vapur düdüğü
  | 'cay'        // çay ocağından çay
  | 'foto'       // hatıra fotoğrafı (flaş + polaroid)
  | 'onGuverte'  // en öne geç
  | 'konfeti'    // güverteye konfeti, adın göğe yazılır
  | 'sarki'      // sahnede şarkı söyle
  | 'kaptan'     // kaptan köşkü
  | 'kopru'      // köprüye adının yazılı pankartı asılır
  | 'kizKulesi'; // Kız Kulesi'nin üstünde dev yazı + konfeti

export interface MenuItem {
  giftId: string;
  icon: string;
  label: string;
  moment: MomentId;
}

/** Ekrandaki hediye menüsü — sırası ekrandaki sıradır. */
export const MENU: readonly MenuItem[] = [
  { giftId: '5655', icon: '/gifts/rose.webp', label: 'SİMİT', moment: 'simit' },
  { giftId: '6064', icon: '/gifts/gg.webp', label: 'DÜDÜK', moment: 'duduk' },
  { giftId: '5487', icon: '/gifts/finger-heart.webp', label: 'ÇAY', moment: 'cay' },
  { giftId: '5658', icon: '/gifts/perfume.webp', label: 'PRUVA', moment: 'onGuverte' },
  { giftId: '5879', icon: '/gifts/doughnut.webp', label: 'FOTO', moment: 'foto' },
  { giftId: '5585', icon: '/gifts/confetti.webp', label: 'KONFETİ', moment: 'konfeti' },
  { giftId: '8750', icon: '/gifts/microphone.webp', label: 'ŞARKI', moment: 'sarki' },
  { giftId: '6097', icon: '/gifts/little-crown.webp', label: 'KAPTAN', moment: 'kaptan' },
  { giftId: '6267', icon: '/gifts/corgi.webp', label: 'KÖPRÜ', moment: 'kopru' },
  { giftId: '5712', icon: '/gifts/trophy.webp', label: 'KIZ KULESİ', moment: 'kizKulesi' },
];

/** Menüde olmayan hediyeler değerine göre bu anlara düşer */
export const TIER_FALLBACK: Record<GiftTier, MomentId> = {
  small: 'simit',
  medium: 'cay',
  large: 'konfeti',
};

export function momentFor(giftId: string, tier: GiftTier): MomentId {
  return MENU.find((m) => m.giftId === giftId)?.moment ?? TIER_FALLBACK[tier];
}

export const SHIP = {
  hullTop: 2.2,
  upperDeck: 5.0,
  /** Arka güverte oturma düzeni */
  seatCols: 5,
  seatRows: 8,
  seatStartZ: 1.2,
  seatGapZ: 1.3,
  seatGapX: 1.45,
  /** Kıçtaki küçük sahne (şarkı) */
  stage: { x: 0, z: 12.2 },
  /** Kaptan köşkünün çatısı */
  bridge: { x: 0, y: 7.4, z: -6.0 },
  /** Ön güverte noktaları (ana güverte, pruva) */
  bow: [
    { x: -1.2, z: -10.4 },
    { x: 1.2, z: -10.4 },
    { x: -0.6, z: -12.2 },
    { x: 0.6, z: -12.2 },
  ],
  funnel: { z: -2.4, top: 9.2 },
} as const;

export const TIMING = {
  /** Etiketin aktiviteden sonra görünür kalma süresi */
  tagSeconds: 7,
  bubbleSeconds: 4,
  bowSeconds: 90,
  singSeconds: 20,
  teaSeconds: 30,
  /** Vapurun su üstündeki hızı (dünya birimi/sn) */
  cruiseSpeed: 7,
  /** Köprü ve Kız Kulesi aralığı (sn) */
  bridgeEvery: 75,
  towerEvery: 110,
  /** İskele durağı aralığı (sn) ve iskelede bekleme süresi */
  pierEvery: 180,
  dockSeconds: 9,
  /** Bu kadar süre yorum / beğeni / hediye yoksa yolcu sıradaki iskelede iner */
  idleLeaveSeconds: 480,
} as const;

/** Sırayla uğranan iskeleler */
export const PIERS = [
  'KADIKÖY', 'BEŞİKTAŞ', 'ÜSKÜDAR', 'KARAKÖY', 'ORTAKÖY', 'KABATAŞ',
  'BEYLERBEYİ', 'ARNAVUTKÖY', 'ÇENGELKÖY', 'BEBEK', 'KANDİLLİ', 'EMİNÖNÜ',
] as const;

/** Gerçek yolcu az olunca vapur boş görünmesin diye oturan isimsiz yolcular */
export const MIN_CROWD = 12;
