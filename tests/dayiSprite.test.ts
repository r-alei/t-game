import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAYI_FRAMES, DayiAnimation } from '../client/src/dayiAnimation.ts';
import { DayiSprite } from '../client/src/dayiSprite.ts';
import { parseDugunCommand } from '../shared/dugun.ts';

afterEach(() => vi.unstubAllGlobals());

describe('Dayı kare seçimi', () => {
  it('sessizlikte kapalıdır; geçersiz sesler güvenle sessizlik sayılır', () => {
    const animation = new DayiAnimation(() => 0);
    for (const speech of [0, 0.01, NaN, -1, Infinity]) {
      expect(animation.update(0.01, speech).frame).toBe('kapali');
    }
  });

  it.each([1 / 144, 1 / 60, 0.037])('yüksek seste iki ağız karesi en az 70 ms kalır (dt=%s)', (dt) => {
    const animation = new DayiAnimation(() => 0);
    let last = animation.update(0, 1).frame;
    let age = 0;
    const totals = { konus1: 0, konus2: 0 };
    let changes = 0;
    for (let i = 0; i < 3 / dt; i++) {
      age += dt;
      const frame = animation.update(dt, 1).frame;
      expect(['konus1', 'konus2']).toContain(frame);
      totals[frame as keyof typeof totals] += dt;
      if (frame !== last) {
        expect(age).toBeGreaterThanOrEqual(0.07 - 1e-9);
        changes++;
        age = 0;
        last = frame;
      }
    }
    expect(changes).toBeGreaterThan(15);
    expect(totals.konus2).toBeGreaterThan(totals.konus1);
  });

  it('orta seste hafif açık ağız ağırlıklıdır', () => {
    const animation = new DayiAnimation(() => 0);
    let small = 0, big = 0;
    for (let i = 0; i < 600; i++) {
      const frame = animation.update(0.005, 0.4).frame;
      if (frame === 'konus1') small++;
      if (frame === 'konus2') big++;
    }
    expect(small).toBeGreaterThan(big);
  });

  it('ses bitince son kareyi 120 ms tutar, eşik çevresinde histerezis uygular', () => {
    const animation = new DayiAnimation(() => 0);
    const last = animation.update(0.08, 1).frame;
    expect(animation.update(0.119, 0).frame).toBe(last);
    expect(animation.update(0.001, 0).frame).toBe('kapali');
    expect(animation.update(0.01, 0.05).frame).toBe('kapali');
    expect(animation.update(0.01, 0.08).frame).toBe('konus1');
    expect(animation.update(0.5, 0.05).frame).not.toBe('kapali');
  });

  it.each([
    ['shock', 'sasir', 1.8], ['cheer', 'cosku', 2.4], ['clap', 'alkis', 2],
  ] as const)('%s jesti konuşma sırasında da %s karesini korur', (cue, frame, duration) => {
    const animation = new DayiAnimation(() => 0);
    animation.react(cue);
    expect(animation.update(0, 0).frame).toBe(frame);
    expect(animation.update(duration - 0.001, 1).frame).toBe(frame);
    expect(animation.update(0.002, 1).frame).not.toBe(frame);
  });

  it('yeni jest eskisini keser ve kendi süresini başlatır', () => {
    const animation = new DayiAnimation(() => 0);
    animation.react('cheer');
    animation.update(1, 0);
    animation.react('shock');
    expect(animation.update(1.79, 0).frame).toBe('sasir');
    expect(animation.update(0.02, 0).frame).toBe('kapali');
  });

  it.each([0, 1])('sessizken 3–6 saniyede 130 ms kırpar (rastgele=%s)', (random) => {
    const animation = new DayiAnimation(() => random);
    const delay = 3 + random * 3;
    expect(animation.update(delay - 0.001, 0).frame).toBe('kapali');
    expect(animation.update(0.002, 0).frame).toBe('kirp');
    expect(animation.update(0.129, 0).frame).toBe('kirp');
    expect(animation.update(0.002, 0).frame).toBe('kapali');
    expect(animation.update(delay, 0).frame).toBe('kirp');
    expect(animation.update(0, 1).frame).not.toBe('kirp');
  });

  it('konuşma ve jest sırasında kırpmaz; sessizlik başlayınca yeniden bekler', () => {
    const animation = new DayiAnimation(() => 0);
    for (let i = 0; i < 100; i++) expect(animation.update(0.1, 1).frame).not.toBe('kirp');
    animation.react('cheer');
    expect(animation.update(1, 0).frame).toBe('cosku');
    expect(animation.update(1, 0).frame).toBe('cosku');
    expect(animation.update(0.5, 0).frame).toBe('kapali');
  });

  it('jest karesi konuşurken de esner ve hareket büyür', () => {
    const quiet = new DayiAnimation(() => 0), loud = new DayiAnimation(() => 0);
    quiet.react('cheer'); loud.react('cheer');
    const a = quiet.update(0.1, 0), b = loud.update(0.1, 1);
    expect(b.frame).toBe(a.frame);
    expect(b.scaleY).toBeGreaterThan(a.scaleY);
    expect(b.y).toBeLessThan(a.y);
  });

  it('oyundaki eski dayı görünürlük seçeneği kabul edilmez', () => {
    expect(parseDugunCommand({ action: 'set-option', option: 'dayiVisible', value: false })).toBeNull();
  });
});

describe('Dayı sprite yüklemesi', () => {
  it('yedi görseli bir kez decode eder; kapalı kare erken görünür, hazır olunca tek kare değişir', async () => {
    const images: Array<ReturnType<typeof element>> = [];
    const resolve: Array<() => void> = [];
    function element() {
      return {
        style: { visibility: '' }, className: '', src: '', draggable: true,
        append: vi.fn(), remove: vi.fn(), setAttribute: vi.fn(),
        decode: vi.fn(() => new Promise<void>((done) => resolve.push(done))),
      };
    }
    const root = element();
    vi.stubGlobal('document', { createElement: (tag: string) => {
      if (tag === 'div') return root;
      const img = element(); images.push(img); return img;
    } });
    const sprite = new DayiSprite({ append: vi.fn() } as unknown as HTMLElement);
    expect(images.map((img) => img.src)).toEqual(DAYI_FRAMES.map((frame) => `/dayi/${frame}.webp`));
    expect(images.every((img) => img.decode.mock.calls.length === 1)).toBe(true);
    resolve[0]();
    await Promise.resolve();
    expect(images[0].style.visibility).toBe('visible');
    sprite.react('shock'); sprite.update(0, 1);
    expect(images[0].style.visibility).toBe('visible');
    resolve.slice(1).forEach((done) => done());
    await sprite.ready;
    sprite.update(0, 1);
    expect(images.filter((img) => img.style.visibility === 'visible')).toEqual([images[4]]);
    expect(images.every((img) => img.decode.mock.calls.length === 1)).toBe(true);
    sprite.dispose();
    expect(root.remove).toHaveBeenCalledOnce();
  });
});
