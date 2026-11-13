/** Oyun listesi. Ekran adresinde ?game=<ad> ile seçilir. */
import type { Game } from './Game.ts';
import { DemoGame } from './demo/DemoGame.ts';

export const GAMES: Record<string, () => Game> = {
  demo: () => new DemoGame(),
};

export const DEFAULT_GAME = 'demo';
