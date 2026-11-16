/**
 * Sabit adımlı güncelleme + sınırlı kare hızında çizim.
 * Oyun mantığı kare hızından bağımsızdır; Düğün 60, diğer oyunlar varsayılan 30 fps ile sınırlıdır
 * (TikTok yayını zaten 30 fps; 144 Hz ekranda GPU boşuna 5 kat çalışmasın).
 * Adreste ?fps=60 ile değiştirilebilir.
 */
const params = new URLSearchParams(location.search);
const requested = Number(params.get('fps'));
const MAX_FPS = requested > 0 ? requested : params.get('game') === 'dugun' ? 60 : 30;

export class Loop {
  private last = 0;
  private acc = 0;
  private sinceDraw = Infinity;
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
    requestAnimationFrame(this.tick);
    const frame = Math.min((now - this.last) / 1000, 0.25); // sekme uyuduysa sıçramayı sınırla
    this.last = now;
    this.sinceDraw += frame;
    // Küçük pay: 60 Hz ekranda 30 fps hedefi her iki karede bir çizer
    if (this.sinceDraw < 1 / MAX_FPS - 0.004) {
      this.acc += this.paused ? 0 : frame;
      return;
    }
    if (!this.paused) {
      this.acc += frame;
      while (this.acc >= this.fixedDt) {
        this.step(this.fixedDt);
        this.acc -= this.fixedDt;
      }
    }
    this.sinceDraw = 0;
    this.draw();
  };
}
