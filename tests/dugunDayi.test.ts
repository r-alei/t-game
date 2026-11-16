import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dayi, DAYI_BOUNDS, dayiPose } from '../client/src/games/dugun/dayi.ts';
import { COVERED, SAFE } from '../client/src/engine/layout.ts';
import { parseDugunCommand } from '../shared/dugun.ts';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Düğün Dayısı', () => {
  it('sessizlikte ağzı kapalıdır; ses seviyesiyle sürekli açılır', () => {
    const pose = (speech: number) => dayiPose(1, speech, 0, null, 0);
    expect(pose(0).mouth).toBe(0);
    expect(pose(0.5).mouth).toBeGreaterThan(0);
    expect(pose(1).mouth).toBeGreaterThan(pose(0.5).mouth);
    expect(pose(1).head).not.toBe(0);
    expect(pose(1).moustache).not.toBe(0);
    expect(pose(NaN).mouth).toBe(0);
    expect(pose(3).mouth).toBe(pose(1).mouth);
  });

  it('nefes, göz kırpma ve olay jestleri yayıncı adına ağzı açmaz', () => {
    for (const reaction of ['surprise', 'celebrate', 'solo'] as const) {
      const p = dayiPose(1, 0, 1, reaction, 1);
      expect(p.mouth).toBe(0);
      expect(p.eyes).toBeLessThan(0.1);
      expect(p.breath).not.toBe(1);
      expect(p.arm).not.toBe(dayiPose(1, 0, 0, null, 0).arm);
    }
  });

  it('güvenli alanın sol altında, yorumlardan önce biter; panel seçeneği kabul edilir', () => {
    expect(DAYI_BOUNDS.x).toBe(SAFE.x);
    expect(DAYI_BOUNDS.y + DAYI_BOUNDS.h).toBeLessThanOrEqual(SAFE.y + SAFE.h);
    expect(DAYI_BOUNDS.y + DAYI_BOUNDS.h).toBeLessThan(COVERED[1].y);
    expect(parseDugunCommand({ action: 'set-option', option: 'dayiVisible', value: false }))
      .toEqual({ action: 'set-option', option: 'dayiVisible', value: false });
  });

  it('bir kez çizilir, güncelleme öznitelik kullanır; gizlenir ve dispose ile kaldırılır', () => {
    // jsdom/happy-dom kurulu değil: yalnız kullanılan DOM sözleşmesinin küçük dublörü.
    const parts = new Map<string, { setAttribute: ReturnType<typeof vi.fn> }>();
    const root = {
      className: '', style: {}, hidden: false, innerHTML: '',
      querySelector: (selector: string) => {
        if (!parts.has(selector)) parts.set(selector, { setAttribute: vi.fn() });
        return parts.get(selector);
      },
      remove: vi.fn(),
    };
    vi.stubGlobal('document', { createElement: vi.fn(() => root) });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const host = { append: vi.fn() };
    const dayi = new Dayi(host as unknown as HTMLElement);
    const drawing = root.innerHTML;
    const mouth = parts.get('[data-part="mouth"]')!;
    expect(host.append).toHaveBeenCalledWith(root);
    expect(mouth.setAttribute).toHaveBeenLastCalledWith('ry', '0');
    dayi.update(1 / 60, 1);
    expect(mouth.setAttribute).toHaveBeenLastCalledWith('ry', '13');
    expect(root.innerHTML).toBe(drawing);
    dayi.update(3, 0);
    dayi.update(0.09, 0);
    expect(parts.get('[data-part="eyes"]')!.setAttribute.mock.calls.at(-1)?.[1]).toContain('scale(1 0.06');
    dayi.setVisible(false);
    expect(root.hidden).toBe(true);
    const count = mouth.setAttribute.mock.calls.length;
    dayi.update(1, 1);
    expect(mouth.setAttribute).toHaveBeenCalledTimes(count);
    dayi.setVisible(true);
    dayi.update(0, 0);
    expect(root.hidden).toBe(false);
    expect(mouth.setAttribute).toHaveBeenLastCalledWith('ry', '0');
    dayi.dispose();
    expect(root.remove).toHaveBeenCalledOnce();
  });
});
