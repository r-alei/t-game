/**
 * Ekran yazıları:
 *   üstte: başlık + kalan süre ve tempo çubuğu
 *   ortada: son 30 sn dev geri sayım
 *   altta: sunucu satırı ("ayse'den bir çeyrek!") ve "Yorum yaz, halaya katıl" çağrısı
 * Kullanıcı adları yalnız textContent ile yazılır.
 */
import { SAFE, SCREEN } from '../../engine/layout.ts';
import { TEMPO } from './config.ts';

/** TikTok üst barının (0–200) hemen altı */
const TOP = 206;

const css = /* css */ `
.dg-head { position:absolute; left:${SAFE.x}px; width:${SAFE.w}px; top:${TOP}px; display:flex; flex-direction:column; gap:8px; }
.dg-row1 { display:flex; align-items:center; justify-content:space-between; }
.dg-title { font:900 46px/1 'Segoe UI',sans-serif; letter-spacing:1px; color:#fff;
  text-shadow:0 3px 0 #9a1020, 0 5px 14px rgba(0,0,0,.45); }
.dg-clock { font:800 34px/1 'Segoe UI',sans-serif; color:#fff; background:rgba(120,10,30,.62); padding:8px 18px; border-radius:30px; }
.dg-tempo { position:relative; height:30px; border-radius:16px; background:rgba(0,0,0,.45); overflow:hidden; border:2px solid rgba(255,255,255,.7); }
.dg-tempo i { position:absolute; left:0; top:0; bottom:0; width:0; border-radius:14px;
  background:linear-gradient(90deg,#3fcf6a,#ffd25e 60%,#ff3b3b); transition:width .15s linear; }
.dg-tempo span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font:900 20px/1 'Segoe UI',sans-serif; color:#fff; text-shadow:0 1px 3px #000; letter-spacing:1px; }
.dg-tempo.hot { animation: dg-shake .12s infinite; }
@keyframes dg-shake { 0%{transform:translateX(-2px)} 50%{transform:translateX(2px)} 100%{transform:translateX(-2px)} }
.dg-count { position:absolute; left:0; right:150px; top:620px; text-align:center; pointer-events:none;
  font:900 260px/1 'Segoe UI',sans-serif; color:#fff; -webkit-text-stroke:8px #b3141b; opacity:0; }
.dg-count.tick { animation: dg-tick .9s ease-out; }
@keyframes dg-tick { 0% { transform:scale(1.5); opacity:1 } 80% { opacity:.9 } 100% { transform:scale(1); opacity:0 } }
.dg-count-label { position:absolute; left:0; right:150px; top:560px; text-align:center;
  font:900 44px/1 'Segoe UI',sans-serif; color:#fff; text-shadow:0 3px 0 #9a1020, 0 4px 12px rgba(0,0,0,.6); display:none; }
/* Duyurular güvenli alanı kullanır.
   Duyuru, motorun alttaki ad bandının (SAFE alt − 215) üstünde biter; uzun ad sığmazsa yukarı doğru
   ikinci satıra iner, kesilmez */
.dg-announce { position:absolute; left:${SAFE.x}px; width:${SAFE.w}px; bottom:${SCREEN.height - (SAFE.y + SAFE.h - 228)}px; text-align:center; pointer-events:none; }
.dg-announce span { display:inline-block; padding:12px 26px; border-radius:30px; background:rgba(255,248,220,.95);
  font:900 38px/1.1 'Segoe UI',sans-serif; color:#8a5a00; box-shadow:0 6px 18px rgba(0,0,0,.3); opacity:0;
  max-width:100%; box-sizing:border-box; overflow-wrap:anywhere; }
.dg-announce span.show { animation: dg-ann 2.2s ease-out forwards; }
@keyframes dg-ann { 0% { transform:scale(.6); opacity:0 } 12% { transform:scale(1.08); opacity:1 } 20% { transform:scale(1) } 85% { opacity:1 } 100% { opacity:0 } }
.dg-cta { position:absolute; left:${SAFE.x}px; width:${SAFE.w}px; top:${SAFE.y + SAFE.h - 66}px; text-align:center; }
.dg-cta span { display:inline-block; padding:12px 18px; border-radius:40px; background:rgba(120,10,30,.78);
  border:2px solid rgba(255,210,94,.85); font:800 28px 'Segoe UI',sans-serif; color:#fff; }
.dg-cta b { color:#ffd25e; }
`;

