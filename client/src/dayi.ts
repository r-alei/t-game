import './dayi.css';
import { Dayi, type DayiReaction } from './games/dugun/dayi.ts';
import { SpeakerMicrophone } from './games/dugun/microphone.ts';
import { LiveClient } from './net/live.ts';
import { parseDayiCommand, type DayiCommand, type DayiCue } from '../../shared/dayi.ts';

const params = new URLSearchParams(location.search);
const background = params.get('bg');
if (background === 'green' || background === 'black') document.body.dataset.bg = background;
document.getElementById('name')!.textContent = params.get('ad')?.trim().slice(0, 80) || 'Dayı';
const composition = document.getElementById('composition')!;
function resize(): void {
  const scale = Math.min(innerWidth / 1080, innerHeight / 608);
  composition.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
addEventListener('resize', resize);
resize();

const dayi = new Dayi(document.getElementById('character')!);
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
const reactions: Record<DayiCue, DayiReaction> = { shock: 'surprise', cheer: 'celebrate', clap: 'solo' };
live.onOpen(publish);
live.on((message) => {
  if (message.kind === 'dayi-command') configure(message.command);
  else if (message.kind === 'dayi-cue') dayi.react(reactions[message.cue]);
});
configure(settings);
const statusTimer = window.setInterval(publish, 250);

// Sabit 1/60 saniyelik adımlar; yüksek yenilemeli ekranlarda da aynı hızda oynar.
const step = 1 / 60;
let previous = performance.now(), accumulator = 0, frame = 0;
function animate(now: number): void {
  accumulator += Math.min(0.1, Math.max(0, (now - previous) / 1000));
  previous = now;
  while (accumulator >= step) {
    microphone.update(step);
    dayi.update(step, microphone.speech);
    accumulator -= step;
  }
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
