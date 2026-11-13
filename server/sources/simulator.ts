/**
 * Yayın açmadan oyunu denemek için sahte izleyici olayları üretir.
 * Gerçek kaynakla aynı LiveEvent biçimini kullanır.
 */
import { randomUUID } from 'node:crypto';
import type { LiveEvent, SimulateRequest, Viewer } from '../../shared/events.ts';
import { KNOWN_GIFTS, findGift } from '../../shared/gifts.ts';

const NAMES = [
  'ayse.k', 'mehmet_34', 'zeynep', 'emre.gs', 'elif🌸', 'burak', 'selin', 'kaan06',
  'deniz', 'merve.35', 'can', 'ece', 'oguz', 'nazli', 'tolga', 'irem', 'baran', 'sude',
];
const COMMENTS = ['selam', 'merhaba', '1', '2', 'hadi', 'süper', 'naber', 'ben de varım'];

function viewer(name?: string): Viewer {
  const n = name ?? NAMES[Math.floor(Math.random() * NAMES.length)];
  return { id: `sim-${n}`, name: n, avatar: '' };
}

export function simulate(req: Exclude<SimulateRequest, { type: 'crowd' }>): LiveEvent {
  const base = { id: `sim:${randomUUID()}`, at: Date.now(), viewer: viewer(req.name) };
  switch (req.type) {
    case 'comment':
      return { ...base, type: 'comment', text: req.text };
    case 'like':
      return { ...base, type: 'like', count: req.count ?? 1 };
    case 'gift': {
      const g = findGift(req.giftId) ?? KNOWN_GIFTS[0];
      const count = req.count ?? 1;
      return {
        ...base, type: 'gift', giftId: g.id, giftName: g.name,
        count, unitValue: g.diamonds, value: g.diamonds * count,
      };
    }
    default:
      return { ...base, type: req.type };
  }
}

/** Belirli bir süre boyunca rastgele kalabalık akışı üretir. */
export function crowd(seconds: number, emit: (e: LiveEvent) => void): () => void {
  const end = Date.now() + seconds * 1000;
  const timer = setInterval(() => {
    if (Date.now() > end) return clearInterval(timer);
    const r = Math.random();
    if (r < 0.55) emit(simulate({ type: 'comment', text: COMMENTS[Math.floor(Math.random() * COMMENTS.length)] }));
    else if (r < 0.85) emit(simulate({ type: 'like', count: 1 + Math.floor(Math.random() * 15) }));
    else if (r < 0.97) emit(simulate({ type: 'gift', giftId: '5655', count: 1 + Math.floor(Math.random() * 5) }));
    else emit(simulate({ type: 'gift', giftId: KNOWN_GIFTS[5 + Math.floor(Math.random() * 5)].id }));
  }, 350);
  return () => clearInterval(timer);
}
