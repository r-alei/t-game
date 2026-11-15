/**
 * Ekran üstü bilgiler. Hepsi üst şeritte toplanır, sahnenin ortası boş kalır:
 *   1. satır: başlık · yolcu sayısı · kaptan
 *   2–3. satır: hediye menüsü (5 + 5, ikon + tek kelime)
 *   4. satır: en çok destek veren ilk 3 (tek satır)
 * Altta yalnız "yorum yaz, vapura bin" çağrısı ve hatıra fotoğrafı kartı.
 */
import type { Viewer } from '../../../../shared/events.ts';
import { SAFE } from '../../engine/layout.ts';
import { MENU, TIMING } from './config.ts';

/** TikTok'un sıralama rozetleri ~200–265 px arasında; başlık bunun hemen altından başlar. */
const TOP = 196;

const css = /* css */ `
.vp-head { position:absolute; left:${SAFE.x}px; width:${SAFE.w}px; top:${TOP}px; display:flex; flex-direction:column; gap:8px; }
.vp-row1 { display:flex; align-items:baseline; gap:16px; white-space:nowrap; }
.vp-title { font:900 40px/1 'Segoe UI',sans-serif; letter-spacing:2px; color:#fff;
  text-shadow:0 2px 0 #0b3a5a, 0 4px 12px rgba(0,0,0,.45); }
.vp-sub { font:700 26px/1 'Segoe UI',sans-serif; color:#fff; text-shadow:0 2px 6px rgba(0,0,0,.7); }
.vp-sub b { color:#ffd25e; }
.vp-menu { display:grid; grid-template-columns:repeat(5, 1fr); gap:4px 6px; padding:8px 6px;
  background:rgba(8,40,70,.42); border-radius:22px; backdrop-filter: blur(2px); }
.vp-menu div { display:flex; flex-direction:column; align-items:center; gap:2px;
  font:800 17px/1 'Segoe UI',sans-serif; color:#fff; text-shadow:0 1px 3px #000; }
.vp-menu img { width:50px; height:50px; filter:drop-shadow(0 2px 4px rgba(0,0,0,.45)); }
.vp-menu .flash { animation: vp-flash .9s ease-out; }
@keyframes vp-flash { 0% { transform:scale(1.35); color:#ffd25e } 100% { transform:scale(1) } }
.vp-top3 { display:flex; gap:14px; font:700 22px 'Segoe UI',sans-serif; color:#fff; text-shadow:0 1px 4px #000; }
.vp-top3 span { display:flex; align-items:center; gap:6px; }
.vp-top3 img, .vp-top3 i { width:30px; height:30px; border-radius:50%; border:2px solid #ffd25e; object-fit:cover; display:inline-block; }
.vp-cta { position:absolute; left:0; right:150px; top:${SAFE.y + SAFE.h - 70}px; text-align:center; }
.vp-cta span { display:inline-block; padding:12px 30px; border-radius:40px; background:rgba(8,40,70,.72);
  border:2px solid rgba(255,210,94,.8); font:800 32px 'Segoe UI',sans-serif; color:#fff; }
.vp-cta b { color:#ffd25e; }
.vp-flashlight { position:absolute; inset:0; background:#fff; opacity:0; pointer-events:none; }
.vp-photo { position:absolute; left:${SAFE.x + SAFE.w - 370}px; top:${TOP + 300}px; width:330px; padding:18px 18px 26px;
  background:#fbfaf6; border-radius:6px; box-shadow:0 18px 40px rgba(0,0,0,.45);
  transform: rotate(6deg) translateY(40px) scale(.8); opacity:0; transition: all .45s cubic-bezier(.2,1.4,.4,1); }
.vp-photo.show { transform: rotate(4deg) translateY(0) scale(1); opacity:1; }
.vp-photo .pic { height:260px; border-radius:2px; display:flex; align-items:center; justify-content:center;
  background: linear-gradient(#8fc3ea, #e9eef2 60%, #1f5a73 61%); overflow:hidden; }
.vp-photo .pic img, .vp-photo .pic i { width:150px; height:150px; border-radius:50%; border:6px solid #fff; object-fit:cover; display:block; }
.vp-photo .cap { margin-top:14px; font:700 34px 'Segoe Script','Segoe UI',cursive; color:#222; text-align:center; }
.vp-photo .date { font:600 20px 'Segoe UI',sans-serif; color:#777; text-align:center; margin-top:4px; }
`;

