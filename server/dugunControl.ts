import type { WebSocket } from 'ws';
import type { ClientMessage, CommentEvent, LiveEvent, ServerMessage, Viewer } from '../shared/events.ts';
import type { DugunState } from '../shared/dugun.ts';
import { parseDugunCommand } from '../shared/dugun.ts';

/** Tek etkin düğün ekranı yönetilir; durum panel yenilendiğinde tekrar gönderilir. */
export class DugunControl {
  private screens = new Set<WebSocket>();
  private panels = new Set<WebSocket>();
  private owner: WebSocket | null = null;
  private state: DugunState | null = null;
  private chat: CommentEvent[] = [];
  private chatViewers = new Map<string, Viewer>();

  rememberEvent(event: LiveEvent): void {
    if (event.type !== 'comment') return;
    this.chat.push(event);
    this.chatViewers.set(event.viewer.id, event.viewer);
    if (this.chat.length > 200) this.chat.shift();
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === 1) ws.send(JSON.stringify(message));
  }
  private publish(): void {
    for (const panel of this.panels) this.send(panel, { kind: 'dugun-state', state: this.state });
  }
  handle(ws: WebSocket, msg: ClientMessage): void {
    if (msg.kind === 'dugun-register') {
      this.screens.add(ws);
      this.owner ??= ws;
    } else if (msg.kind === 'dugun-subscribe') {
      this.panels.add(ws);
      this.send(ws, { kind: 'dugun-chat', events: this.chat });
      this.send(ws, { kind: 'dugun-state', state: this.state });
    } else if (msg.kind === 'dugun-state') {
      if (ws !== this.owner || !msg.state || !Array.isArray(msg.state.participants)) return;
      this.state = msg.state;
      this.publish();
    } else if (msg.kind === 'dugun-command' || msg.kind === 'dugun-control') {
      if (!this.owner || this.owner.readyState !== 1) {
        this.send(ws, { kind: 'dugun-error', message: 'Önce Düğün Dernek oyun ekranını aç.' });
        return;
      }
      if (msg.kind === 'dugun-command') {
        const command = parseDugunCommand(msg.command);
        if (!command) {
          this.send(ws, { kind: 'dugun-error', message: 'Komut geçersiz; sayı ve kişi seçimini kontrol et.' });
          return;
        }
        // Sohbetten seçilen kişi sahnede olmasa bile gerçek kimliğiyle eklenir.
        // İstemciden serbest viewer kabul edilmez; kimlik normalleştirilmiş sohbetten alınır.
        if (command.action === 'assign' && 'id' in command.person) {
          const id = command.person.id;
          const author = this.chatViewers.get(id);
          if (author) command.person = { viewer: author };
        }
        this.send(this.owner, { kind: 'dugun-command', command });
      } else if (['reset', 'pause', 'resume', 'toggle-guides', 'sound-on', 'sound-off'].includes(msg.command)) {
        this.send(this.owner, { kind: 'control', command: msg.command });
      }
    }
  }
  close(ws: WebSocket): void {
    this.panels.delete(ws);
    this.screens.delete(ws);
    if (this.owner === ws) {
      this.owner = [...this.screens].find((screen) => screen.readyState === 1) ?? null;
      this.state = null;
      this.publish();
    }
  }
}
