/** Sabit adımlı güncelleme + her karede çizim. Oyun mantığı kare hızından bağımsız kalır. */
export class Loop {
  private last = 0;
  private acc = 0;
  private running = false;
  paused = false;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly draw: () => void,
    private readonly fixedDt = 1 / 60,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const frame = Math.min((now - this.last) / 1000, 0.25); // sekme uyuduysa sıçramayı sınırla
    this.last = now;
    if (!this.paused) {
      this.acc += frame;
      while (this.acc >= this.fixedDt) {
        this.step(this.fixedDt);
        this.acc -= this.fixedDt;
      }
    }
    this.draw();
    requestAnimationFrame(this.tick);
  };
}
