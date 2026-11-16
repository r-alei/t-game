/** Yayın ekranının giriş noktası: sahneyi kurar, oyunu seçer, canlı olayları bağlar. */
import { Stage } from './engine/stage.ts';
import { Loop } from './engine/loop.ts';
import { Banner } from './engine/banner.ts';
import { renderGuides } from './engine/layout.ts';
import { LiveClient } from './net/live.ts';
import { isSoundEnabled, setSoundEnabled } from './engine/sfx.ts';
import { DEFAULT_GAME, GAMES } from './games/registry.ts';
import type { DugunGame } from './games/dugun/DugunGame.ts';

const params = new URLSearchParams(location.search);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const frame = $('frame');
const hud = $('hud');
const guides = $('guides');

const stage = new Stage($('scene') as HTMLCanvasElement, frame);
const banner = new Banner(hud);

const gameName = params.get('game') ?? DEFAULT_GAME;
const game = (GAMES[gameName] ?? GAMES[DEFAULT_GAME])();
const adminGame = gameName === 'dugun' ? game as DugunGame : null;
game.start({ stage, hud, banner });

renderGuides(guides);
guides.hidden = params.get('guides') !== '1';

const loop = new Loop(
  (dt) => game.update(dt),
  () => stage.render(),
);
loop.start();

const live = new LiveClient();
function publishAdminState(): void {
  if (!adminGame) return;
  const state = adminGame.getAdminState();
  state.paused = loop.paused;
  state.soundEnabled = isSoundEnabled();
  live.sendNow({ kind: 'dugun-state', state });
}
if (adminGame) {
  live.onOpen(() => { live.sendNow({ kind: 'dugun-register' }); publishAdminState(); });
  window.setInterval(publishAdminState, 1000);
}
live.on((msg) => {
  if (msg.kind === 'event') game.onEvent(msg.event);
  else if (msg.kind === 'control') {
    if (msg.command === 'reset') game.reset();
    if (msg.command === 'pause') loop.paused = true;
    if (msg.command === 'resume') loop.paused = false;
    if (msg.command === 'toggle-guides') guides.hidden = !guides.hidden;
    if (msg.command === 'sound-on') setSoundEnabled(true);
    if (msg.command === 'sound-off') setSoundEnabled(false);
    publishAdminState();
  } else if (msg.kind === 'dugun-command') {
    adminGame?.onAdmin(msg.command);
    publishAdminState();
  }
});

// Masaüstü yayın penceresinde (çerçevesiz Electron): sürükleyerek taşınır, Esc kapatır
if (navigator.userAgent.includes('Electron')) {
  document.documentElement.style.setProperty('-webkit-app-region', 'drag');
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close();
  });
}

// Geliştirmede konsoldan incelemek için
if (import.meta.env.DEV) Object.assign(window, { game, stage });

// Geliştirmede dosya değişince sahneyi temiz yeniden yükle.
if (import.meta.hot) import.meta.hot.dispose(() => location.reload());
