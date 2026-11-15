/**
 * Kodla üretilen sesler (dosya gerekmez).
 *
 * VARSAYILAN KAPALI: Yayında çoğu yayıncı kendi müziğini/sesini kullanıyor; sık tekrarlanan
 * sentetik sesler rahatsız ediyordu. Panelden "Ses aç" ile ya da adrese ?ses=1 ekleyerek açılır.
 * Açıkken bile yumuşaktır ve seyrek çalar: düdük en fazla 20 sn'de bir, patlama 1,5 sn'de bir.
 */
let enabled = new URLSearchParams(location.search).get('ses') === '1';
let ctx: AudioContext | null = null;
let lastHorn = -Infinity;
let lastPop = -Infinity;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (!on && ctx) void ctx.suspend();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Uzaktan gelen yumuşak vapur düdüğü: iki sinüs, yavaş açılıp kapanır, kısık */
export function horn(duration = 1.4): void {
  const a = audio();
  if (!a) return;
  const nowMs = performance.now();
  if (nowMs - lastHorn < 20_000) return;
  lastHorn = nowMs;

  const now = a.currentTime;
  const volume = 0.06;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.45);
  gain.gain.setValueAtTime(volume, now + duration - 0.6);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  filter.connect(gain).connect(a.destination);
  for (const f of [110, 164.8]) {
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + duration);
  }
}

/** Konfeti için kısa, boğuk "püf" */
export function pop(): void {
  const a = audio();
  if (!a) return;
  const nowMs = performance.now();
  if (nowMs - lastPop < 1500) return;
  lastPop = nowMs;

  const now = a.currentTime;
  const buffer = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const gain = a.createGain();
  gain.gain.value = 0.05;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(now);
}
