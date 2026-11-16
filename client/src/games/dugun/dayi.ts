import { SAFE } from '../../engine/layout.ts';

/** Animasyon payı dahil sınır; TikTok yorumları y=1260'ta başlar. */
export const DAYI_BOUNDS = { x: SAFE.x, y: SAFE.y + SAFE.h - 400, w: 330, h: 400 } as const;
export type DayiReaction = 'surprise' | 'celebrate' | 'solo';

/** DOM'dan bağımsız poz hesabı; sessizlik ağzı tamamen kapatır. */
export function dayiPose(time: number, speech: number, blink: number, reaction: DayiReaction | null, remaining: number) {
  const level = Number.isFinite(speech) ? Math.max(0, Math.min(1, speech)) : 0;
  const gesture = Math.min(1, Math.max(0, remaining) * 4);
  return {
    mouth: level * 13,
    moustache: level * (1 + Math.sin(time * 13)),
    head: Math.sin(time * 7) * level * 2 + (reaction === 'surprise' ? -7 * gesture : 0),
    breath: 1 + Math.sin(time * 1.7) * 0.008,
    eyes: Math.max(0.06, 1 - blink),
    brow: reaction === 'surprise' ? -7 * gesture : 0,
    arm: reaction === 'surprise' ? -38 * gesture
      : reaction === 'celebrate' || reaction === 'solo' ? (-28 + Math.sin(time * 13) * 24) * gesture
      : Math.sin(time * 7) * level * 9 + Math.sin(time * 0.65) ** 10 * Math.sin(time * 2) * 7,
  };
}

