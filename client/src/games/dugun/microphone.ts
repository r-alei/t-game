import type { DugunState } from '../../../../shared/dugun.ts';

/** Ses yalnız yerelde analiz edilir; kayıt, hoparlöre yönlendirme veya ses aktarımı yoktur. */
export class KahyaMicrophone {
  enabled = false;
  threshold = 0.025;
  level = 0;
  speech = 0;
  status: NonNullable<DugunState['microphone']>['status'] = 'off';
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private samples = new Float32Array(1024);
  private generation = 0;
  private gate = false;
  private hold = 0;

  async configure(enabled: boolean, threshold: number): Promise<void> {
    this.threshold = threshold;
    if (enabled && this.enabled && this.status !== 'unavailable') return;
    this.stop();
    if (!enabled) return;
    this.enabled = true;
    this.status = 'requesting';
    const generation = this.generation;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== this.generation) { stream.getTracks().forEach((t) => t.stop()); return; }
      this.stream = stream;
      const context = new AudioContext();
      this.context = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = this.samples.length;
      context.createMediaStreamSource(stream).connect(analyser);
      this.analyser = analyser;
      await context.resume();
      if (generation !== this.generation) return;
      if (context.state !== 'running') throw new Error('Ses bağlamı başlamadı');
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => { if (generation === this.generation) this.fail(); };
      });
      this.status = 'ready';
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      if (generation === this.generation) this.fail();
    }
  }

  update(dt: number): void {
    if (!this.analyser || this.status !== 'ready') return;
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const sample of this.samples) sum += sample * sample;
    const rms = Math.sqrt(sum / this.samples.length);
    this.level += (rms - this.level) * (1 - Math.exp(-dt * 15));
    // Histerezis + kısa bekleme fan sesindeki eşik geçişlerini bastırır.
    if (this.level > this.threshold) { this.gate = true; this.hold = 0.14; }
    else if (this.level < this.threshold * 0.65) {
      this.hold -= dt;
      if (this.hold <= 0) this.gate = false;
    }
    const target = this.gate ? Math.min(1, Math.max(0, (this.level - this.threshold * 0.5) / (this.threshold * 3))) : 0;
    this.speech += (target - this.speech) * (1 - Math.exp(-dt * (target > this.speech ? 22 : 9)));
  }

  private fail(): void { this.stop(); this.enabled = true; this.status = 'unavailable'; }

  stop(): void {
    this.generation++;
    this.stream?.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    this.stream = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.analyser = null;
    this.enabled = this.gate = false;
    this.level = this.speech = this.hold = 0;
    this.status = 'off';
  }

  getState(): NonNullable<DugunState['microphone']> {
    return { enabled: this.enabled, threshold: this.threshold, level: this.level, status: this.status };
  }
}
