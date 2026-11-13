/** Aynı olayın iki kez işlenmesini engelleyen sınırlı hafıza. */
export class Dedupe {
  private seen = new Set<string>();
  constructor(private readonly limit = 20_000) {}

  /** Olay yeni ise true döner ve kaydeder. */
  accept(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    if (this.seen.size > this.limit) {
      // Set ekleme sırasını korur; en eskiyi at.
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    return true;
  }
}
