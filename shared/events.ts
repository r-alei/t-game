/**
 * Sunucu ile oyun ekranı arasındaki ortak dil.
 * TikTok'tan (veya simülatörden) gelen her şey önce bu biçime çevrilir;
 * oyun kodu TikTok kütüphanesinin ham verisini hiç görmez.
 */

export interface Viewer {
  /** TikTok'un sabit kullanıcı kimliği */
  id: string;
  /** Ekranda gösterilecek ad (kısaltılmış, filtrelenmiş) */
  name: string;
  /** https profil fotoğrafı adresi, yoksa boş */
  avatar: string;
}

interface BaseEvent {
  /** Tekrarı engellemek için benzersiz olay kimliği */
  id: string;
  at: number;
  viewer: Viewer;
}

export interface CommentEvent extends BaseEvent {
  type: 'comment';
  text: string;
}

export interface LikeEvent extends BaseEvent {
  type: 'like';
  count: number;
}

export interface GiftEvent extends BaseEvent {
  type: 'gift';
  giftId: string;
  giftName: string;
  /** Seri bittikten sonraki toplam adet */
  count: number;
  /** Tek hediyenin jeton (elmas) değeri */
  unitValue: number;
  /** count × unitValue */
  value: number;
}

export interface SimpleEvent extends BaseEvent {
  type: 'follow' | 'share' | 'join';
}

export type LiveEvent = CommentEvent | LikeEvent | GiftEvent | SimpleEvent;
export type LiveEventType = LiveEvent['type'];

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'retrying' | 'ended' | 'error';

export interface ConnectionStatus {
  source: 'tiktok' | 'simulator' | 'none';
  state: ConnectionState;
  username: string;
  message: string;
}

/** Sunucu → istemci mesajları (WebSocket) */
export type ServerMessage =
  | { kind: 'event'; event: LiveEvent }
  | { kind: 'status'; status: ConnectionStatus }
  | { kind: 'control'; command: ControlCommand };

/** Panel → sunucu mesajları (WebSocket) */
export type ClientMessage =
  | { kind: 'connect'; username: string }
  | { kind: 'disconnect' }
  | { kind: 'simulate'; event: SimulateRequest }
  | { kind: 'control'; command: ControlCommand };

export type SimulateRequest =
  | { type: 'comment'; text: string; name?: string }
  | { type: 'like'; count?: number; name?: string }
  | { type: 'gift'; giftId: string; count?: number; name?: string }
  | { type: 'follow' | 'share' | 'join'; name?: string }
  | { type: 'crowd'; seconds: number };

/** Yayıncının panelden oyuna gönderdiği komutlar */
export type ControlCommand = 'reset' | 'pause' | 'resume' | 'toggle-guides';
