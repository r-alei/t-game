import type { Viewer } from './events.ts';
import { findGift } from './gifts.ts';

export const GIFT_ICONS: Record<string, string> = {
  '5655': 'rose', '5487': 'finger-heart', '6064': 'gg', '5879': 'doughnut', '5658': 'perfume',
  '5585': 'confetti', '8750': 'microphone', '6097': 'little-crown', '6267': 'corgi', '5712': 'trophy',
};
export type DugunGiftMoment = 'mendil' | 'gelin' | 'damat' | 'kaynana' | 'davulcu' | 'zurnaci' | 'havaya';
export interface DugunGiftRule { moment: DugunGiftMoment; giftId: string; count: number }

export const DUGUN_ROLES = ['guest', 'halaybasi', 'gelin', 'damat', 'kaynana', 'davulcu', 'zurnaci'] as const;
export type DugunRole = typeof DUGUN_ROLES[number];
export const ROLE_LABELS: Record<DugunRole, string> = {
  guest: 'Halaycı', halaybasi: 'Halaybaşı', gelin: 'Gelin', damat: 'Damat', kaynana: 'Kaynana',
  davulcu: 'Davulcu', zurnaci: 'Zurnacı',
};
export const DUGUN_OPTIONS = ['interactionsEnabled', 'rolesLocked', 'kaynanaEnabled', 'tempoFromLikes', 'hudVisible', 'namesVisible'] as const;
export type DugunOption = typeof DUGUN_OPTIONS[number];
export type DugunCamera = 'auto' | 'wide' | 'top' | 'couple' | 'person';
export type DugunCommand =
  | { action: 'assign'; role: DugunRole; person: { id: string } | { name: string } | { viewer: Viewer } }
  | { action: 'remove'; id: string }
  | { action: 'clear-role'; role: Exclude<DugunRole, 'guest'> }
  | { action: 'set-time' | 'set-duration' | 'set-tempo'; value: number }
  | { action: 'set-option'; option: DugunOption; value: boolean }
  | { action: 'set-gift'; rule: DugunGiftRule }
  | { action: 'effect'; effect: 'break-halay' | 'throw-groom' | 'confetti' | 'scold' }
  | { action: 'camera'; view: DugunCamera; id?: string }
  | { action: 'new-wedding' | 'finish-wedding' };

export interface DugunState {
  participants: { viewer: Viewer; role: DugunRole; manual: boolean }[];
  remainingSeconds: number;
  durationSeconds: number;
  tempo: number;
  phase: 'wedding' | 'ceremony';
  musicPlaying: boolean;
  options: Record<DugunOption, boolean>;
  giftRules: DugunGiftRule[];
  camera: DugunCamera;
  notice: string;
  paused: boolean;
  soundEnabled: boolean;
}

/** WebSocket sınırında yalnız bilinen komut ve sonlu, aralıklı değerler kabul edilir. */
export function parseDugunCommand(input: unknown): DugunCommand | null {
  if (!input || typeof input !== 'object') return null;
  const c = input as Record<string, unknown>;
  const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
  switch (c.action) {
    case 'assign': {
      if (!DUGUN_ROLES.includes(c.role as DugunRole) || !c.person || typeof c.person !== 'object') return null;
      const person = c.person as Record<string, unknown>;
      if (text(person.id)) return { action: c.action, role: c.role as DugunRole, person: { id: String(person.id) } };
      if (text(person.name)) return { action: c.action, role: c.role as DugunRole, person: { name: String(person.name).trim().slice(0, 20) } };
      return null;
    }
    case 'remove': return text(c.id) ? { action: c.action, id: String(c.id) } : null;
    case 'clear-role': return DUGUN_ROLES.includes(c.role as DugunRole) && c.role !== 'guest'
      ? { action: c.action, role: c.role as Exclude<DugunRole, 'guest'> } : null;
    case 'set-time':
    case 'set-duration':
    case 'set-tempo': {
      const max = c.action === 'set-tempo' ? 240 : 7200;
      const min = c.action === 'set-tempo' ? 60 : 1;
      return typeof c.value === 'number' && Number.isFinite(c.value) && c.value >= min && c.value <= max
        ? { action: c.action, value: c.value } : null;
    }
    case 'set-option': return DUGUN_OPTIONS.includes(c.option as DugunOption) && typeof c.value === 'boolean'
      ? { action: c.action, option: c.option as DugunOption, value: c.value } : null;
    case 'set-gift': {
      if (!c.rule || typeof c.rule !== 'object') return null;
      const r = c.rule as Record<string, unknown>;
      return ['mendil', 'gelin', 'damat', 'kaynana', 'davulcu', 'zurnaci', 'havaya'].includes(String(r.moment))
        && typeof r.giftId === 'string' && !!findGift(r.giftId)
        && typeof r.count === 'number' && Number.isInteger(r.count) && r.count >= 1 && r.count <= 1000
        ? { action: c.action, rule: { moment: r.moment as DugunGiftMoment, giftId: r.giftId, count: r.count } } : null;
    }
    case 'effect': return ['break-halay', 'throw-groom', 'confetti', 'scold'].includes(String(c.effect))
      ? { action: c.action, effect: c.effect as Extract<DugunCommand, { action: 'effect' }>['effect'] } : null;
    case 'camera': return ['auto', 'wide', 'top', 'couple', 'person'].includes(String(c.view)) && (c.view !== 'person' || text(c.id))
      ? { action: c.action, view: c.view as DugunCamera, ...(text(c.id) ? { id: String(c.id) } : {}) } : null;
    case 'new-wedding':
    case 'finish-wedding': return { action: c.action };
    default: return null;
  }
}
