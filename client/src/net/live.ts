/** Sunucuya WebSocket bağlantısı; koparsa kendiliğinden yeniden bağlanır. */
import type { ClientMessage, ServerMessage } from '../../../shared/events.ts';

type Listener = (msg: ServerMessage) => void;

export class LiveClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private outbox: string[] = [];
  private openListeners = new Set<() => void>();

  constructor(private readonly url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/live`) {
    this.open();
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  send(msg: ClientMessage): void {
    const data = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
    else this.outbox.push(data);
  }

  onOpen(fn: () => void): void {
    this.openListeners.add(fn);
    if (this.ws?.readyState === WebSocket.OPEN) fn();
  }

  /** Durum ve yönetim komutları bağlantı kapalıyken sonradan uygulanmak üzere birikmez. */
  sendNow(msg: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  private open(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      for (const fn of this.openListeners) fn();
      for (const d of this.outbox.splice(0)) ws.send(d);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as ServerMessage;
      for (const fn of this.listeners) fn(msg);
    };
    ws.onclose = () => setTimeout(() => this.open(), 1500);
  }
}
