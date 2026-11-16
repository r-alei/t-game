import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { DugunControl } from '../server/dugunControl.ts';
import { parseDugunCommand, type DugunState } from '../shared/dugun.ts';

const socket = () => ({ readyState: 1, send: vi.fn() });
type Socket = ReturnType<typeof socket>;
const ws = (socket: Socket) => socket as unknown as WebSocket;
const last = (socket: Socket) => JSON.parse(socket.send.mock.calls.at(-1)![0]);

describe('düğün yönetim bağlantısı', () => {
  it('sohbet geçmişi panel yenilenince gelir; sahnede olmayan kişi gerçek kimliğiyle atanır', () => {
    const hub = new DugunControl(), screen = socket(), panel = socket();
    const viewer = { id: 'tiktok-42', name: 'Ayşe', avatar: 'https://example.com/a.png' };
    const comment = { type: 'comment' as const, id: 'chat-1', at: 1, viewer, text: 'Beni gelin yap' };
    hub.rememberEvent(comment);
    hub.handle(ws(screen), { kind: 'dugun-register' });
    hub.handle(ws(panel), { kind: 'dugun-subscribe' });
    expect(JSON.parse(panel.send.mock.calls[0][0])).toEqual({ kind: 'dugun-chat', events: [comment] });
    hub.handle(ws(panel), { kind: 'dugun-command', command: { action: 'assign', role: 'gelin', person: { id: viewer.id } } });
    expect(last(screen)).toEqual({ kind: 'dugun-command', command: { action: 'assign', role: 'gelin', person: { viewer } } });
    // Aynı isimle gelen diğer hesabın kimliği karışmaz.
    hub.rememberEvent({ ...comment, id: 'chat-2', viewer: { ...viewer, id: 'tiktok-99' } });
    hub.handle(ws(panel), { kind: 'dugun-command', command: { action: 'assign', role: 'damat', person: { id: 'tiktok-99' } } });
    expect(last(screen).command.person.viewer.id).toBe('tiktok-99');
  });

  it('son 200 mesaj tutulur, eski mesaj sahibi kimliğiyle seçilebilir', () => {
    const hub = new DugunControl(), screen = socket(), panel = socket();
    for (let i = 0; i < 205; i++) hub.rememberEvent({ type: 'comment', id: String(i), at: i, text: 'selam', viewer: { id: `u${i}`, name: 'Kişi', avatar: '' } });
    hub.handle(ws(screen), { kind: 'dugun-register' });
    hub.handle(ws(panel), { kind: 'dugun-subscribe' });
    const history = JSON.parse(panel.send.mock.calls[0][0]);
    expect(history.events).toHaveLength(200);
    expect(history.events[0].id).toBe('5');
    hub.handle(ws(panel), { kind: 'dugun-command', command: { action: 'assign', role: 'gelin', person: { id: 'u0' } } });
    expect(last(screen).command.person.viewer.id).toBe('u0');
  });
  it('panel komutunu yalnız kayıtlı etkin düğün ekranına iletir', () => {
    const hub = new DugunControl(), screen = socket(), panel = socket(), second = socket();
    hub.handle(ws(screen), { kind: 'dugun-register' });
    hub.handle(ws(second), { kind: 'dugun-register' });
    hub.handle(ws(panel), { kind: 'dugun-command', command: { action: 'assign', role: 'gelin', person: { name: 'Ayşe' } } });
    expect(last(screen)).toMatchObject({ kind: 'dugun-command', command: { role: 'gelin' } });
    expect(second.send).not.toHaveBeenCalled();
    hub.handle(ws(panel), { kind: 'dugun-control', command: 'pause' });
    expect(last(screen)).toEqual({ kind: 'control', command: 'pause' });
  });

  it('yenilenen panele son durumu yollar ve ekran kapanınca durumu temizler', () => {
    const hub = new DugunControl(), screen = socket(), panel = socket();
    hub.handle(ws(screen), { kind: 'dugun-register' });
    const state = { participants: [], remainingSeconds: 37 } as unknown as DugunState;
    hub.handle(ws(screen), { kind: 'dugun-state', state });
    hub.handle(ws(panel), { kind: 'dugun-subscribe' });
    expect(last(panel)).toEqual({ kind: 'dugun-state', state });
    hub.close(ws(screen));
    expect(last(panel)).toEqual({ kind: 'dugun-state', state: null });
    hub.handle(ws(panel), { kind: 'dugun-command', command: { action: 'new-wedding' } });
    expect(last(panel).kind).toBe('dugun-error');
  });

  it('sahte durum ve geçersiz komut oyuna iletilmez', () => {
    const hub = new DugunControl(), screen = socket(), panel = socket();
    hub.handle(ws(screen), { kind: 'dugun-register' });
    hub.handle(ws(panel), { kind: 'dugun-state', state: { participants: [] } as unknown as DugunState });
    hub.handle(ws(panel), { kind: 'dugun-subscribe' });
    expect(last(panel).state).toBeNull();
    hub.handle(ws(panel), { kind: 'dugun-command', command: { action: 'set-time', value: -100 } });
    expect(last(panel).kind).toBe('dugun-error');
    expect(screen.send).not.toHaveBeenCalled();
  });
});

it('yönetim komutları değer aralığı, boş kişi ve geçersiz rolleri reddeder', () => {
  expect(parseDugunCommand({ action: 'set-gift', rule: { moment: 'ortaya', giftId: '5879', count: 1 } })).not.toBeNull();
  expect(parseDugunCommand({ action: 'assign', person: { name: 'X' }, role: 'dayi' })).toBeNull();
  expect(parseDugunCommand({ action: 'set-time', value: Infinity })).toBeNull();
  expect(parseDugunCommand({ action: 'set-tempo', value: 999 })).toBeNull();
  expect(parseDugunCommand({ action: 'assign', person: { name: ' ' }, role: 'gelin' })).toBeNull();
  expect(parseDugunCommand({ action: 'assign', person: { name: 'Ayşe' }, role: 'yok' })).toBeNull();
  expect(parseDugunCommand({ action: 'camera', view: 'person' })).toBeNull();
  expect(parseDugunCommand({ action: 'set-option', option: 'yok', value: true })).toBeNull();
  expect(parseDugunCommand({ action: 'set-gift', rule: { moment: 'gelin', giftId: '5655', count: -1 } })).toBeNull();
  expect(parseDugunCommand({ action: 'set-gift', rule: { moment: 'gelin', giftId: 'bilinmeyen', count: 1 } })).toBeNull();
  expect(parseDugunCommand({ action: 'assign', role: 'gelin', person: { viewer: { id: 'spoof', name: 'Sahte' } } })).toBeNull();
});

it('panel gerçek Buket kimliğini katalogda olmasa da kabul eder', () => {
  expect(parseDugunCommand({ action: 'set-gift', rule: { moment: 'gelin', giftId: '9999', count: 1 } })).not.toBeNull();
  expect(parseDugunCommand({ action: 'set-gift', rule: { moment: 'gelin', giftId: 'bouquet', count: 1 } })).not.toBeNull();
});