export class Hud {
  private readonly root = document.createElement('div');
  private readonly clock: HTMLDivElement;
  private readonly tempo: HTMLDivElement;
  private readonly tempoFill: HTMLElement;
  private readonly tempoText: HTMLSpanElement;
  private readonly count: HTMLDivElement;
  private readonly countLabel: HTMLDivElement;
  private readonly announceEl: HTMLSpanElement;
  private lastCount = -1;
  private ctaTimer = 0;

  constructor(host: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = css;
    this.root.append(style);

    const head = div('dg-head');
    const row1 = div('dg-row1');
    const title = div('dg-title');
    title.textContent = 'DÜĞÜN DERNEK';
    this.clock = div('dg-clock');
    row1.append(title, this.clock);

    this.tempo = div('dg-tempo');
    this.tempoFill = document.createElement('i');
    this.tempoText = document.createElement('span');
    this.tempo.append(this.tempoFill, this.tempoText);
    head.append(row1, this.tempo);

    this.countLabel = div('dg-count-label');
    this.countLabel.textContent = 'GELİN ARABASI GELİYOR!';
    this.count = div('dg-count');

    const ann = div('dg-announce');
    this.announceEl = document.createElement('span');
    ann.append(this.announceEl);

    const cta = div('dg-cta');
    const messages = ['Yorum yaz, <b>halaya katıl</b> 💃', 'Beğen, <b>davul hızlansın</b> 🥁'];
    let i = 0;
    cta.innerHTML = `<span>${messages[0]}</span>`;
    this.ctaTimer = window.setInterval(() => {
      i = (i + 1) % messages.length;
      cta.firstElementChild!.innerHTML = messages[i];
    }, 6000);

    this.root.append(head, this.countLabel, this.count, ann, cta);
    host.append(this.root);
  }

  setClock(secondsLeft: number): void {
    this.clock.textContent = `⏱ ${mmss(secondsLeft)}`;
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setTempo(bpm: number, playing: boolean): void {
    const k = Math.max(0, Math.min(1, (bpm - TEMPO.base * 0.6) / (TEMPO.breakAt - TEMPO.base * 0.6)));
    this.tempoFill.style.width = `${playing ? k * 100 : 0}%`;
    this.tempoText.textContent = playing ? (k > 0.82 ? 'ÇOK HIZLI! KOPACAK!' : `DAVUL ${Math.round(bpm)}`) : 'MÜZİK SUSTU';
    this.tempo.classList.toggle('hot', playing && k > 0.82);
  }

  /** Son saniyeler: her saniye dev rakam */
  setCountdown(seconds: number | null): void {
    this.countLabel.style.display = seconds === null ? 'none' : 'block';
    if (seconds === null) {
      this.lastCount = -1;
      return;
    }
    const s = Math.ceil(seconds);
    if (s === this.lastCount) return;
    this.lastCount = s;
    this.count.textContent = String(s);
    this.count.classList.remove('tick');
    void this.count.offsetWidth;
    this.count.classList.add('tick');
  }

  /** Sunucu satırı: kısa, büyük, sık değişen duyuru */
  announce(text: string): void {
    this.announceEl.textContent = text;
    this.announceEl.classList.remove('show');
    void this.announceEl.offsetWidth;
    this.announceEl.classList.add('show');
  }

  dispose(): void {
    clearInterval(this.ctaTimer);
    this.root.remove();
  }
}

function mmss(s: number): string {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

function div(className: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = className;
  return d;
}
