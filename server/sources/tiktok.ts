/**
 * TikTok LIVE bağlantısı. Yalnız olay toplar ve normalize eder;
 * oyun kuralı içermez. Bağlantı koparsa birkaç kez yeniden dener.
 */
import type { ConnectionStatus, LiveEvent, LiveEventType } from '../../shared/events.ts';
import { normalize } from '../normalize.ts';

type Handlers = {
  onEvent: (e: LiveEvent) => void;
  onStatus: (s: ConnectionStatus) => void;
};

const MAX_ATTEMPTS = 5;

export class TikTokSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private conn: any = null;
  private generation = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly handlers: Handlers) {}

  async start(username: string): Promise<void> {
    await this.stop('idle');
    const gen = this.generation;
    this.attempt(gen, username.replace(/^@/, '').trim(), 1);
  }

  async stop(state: ConnectionStatus['state'] = 'idle', message = 'Bağlantı kapalı'): Promise<void> {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    const conn = this.conn;
    this.conn = null;
    if (conn) await conn.disconnect().catch(() => undefined);
    this.status(state, '', message);
  }

  private status(state: ConnectionStatus['state'], username: string, message: string) {
    this.handlers.onStatus({ source: 'tiktok', state, username, message });
  }

  private async attempt(gen: number, username: string, n: number): Promise<void> {
    if (gen !== this.generation) return;
    this.status('connecting', username, `@${username} yayınına bağlanılıyor (${n}/${MAX_ATTEMPTS})`);

    const mod = await import('tiktok-live-connector');
    if (gen !== this.generation) return;

    const signApiKey = process.env.EULER_API_KEY;
    const conn = new mod.TikTokLiveConnection(username, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      ...(signApiKey ? { signApiKey } : {}),
    });
    this.conn = conn;

    const forward = (type: LiveEventType) => (raw: unknown) => {
      if (gen !== this.generation) return;
      const result = normalize(type, raw);
      if (result.ok) this.handlers.onEvent(result.event);
      else if (result.reason === 'invalid') console.warn(`[tiktok] ${type} atlandı: ${result.detail}`);
    };

    conn.on(mod.WebcastEvent.CHAT, forward('comment'));
    conn.on(mod.WebcastEvent.LIKE, forward('like'));
    conn.on(mod.WebcastEvent.GIFT, forward('gift'));
    conn.on(mod.WebcastEvent.FOLLOW, forward('follow'));
    conn.on(mod.WebcastEvent.SHARE, forward('share'));
    conn.on(mod.WebcastEvent.MEMBER, forward('join'));
    conn.on(mod.ControlEvent.ERROR, (err: unknown) => console.warn('[tiktok] hata', err));
    conn.on(mod.WebcastEvent.STREAM_END, () => {
      if (gen === this.generation) void this.stop('ended', 'Yayın sona erdi');
    });
    conn.on(mod.ControlEvent.DISCONNECTED, () => {
      if (gen !== this.generation) return;
      this.retry(gen, username, n, 'Bağlantı koptu');
    });

    try {
      const state = await conn.connect();
      if (gen !== this.generation) return void conn.disconnect();
      this.status('connected', username, `Bağlı · oda ${state.roomId}`);
    } catch (error) {
      if (gen !== this.generation) return;
      this.conn = null;
      const name = (error as Error)?.constructor?.name ?? 'Hata';
      const offline = /Offline/i.test(name);
      this.retry(gen, username, n, offline ? 'Hesap şu an canlı yayında değil' : `Bağlanamadı (${name})`);
    }
  }

  private retry(gen: number, username: string, n: number, reason: string) {
    if (n >= MAX_ATTEMPTS) {
      this.status('error', username, `${reason}. Panelden yeniden bağlan.`);
      return;
    }
    const seconds = 10 * n;
    this.status('retrying', username, `${reason}. ${seconds} sn sonra tekrar denenecek.`);
    this.timer = setTimeout(() => this.attempt(gen, username, n + 1), seconds * 1000);
  }
}
