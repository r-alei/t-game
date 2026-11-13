/**
 * three.js sahnesi: renderer, kamera, ışık ve pencereye ölçekleme.
 * Oyunlar sahneyi buradan alır; renderer ayarlarına dokunmaz.
 */
import * as THREE from 'three';
import { SCREEN } from './layout.ts';

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  constructor(canvas: HTMLCanvasElement, private readonly frame: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(1); // mantıksal 1080×1920 zaten yüksek
    this.renderer.setSize(SCREEN.width, SCREEN.height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(40, SCREEN.width / SCREEN.height, 0.1, 500);

    window.addEventListener('resize', () => this.fit());
    this.fit();
  }

  /** 1080×1920 çerçeveyi pencereye sığdırır (OBS/LIVE Studio kaynağı da bu sayede ölçeklenir). */
  fit(): void {
    const scale = Math.min(window.innerWidth / SCREEN.width, window.innerHeight / SCREEN.height);
    this.frame.style.setProperty('--scale', String(scale));
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Oyun değişirken sahneyi boşaltır ve GPU kaynaklarını serbest bırakır. */
  clear(): void {
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.scene.clear();
  }
}
