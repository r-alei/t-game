/**
 * three.js sahnesi: renderer, kamera, ışık ve pencereye ölçekleme.
 * Oyunlar sahneyi buradan alır; renderer ayarlarına dokunmaz.
 *
 * Performans: Sahne mantıksal olarak 1080×1920'dir ama GPU yalnız pencerenin
 * gerçekten gösterdiği piksel kadar çizer (576×1024 pencerede 3,5 kat daha az iş).
 * Adreste ?cozunurluk=1 verilirse her zaman tam 1080×1920 çizer.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SCREEN } from './layout.ts';

export interface BloomOptions {
  strength?: number;
  radius?: number;
  threshold?: number;
}

const params = new URLSearchParams(location.search);
/** 1 = her zaman tam çözünürlük; boş = pencere boyutu kadar */
const FORCE_FULL = params.get('cozunurluk') === '1';

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloom: BloomOptions | null = null;

  constructor(canvas: HTMLCanvasElement, private readonly frame: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(40, SCREEN.width / SCREEN.height, 0.1, 2000);

    window.addEventListener('resize', () => this.fit());
    this.fit();
  }

  /** Işıkların parlamasını (bloom) açar. Gece sahneleri için; GPU'ya ek yük getirir. */
  enableBloom(opts: BloomOptions = {}): void {
    this.bloom = opts;
    this.buildComposer();
  }

  private buildComposer(): void {
    if (!this.bloom) return;
    this.composer?.dispose();
    const { strength = 0.8, radius = 0.5, threshold = 0.7 } = this.bloom;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const composer = new EffectComposer(this.renderer);
    composer.setSize(size.x, size.y);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), strength, radius, threshold));
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  /** 1080×1920 çerçeveyi pencereye sığdırır ve çizim çözünürlüğünü gösterilen boyuta indirir. */
  fit(): void {
    const scale = Math.min(window.innerWidth / SCREEN.width, window.innerHeight / SCREEN.height);
    this.frame.style.setProperty('--scale', String(scale));
    const k = FORCE_FULL ? 1 : Math.min(1, scale * window.devicePixelRatio);
    // updateStyle=false: tuval CSS'te 1080×1920 kalır, yalnız iç çözünürlüğü değişir
    this.renderer.setSize(Math.round(SCREEN.width * k), Math.round(SCREEN.height * k), false);
    if (this.composer) this.buildComposer();
  }

  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
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
    this.composer?.dispose();
    this.composer = null;
    this.bloom = null;
  }
}
