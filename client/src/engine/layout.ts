/**
 * Ekran ölçüleri ve TikTok arayüzünün kapattığı bölgeler.
 * Değerler 1080×1920 mantıksal piksel üzerinden; gerçek telefonda ölçülüp güncellenmeli.
 * Oyunlar önemli bilgiyi SAFE dikdörtgeninin içine koymalı.
 */
export const SCREEN = { width: 1080, height: 1920 } as const;

export interface Rect { x: number; y: number; w: number; h: number; label: string }

export const COVERED: readonly Rect[] = [
  { x: 0, y: 0, w: 1080, h: 200, label: 'Üst bar: profil, izleyici sayısı, kapat' },
  { x: 0, y: 1260, w: 1080, h: 660, label: 'Yorum akışı + alt butonlar' },
  { x: 930, y: 200, w: 150, h: 1060, label: 'Sağ: hediye / paylaş' },
];

/** İçeriğin güvenle görüneceği bölge */
export const SAFE: Rect = { x: 40, y: 220, w: 870, h: 1020, label: 'Güvenli alan' };

export function renderGuides(host: HTMLElement): void {
  host.replaceChildren(
    ...COVERED.map((r) => {
      const el = document.createElement('div');
      el.className = 'zone';
      Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      el.textContent = r.label;
      return el;
    }),
  );
}
