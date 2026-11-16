import type { DayiCue } from '../../shared/dayi.ts';

export const DAYI_FRAMES = ['kapali', 'konus1', 'konus2', 'kirp', 'sasir', 'cosku', 'alkis'] as const;
export type DayiFrame = typeof DAYI_FRAMES[number];
const gestures = {
  shock: { frame: 'sasir', duration: 1.8 },
  cheer: { frame: 'cosku', duration: 2.4 },
  clap: { frame: 'alkis', duration: 2 },
} as const;

/** Süreler saniyedir. Kare seçimi ve hareket hesabı DOM'a ihtiyaç duymaz. */
export class DayiAnimation {
  private time = 0;
  private talking = false;
  private silence = 0;
  private mouth: DayiFrame = 'kapali';
  private mouthAge = 0;
  private idle = 0;
  private nextBlink: number;
  private blink = 0;
  private cue: DayiCue | null = null;
  private gestureAge = 0;

  constructor(private readonly random: () => number = Math.random) {
    this.nextBlink = this.blinkDelay();
  }

  private blinkDelay(): number { return 3 + this.random() * 3; }

  react(cue: DayiCue): void {
    this.cue = cue;
    this.gestureAge = 0;
    this.blink = 0;
  }

  update(dt: number, speech: number) {
    const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const level = Number.isFinite(speech) ? Math.max(0, Math.min(1, speech)) : 0;
    this.time += elapsed;
    this.mouthAge += elapsed;
    this.gestureAge += elapsed;
    if (this.cue && this.gestureAge >= gestures[this.cue].duration) this.cue = null;

    const audible = level >= (this.talking ? 0.035 : 0.06);
    if (audible) {
      this.silence = 0;
      if (!this.talking) {
        this.talking = true;
        this.mouth = level >= 0.65 ? 'konus2' : 'konus1';
        this.mouthAge = 0;
      }
      // 9–12 geçiş/sn; baskın kare daha uzun tutulur, her ağız karesi en az 70 ms sürer.
      const preferred = level >= 0.65 ? 'konus2' : 'konus1';
      const period = 1 / (9 + 3 * level);
      const dwell = this.mouth === preferred ? 2 * period - 0.07 : 0.07;
      if (this.mouthAge + 1e-9 >= dwell) {
        this.mouth = this.mouth === 'konus1' ? 'konus2' : 'konus1';
        // Tek güncellemede tek geçiş: yavaş ekranlarda da kareler atlanmaz.
        this.mouthAge = 0;
      }
    } else if (this.talking) {
      this.silence += elapsed;
      // Ses bitince son ağız karesi sabit kalır; eşik çevresinde çırpınmaz.
      if (this.silence + 1e-9 >= 0.12) {
        this.talking = false;
        this.mouth = 'kapali';
      }
    }

    if (this.talking || this.cue) {
      this.blink = this.idle = 0;
    } else {
      this.idle += elapsed;
      this.blink = Math.max(0, this.blink - elapsed);
      if (this.idle >= this.nextBlink) {
        this.blink = 0.13;
        this.idle = 0;
        this.nextBlink = this.blinkDelay();
      }
    }

    const breath = this.talking ? 0 : Math.sin(this.time * Math.PI * 2 / 3.5) * 0.012;
    let y = -Math.abs(Math.sin(this.time * 19)) * level * 5;
    let rotation = Math.sin(this.time * 7) * level * 0.8;
    let stretch = 0;
    if (this.cue === 'shock') {
      const recoil = Math.max(0, 1 - this.gestureAge / 0.35);
      y -= Math.sin(Math.min(1, this.gestureAge / 0.35) * Math.PI) * 10;
      rotation -= recoil * 3;
      stretch = -recoil * 0.02;
    } else if (this.cue === 'cheer') {
      const jump = Math.abs(Math.sin(this.gestureAge * 10));
      y -= jump * 9;
      stretch = jump * 0.015;
    } else if (this.cue === 'clap') {
      rotation += Math.sin(this.gestureAge * 30) * 1.2;
      y -= Math.abs(Math.sin(this.gestureAge * 22)) * 2;
    }
    return {
      frame: this.cue ? gestures[this.cue].frame : this.talking ? this.mouth : this.blink > 0 ? 'kirp' : 'kapali',
      y, rotation,
      scaleX: 1 + breath - level * 0.015 - stretch * 0.4,
      scaleY: 1 + breath + level * 0.04 + stretch,
    };
  }
}
