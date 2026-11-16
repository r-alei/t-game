import type { DayiCue } from '../../shared/dayi.ts';
import { DAYI_FRAMES, DayiAnimation, type DayiFrame } from './dayiAnimation.ts';

/** Tüm kareler aynı konumda kalır; animasyon sırasında kaynak veya DOM değişmez. */
export class DayiSprite {
  readonly ready: Promise<void>;
  private readonly root = document.createElement('div');
  private readonly images = new Map<DayiFrame, HTMLImageElement>();
  private readonly animation = new DayiAnimation();
  private loaded = false;
  private disposed = false;
  private visible: DayiFrame | null = null;

  constructor(host: HTMLElement) {
    this.root.className = 'dayi-sprite';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute('aria-label', 'Düğün Dayısı');
    host.append(this.root);
    const pending = DAYI_FRAMES.map((frame) => {
      const img = document.createElement('img');
      img.alt = '';
      img.width = img.height = 768;
      img.draggable = false;
      img.style.visibility = 'hidden';
      img.src = `/dayi/${frame}.webp`;
      this.images.set(frame, img);
      this.root.append(img);
      return img.decode().then(() => {
        if (frame === 'kapali' && !this.disposed) this.show('kapali');
      });
    });
    this.ready = Promise.all(pending).then(() => { this.loaded = true; });
    // Eksik kare durumunda yüklenen kapalı kare korunur; sayfa akışı devam eder.
    void this.ready.catch(() => { this.root.setAttribute('aria-label', 'Dayı kareleri yüklenemedi'); });
  }

  private show(frame: DayiFrame): void {
    if (this.visible === frame) return;
    if (this.visible) this.images.get(this.visible)!.style.visibility = 'hidden';
    this.images.get(frame)!.style.visibility = 'visible';
    this.visible = frame;
  }

  react(cue: DayiCue): void { this.animation.react(cue); }

  update(dt: number, speech: number): void {
    if (this.disposed) return;
    const pose = this.animation.update(dt, speech);
    if (this.loaded) this.show(pose.frame);
    this.root.style.transform = `translateY(${pose.y}px) rotate(${pose.rotation}deg) scale(${pose.scaleX}, ${pose.scaleY})`;
  }

  dispose(): void { this.disposed = true; this.root.remove(); }
}
