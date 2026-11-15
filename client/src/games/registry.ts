/** Oyun listesi. Ekran adresinde ?game=<ad> ile seçilir. */
import type { Game } from './Game.ts';
import { DemoGame } from './demo/DemoGame.ts';
import { VapurGame } from './vapur/VapurGame.ts';
import { DugunGame } from './dugun/DugunGame.ts';

export const GAMES: Record<string, () => Game> = {
  vapur: () => new VapurGame(),
  dugun: () => new DugunGame(),
  demo: () => new DemoGame(),
};

export const DEFAULT_GAME = 'vapur';
