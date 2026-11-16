import * as THREE from 'three';

const MAX = 120;
interface Note { pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; life: number; phase: number }

/** Yalnız dekoratif oyun parası: bakiye, ödül veya para kazanma vaadi yoktur. */
export class MoneyRain {
  private mesh: THREE.InstancedMesh;
  private notes: (Note | null)[] = Array(MAX).fill(null);
  private cursor = 0;
  private matrix = new THREE.Matrix4();
  private quaternion = new THREE.Quaternion();
  private scale = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#80be89'; ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#e0f2cc'; ctx.lineWidth = 4; ctx.strokeRect(5, 5, 118, 54);
    ctx.fillStyle = '#244d3c'; ctx.font = 'bold 24px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OYUN', 64, 32);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.65, 0.32),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), MAX);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) this.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    scene.add(this.mesh);
  }

  burst(at: THREE.Vector3, count: number): void {
    for (let i = 0; i < Math.min(MAX, count); i++) {
      const index = this.cursor++ % MAX;
      this.notes[index] = { pos: at.clone(), vel: new THREE.Vector3((Math.random() - .5) * 5, 3 + Math.random() * 3, (Math.random() - .5) * 5),
        rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, 0), life: 4, phase: Math.random() * 6 };
    }
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i++) {
      const note = this.notes[i]; if (!note) continue;
      note.life -= dt;
      if (note.life <= 0) { this.notes[i] = null; this.mesh.setMatrixAt(i, this.matrix.makeScale(0, 0, 0)); continue; }
      note.vel.y -= dt * 2.3; note.vel.multiplyScalar(Math.exp(-dt * .6));
      note.pos.addScaledVector(note.vel, dt);
      note.pos.x += Math.sin(note.life * 7 + note.phase) * dt * .6;
      note.rot.x += dt * 2; note.rot.z += dt * Math.sin(note.phase + note.life);
      this.quaternion.setFromEuler(note.rot);
      this.scale.setScalar(Math.min(1, note.life));
      this.mesh.setMatrixAt(i, this.matrix.compose(note.pos, this.quaternion, this.scale));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    (this.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
  }
}
