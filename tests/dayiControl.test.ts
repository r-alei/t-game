import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { DayiControl } from '../server/dayiControl.ts';
import { parseDayiCommand, parseDayiCue, parseDayiState } from '../shared/dayi.ts';

describe('Dayı mesaj doğrulaması ve dağıtımı', () => {
  const command = { enabled: true, threshold: 0.025 };
  const state = { ...command, level: 0.1, status: 'ready' as const };
  it('yalnız bilinen jest ve sonlu aralıklı mikrofon değerlerini kabul eder', () => {
    expect(parseDayiCommand(command)).toEqual(command);
    for (const threshold of [NaN, Infinity, 0, 0.201, '0.025']) {
      expect(parseDayiCommand({ ...command, threshold })).toBeNull();
    }
    expect(parseDayiCommand({ ...command, enabled: 1 })).toBeNull();
    expect(parseDayiCommand(null)).toBeNull();
    for (const cue of ['shock', 'cheer', 'clap']) expect(parseDayiCue(cue)).toBe(cue);
    for (const cue of ['surprise', '', {}, null]) expect(parseDayiCue(cue)).toBeNull();
    expect(parseDayiState(state)).toEqual(state);
    for (const level of [-1, Infinity, NaN, 1.01, '0']) expect(parseDayiState({ ...state, level })).toBeNull();
    expect(parseDayiState({ ...state, status: 'unknown' })).toBeNull();
    expect(parseDayiState({ ...state, status: ['ready'] })).toBeNull();
  });
  it('panel komutunu, oyun jestini ve dayı durumunu yayınlar; kapanışta durumu temizler', () => {
    const publish = vi.fn(), hub = new DayiControl(publish);
    const dayi = {} as WebSocket, panel = {} as WebSocket, game = {} as WebSocket;
    hub.handle(panel, { kind: 'dayi-command', command });
    expect(publish).toHaveBeenLastCalledWith({ kind: 'dayi-command', command });
    hub.handle(game, { kind: 'dayi-cue', cue: 'shock' });
    expect(publish).toHaveBeenLastCalledWith({ kind: 'dayi-cue', cue: 'shock' });
    hub.handle(dayi, { kind: 'dayi-state', state });
    expect(hub.snapshot()).toEqual({ kind: 'dayi-state', state });
    hub.handle(panel, { kind: 'dayi-state', state: { ...state, enabled: false } });
    expect(hub.snapshot()).toEqual({ kind: 'dayi-state', state });
    hub.close(panel);
    expect(hub.snapshot()).toEqual({ kind: 'dayi-state', state });
    hub.close(dayi);
    expect(publish).toHaveBeenLastCalledWith({ kind: 'dayi-state', state: null });
    hub.handle(panel, { kind: 'dayi-state', state });
    expect(hub.snapshot()).toEqual({ kind: 'dayi-state', state });
  });
  it('geçersiz mesajları yayınlamaz', () => {
    const publish = vi.fn(), hub = new DayiControl(publish), socket = {} as WebSocket;
    hub.handle(socket, { kind: 'dayi-command', command: { enabled: true, threshold: 0 } });
    hub.handle(socket, { kind: 'dayi-cue', cue: 'unknown' });
    hub.handle(socket, { kind: 'dayi-state', state: { ...state, status: 'unknown' } });
    expect(publish).not.toHaveBeenCalled();
  });
});
