import * as THREE from 'three';
import { Dancer, type Beat } from './dancers.ts';

/** Kalıcı yayıncı figürü; hediye/katılımcı listesine hiçbir zaman eklenmez. */
export class Kahya {
  private readonly dancer = new Dancer({ id: 'host:kahya', name: 'Kâhya', avatar: '' }, 'kahya');
  private target: Dancer | null = null;
  private greetUntil = 0;
  private nextGreeting = 0;

  constructor(scene: THREE.Scene) {
    this.dancer.group.position.set(1.3, 0.5, -11.8);
    this.dancer.pinnedTag = true;
    scene.add(this.dancer.group);
  }

  greet(person: Dancer, now: number): void {
    if (now < this.nextGreeting) return;
    this.nextGreeting = now + 8 + Math.random() * 8;
    this.target = person;
    this.greetUntil = now + 2;
    this.dancer.wave(now, 2);
  }

  update(dt: number, now: number, beat: Beat, speech: number): void {
    const d = this.dancer;
    if (speech > 0.04) d.wave(0, 0);
    d.speechLevel = speech;
    if (speech < 0.04 && this.target && now < this.greetUntil) {
      const p = this.target.group.position;
      d.facing = Math.atan2(p.x - d.group.position.x, p.z - d.group.position.z);
    } else {
      this.target = null;
      d.facing = speech > 0.04 ? 0 : Math.sin(now * 0.25) * 0.35;
    }
    // Yakın çekimde de yayıncının kimliği kalır.
    d.update(dt, now, beat, null);
  }

  dispose(): void { this.target = null; this.dancer.dispose(); }
}