/** Kalıcı yayıncı katmanı; sahneye, katılımcılara veya hediye rollerine eklenmez. */
export class Dayi {
  private readonly root: HTMLDivElement;
  private readonly body: SVGGElement;
  private readonly head: SVGGElement;
  private readonly eyes: SVGGElement;
  private readonly brows: SVGGElement;
  private readonly mouth: SVGEllipseElement;
  private readonly moustache: SVGGElement;
  private readonly arm: SVGGElement;
  private time = 0;
  private nextBlink = 3 + Math.random() * 3;
  private blinkAt = -1;
  private reaction: DayiReaction | null = null;
  private remaining = 0;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'dg-dayi';
    Object.assign(this.root.style, {
      position: 'absolute', left: `${DAYI_BOUNDS.x}px`, top: `${DAYI_BOUNDS.y}px`,
      width: `${DAYI_BOUNDS.w}px`, height: `${DAYI_BOUNDS.h}px`, pointerEvents: 'none',
      overflow: 'hidden', zIndex: '2',
    });
    // Sabit çizim yalnız kurulumda oluşturulur; karelerde sadece öznitelikler değişir.
    this.root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 400" width="330" height="400" role="img" aria-label="Düğün Dayısı">
      <g data-part="body" stroke="#342c30" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M55 389 Q48 271 97 252 L213 252 Q255 280 257 389Z" fill="#fff8e9"/>
        <path d="M97 252 L137 273 L150 389 H72 L76 282Z M213 252 L177 273 L163 389 H239 L235 282Z" fill="#343e4a"/>
        <path d="M134 230 H178 V265 L156 285 L134 265Z" fill="#eeb58e"/>
        <path d="M133 254 L156 278 L139 299 L117 263Z M178 254 L156 278 L174 299 L195 263Z" fill="#fffdf5"/>
        <path d="M58 283 Q28 300 46 353 L78 369 L89 346 L68 329 L80 294" fill="#fff8e9"/>
        <path d="M78 340 Q107 330 117 347 Q123 360 105 369 L78 369 Q65 357 78 340Z" fill="#eeb58e"/>
        <path d="M198 329 H222 M199 334 H221" fill="none" stroke="#68747d"/>
        <circle cx="157" cy="314" r="3" fill="#c9ac6c"/><circle cx="157" cy="345" r="3" fill="#c9ac6c"/>
        <g data-part="head">
          <ellipse cx="85" cy="166" rx="15" ry="23" fill="#eeb58e"/><ellipse cx="226" cy="166" rx="15" ry="23" fill="#eeb58e"/>
          <path d="M87 127 Q87 79 157 79 Q225 79 225 133 L221 191 Q215 240 158 247 Q101 243 91 199Z" fill="#f3c29a"/>
          <path d="M92 128 L96 159 M220 127 L216 158" stroke="#77706b" stroke-width="9"/>
          <ellipse cx="113" cy="190" rx="17" ry="9" fill="#e99a82" stroke="none"/><ellipse cx="201" cy="190" rx="17" ry="9" fill="#e99a82" stroke="none"/>
          <g data-part="brows" fill="none" stroke-width="5"><path d="M111 148 Q122 142 133 147 M180 147 Q193 142 203 148"/></g>
          <g data-part="eyes" fill="#29282b" stroke="none"><ellipse cx="124" cy="165" rx="5" ry="7"/><ellipse cx="191" cy="165" rx="5" ry="7"/></g>
          <path d="M151 163 Q141 187 153 189 H164" fill="#eeb58e"/>
          <ellipse data-part="mouth" cx="157" cy="213" rx="16" ry="0" fill="#6a2c32" stroke-width="2"/>
          <path d="M143 216 Q157 224 172 215" fill="none" stroke-width="2"/>
          <g data-part="moustache" fill="#252326" stroke-width="2"><path d="M157 196 Q141 185 125 199 Q117 208 108 205 Q117 224 139 212 L157 203 L174 212 Q196 224 206 205 Q196 208 189 199 Q174 185 157 196Z"/></g>
          <path d="M82 121 Q76 69 127 58 Q197 42 227 90 L230 121Z" fill="#55524b"/>
          <path d="M82 117 Q151 91 233 114 Q249 126 222 135 Q156 118 88 134Z" fill="#393b39"/>
          <path d="M150 59 Q176 78 181 104" fill="none" stroke="#777268" stroke-width="2"/>
        </g>
        <g data-part="arm">
          <path d="M221 267 Q246 253 261 235 L279 251 Q267 293 239 306Z" fill="#fff8e9"/>
          <path d="M257 238 L268 221 Q267 205 278 204 Q291 207 287 221 Q301 230 288 247 L278 253Z" fill="#f3c29a"/>
          <path d="M279 209 Q263 170 281 144 Q299 157 321 148 L310 181 L320 209 Q298 196 279 209Z" fill="#dc3848"/>
          <path d="M280 205 Q290 175 285 152 M290 187 L310 181" fill="none" stroke="#a82036" stroke-width="2"/>
        </g>
      </g>
    </svg>`;
    const part = <T extends SVGElement>(name: string) => this.root.querySelector<T>(`[data-part="${name}"]`)!;
    this.body = part('body'); this.head = part('head'); this.eyes = part('eyes');
    this.brows = part('brows'); this.mouth = part('mouth'); this.moustache = part('moustache'); this.arm = part('arm');
    host.append(this.root);
    this.update(0, 0);
  }

  setVisible(visible: boolean): void { this.root.hidden = !visible; }

  react(reaction: DayiReaction): void {
    this.reaction = reaction;
    this.remaining = reaction === 'celebrate' ? 2.4 : 1.8;
  }

  update(dt: number, speech: number): void {
    this.time += dt;
    this.remaining = Math.max(0, this.remaining - dt);
    if (!this.remaining) this.reaction = null;
    if (this.time >= this.nextBlink) {
      this.blinkAt = this.time;
      this.nextBlink = this.time + 3 + Math.random() * 3;
    }
    const blinkAge = this.time - this.blinkAt;
    const blink = blinkAge < 0.18 ? Math.sin(blinkAge / 0.18 * Math.PI) : 0;
    const p = dayiPose(this.time, speech, blink, this.reaction, this.remaining);
    if (this.root.hidden) return;
    this.body.setAttribute('transform', `translate(0 ${389 * (1 - p.breath)}) scale(1 ${p.breath})`);
    this.head.setAttribute('transform', `rotate(${p.head} 157 243)`);
    this.eyes.setAttribute('transform', `translate(0 ${165 * (1 - p.eyes)}) scale(1 ${p.eyes})`);
    this.brows.setAttribute('transform', `translate(0 ${p.brow})`);
    this.mouth.setAttribute('ry', String(p.mouth));
    this.moustache.setAttribute('transform', `translate(0 ${-p.moustache})`);
    this.arm.setAttribute('transform', `rotate(${p.arm} 226 279)`);
  }

  dispose(): void { this.root.remove(); }
}