export class Hud {
  private readonly root = document.createElement('div');
  private readonly sub: HTMLDivElement;
  private readonly top3: HTMLDivElement;
  private readonly menuRows = new Map<string, HTMLDivElement>();
  private readonly flashEl: HTMLDivElement;
  private readonly photo: HTMLDivElement;
  private photoTimer = 0;
  private ctaTimer = 0;

  constructor(host: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = css;
    this.root.append(style);

    const head = div('vp-head');
    const row1 = div('vp-row1');
    const title = div('vp-title');
    title.textContent = 'BOĞAZ VAPURU';
    this.sub = div('vp-sub');
    row1.append(title, this.sub);

    const menu = div('vp-menu');
    for (const item of MENU) {
      const cell = div('');
      const img = document.createElement('img');
      img.src = item.icon;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = item.label;
      cell.append(img, label);
      menu.append(cell);
      this.menuRows.set(item.giftId, cell);
    }
    this.top3 = div('vp-top3');
    head.append(row1, menu, this.top3);

    // Çağrı iki mesaj arasında döner: nasıl binilir / sessiz kalan iskelede iner
    const cta = div('vp-cta');
    const minutes = Math.round(TIMING.idleLeaveSeconds / 60);
    const messages = [
      'Yorum yaz, <b>vapura bin</b> ⛴',
      `${minutes} dk sessiz kalan <b>iskelede iner</b>`,
    ];
    let i = 0;
    cta.innerHTML = `<span>${messages[0]}</span>`;
    this.ctaTimer = window.setInterval(() => {
      i = (i + 1) % messages.length;
      cta.firstElementChild!.innerHTML = messages[i];
    }, 7000);

    this.flashEl = div('vp-flashlight');
    this.photo = div('vp-photo');
    this.photo.innerHTML = '<div class="pic"></div><div class="cap"></div><div class="date"></div>';

    this.root.append(head, cta, this.photo, this.flashEl);
    host.append(this.root);
  }

  setStatus(passengers: number, captain: string | null): void {
    this.sub.replaceChildren();
    const count = document.createElement('span');
    count.innerHTML = `<b></b> yolcu`;
    count.querySelector('b')!.textContent = String(passengers);
    this.sub.append(count);
    if (captain) {
      const c = document.createElement('span');
      c.textContent = ` · ⚓ ${captain}`;
      this.sub.append(c);
    }
  }

  setTop(list: { viewer: Viewer; total: number }[]): void {
    const medals = ['🥇', '🥈', '🥉'];
    this.top3.replaceChildren(
      ...list.slice(0, 3).map((s, i) => {
        const row = document.createElement('span');
        row.append(medals[i], avatar(s.viewer));
        const name = document.createElement('span');
        name.textContent = s.viewer.name;
        row.append(name);
        return row;
      }),
    );
  }

  /** Hediye gelince menüdeki hücre kısa süre büyür */
  flash(giftId: string): void {
    const row = this.menuRows.get(giftId);
    if (!row) return;
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
  }

  /** Hatıra fotoğrafı: flaş patlar, polaroid kart belirir */
  snapshot(viewer: Viewer, seconds = 4.5): void {
    this.flashEl.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 450, easing: 'ease-out' });
    const pic = this.photo.querySelector('.pic')!;
    pic.replaceChildren(avatar(viewer));
    this.photo.querySelector('.cap')!.textContent = viewer.name;
    const d = new Date();
    this.photo.querySelector('.date')!.textContent = `Boğaz · ${d.toLocaleDateString('tr-TR')}`;
    this.photo.classList.add('show');
    clearTimeout(this.photoTimer);
    this.photoTimer = window.setTimeout(() => this.photo.classList.remove('show'), seconds * 1000);
  }

  dispose(): void {
    clearTimeout(this.photoTimer);
    clearInterval(this.ctaTimer);
    this.root.remove();
  }
}

function avatar(viewer: Viewer): HTMLElement {
  if (viewer.avatar) {
    const img = document.createElement('img');
    img.src = viewer.avatar;
    return img;
  }
  const i = document.createElement('i');
  i.style.background = '#6c7a89';
  return i;
}

function div(className: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = className;
  return d;
}
