/**
 * Büyük hediye anları için HTML duyuru şeridi ("ayse.k KUPA gönderdi!").
 * Kuyruklu çalışır; aynı anda tek duyuru, hiçbiri kaybolmaz.
 */
import type { Viewer } from '../../../shared/events.ts';
import { SAFE } from './layout.ts';

interface Item { viewer: Viewer; title: string; subtitle: string; ms: number }

export class Banner {
  private queue: Item[] = [];
  private busy = false;
  private readonly el: HTMLDivElement;

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: `${SAFE.x}px`,
      width: `${SAFE.w}px`,
      top: `${SAFE.y + 10}px`,
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      padding: '22px 30px',
      borderRadius: '36px',
      background: 'linear-gradient(90deg, #ff2d6f, #ff9a3c)',
      boxShadow: 'var(--shadow)',
      transform: 'translateY(-40px) scale(0.9)',
      opacity: '0',
      transition: 'transform 260ms cubic-bezier(.2,1.6,.4,1), opacity 200ms',
    } satisfies Partial<CSSStyleDeclaration>);
    host.append(this.el);
  }

  show(viewer: Viewer, title: string, subtitle = '', ms = 2600): void {
    this.queue.push({ viewer, title, subtitle, ms });
    if (!this.busy) void this.next();
  }

  private async next(): Promise<void> {
    const item = this.queue.shift();
    if (!item) return void (this.busy = false);
    this.busy = true;
    const avatar = item.viewer.avatar
      ? `<img src="${encodeURI(item.viewer.avatar)}" style="width:120px;height:120px;border-radius:50%;border:5px solid #fff;object-fit:cover">`
      : '';
    this.el.innerHTML = `${avatar}<div>
      <div class="t" style="font:800 58px/1.05 Segoe UI,sans-serif"></div>
      <div class="s" style="font:600 36px/1.2 Segoe UI,sans-serif;opacity:.9;margin-top:6px"></div></div>`;
    // Kullanıcı metni her zaman textContent ile yazılır (HTML enjeksiyonu yok).
    const t = this.el.querySelector('.t')!;
    const s = this.el.querySelector('.s')!;
    t.textContent = `${item.viewer.name} ${item.title}`;
    s.textContent = item.subtitle;

    this.el.style.opacity = '1';
    this.el.style.transform = 'translateY(0) scale(1)';
    await wait(item.ms);
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateY(-40px) scale(0.9)';
    await wait(300);
    // Kuyruk uzarsa hızlan
    if (this.queue.length > 3) this.queue.forEach((q) => (q.ms = 1400));
    void this.next();
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
