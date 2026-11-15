/** Oyun listesi. Ekran adresinde ?game=<ad> ile seçilir. */
import type { Game } from './Game.ts';
import { DemoGame } from './demo/DemoGame.ts';
import { VapurGame } from './vapur/VapurGame.ts';

export const GAMES: Record<string, () => Game> = {
  vapur: () => new VapurGame(),
  demo: () => new DemoGame(),
};

export const DEFAULT_GAME = 'vapur';
