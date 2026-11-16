import type { WebSocket } from 'ws';
import type { ServerMessage } from '../shared/events.ts';
import { parseDayiCommand, parseDayiCue, parseDayiState, type DayiState } from '../shared/dayi.ts';

/** Dayı ekranı kapanınca panelde eski mikrofon durumu açık kalmaz. */
export class DayiControl {
  private owner: WebSocket | null = null;
  private state: DayiState | null = null;
  constructor(private readonly broadcast: (message: ServerMessage) => void) {}

  snapshot(): ServerMessage { return { kind: 'dayi-state', state: this.state }; }

  handle(ws: WebSocket, msg: { kind: string; command?: unknown; cue?: unknown; state?: unknown }): void {
    if (msg.kind === 'dayi-command') {
      const command = parseDayiCommand(msg.command);
      if (command) this.broadcast({ kind: 'dayi-command', command });
    } else if (msg.kind === 'dayi-cue') {
      const cue = parseDayiCue(msg.cue);
      if (cue) this.broadcast({ kind: 'dayi-cue', cue });
    } else if (msg.kind === 'dayi-state') {
      const state = parseDayiState(msg.state);
      if (!state || (this.owner && this.owner !== ws)) return;
      this.owner = ws;
      this.state = state;
      this.broadcast(this.snapshot());
    }
  }

  close(ws: WebSocket): void {
    if (this.owner !== ws) return;
    this.owner = null;
    this.state = null;
    this.broadcast(this.snapshot());
  }
}
