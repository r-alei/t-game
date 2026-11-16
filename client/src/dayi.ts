import './dayi.css';
import { DayiSprite } from './dayiSprite.ts';
import { SpeakerMicrophone } from './games/dugun/microphone.ts';
import { LiveClient } from './net/live.ts';
import { parseDayiCommand, type DayiCommand } from '../../shared/dayi.ts';

const params = new URLSearchParams(location.search);
const background = params.get('bg');
if (background === 'green' || background === 'black') document.body.dataset.bg = background;
document.getElementById('name')!.textContent = params.get('ad')?.trim().slice(0, 80) || 'Dayı';
const dayi = new DayiSprite(document.getElementById('character')!);
const microphone = new SpeakerMicrophone();
const live = new LiveClient();
const key = 'dugun-dayi.microphone.v1';
let settings: DayiCommand = { enabled: true, threshold: 0.025 };
try { settings = parseDayiCommand(JSON.parse(localStorage.getItem(key) ?? 'null')) ?? settings; } catch { /* Depolama kapalı olabilir. */ }
function publish(): void { live.sendNow({ kind: 'dayi-state', state: microphone.getState() }); }
function configure(command: DayiCommand): void {
  settings = command;
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Mikrofon depolama olmadan da çalışır. */ }
  const pending = microphone.configure(settings.enabled, settings.threshold);
  publish();
  void pending.then(publish);
}
live.onOpen(publish);
live.on((message) => {
  if (message.kind === 'dayi-command') configure(message.command);
  else if (message.kind === 'dayi-cue') dayi.react(message.cue);
});
configure(settings);
const statusTimer = window.setInterval(publish, 250);

// Gerçek geçen süre; yenileme hızı animasyon sürelerini değiştirmez.
let previous = performance.now(), frame = 0;
function animate(now: number): void {
  const dt = Math.max(0, (now - previous) / 1000);
  previous = now;
  microphone.update(dt);
  dayi.update(dt, microphone.speech);
  frame = requestAnimationFrame(animate);
}
frame = requestAnimationFrame(animate);
// Tarayıcı ses bağlamı için etkileşim isterse ilk tıklamada yeniden dene.
addEventListener('pointerdown', () => {
  if (settings.enabled && microphone.status === 'unavailable') configure(settings);
});
if (navigator.userAgent.includes('Electron')) {
  document.documentElement.style.setProperty('-webkit-app-region', 'drag');
  addEventListener('keydown', (event) => { if (event.key === 'Escape') window.close(); });
}
addEventListener('pagehide', () => {
  cancelAnimationFrame(frame);
  clearInterval(statusTimer);
  microphone.stop();
  dayi.dispose();
});
if (import.meta.hot) import.meta.hot.dispose(() => location.reload());
