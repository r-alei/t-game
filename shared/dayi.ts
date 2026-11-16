export interface DayiCommand { enabled: boolean; threshold: number }
export type DayiCue = 'shock' | 'cheer' | 'clap';
export interface DayiState extends DayiCommand {
  level: number;
  status: 'off' | 'requesting' | 'ready' | 'unavailable';
}

/** WebSocket sınırında tür ve sonlu değer aralıklarını doğrular. */
export function parseDayiCommand(input: unknown): DayiCommand | null {
  if (!input || typeof input !== 'object') return null;
  const c = input as Record<string, unknown>;
  return typeof c.enabled === 'boolean' && typeof c.threshold === 'number'
    && Number.isFinite(c.threshold) && c.threshold >= 0.005 && c.threshold <= 0.2
    ? { enabled: c.enabled, threshold: c.threshold } : null;
}

export function parseDayiCue(input: unknown): DayiCue | null {
  return input === 'shock' || input === 'cheer' || input === 'clap' ? input : null;
}

export function parseDayiState(input: unknown): DayiState | null {
  const command = parseDayiCommand(input);
  if (!command) return null;
  const s = input as Record<string, unknown>;
  return typeof s.level === 'number' && Number.isFinite(s.level) && s.level >= 0 && s.level <= 1
    && typeof s.status === 'string' && ['off', 'requesting', 'ready', 'unavailable'].includes(s.status)
    ? { ...command, level: s.level, status: s.status as DayiState['status'] } : null;
}
