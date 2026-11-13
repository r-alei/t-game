/**
 * Her oyunun uyması gereken sözleşme.
 * Yeni oyun = games/<ad>/ klasörü + bu arayüzü uygulayan bir sınıf + registry.ts'e bir satır.
 */
import type { LiveEvent } from '../../../shared/events.ts';
import type { Stage } from '../engine/stage.ts';
import type { Banner } from '../engine/banner.ts';

export interface GameContext {
  stage: Stage;
  /** HTML katmanı (skor, sayaç, yazılar) */
  hud: HTMLElement;
  banner: Banner;
}

export interface Game {
  /** Sahneyi kurar */
  start(ctx: GameContext): void;
  /** Sabit adımda (1/60 sn) çağrılır */
  update(dt: number): void;
  /** Her canlı olay için çağrılır */
  onEvent(event: LiveEvent): void;
  /** Paneldeki "Sıfırla" */
  reset(): void;
  /** Oyundan çıkarken kaynakları bırakır */
  dispose(): void;
}
