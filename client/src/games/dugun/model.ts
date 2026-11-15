/**
 * 3B karakter modelleri (GLB, iskeletli). Bir model bir kez yüklenir; her figür kendi kopyasını
 * (SkeletonUtils.clone) ve kendi animasyon karıştırıcısını alır.
 *
 * Model yüklenene kadar ya da yüklenemezse figürler eski basit gövdeyle görünmeye devam eder.
 * Klip adları Blender'da sabitlendi: Halay, Shimmy, Idle, Walk, Wave, Fall, GetUp, Jump, Cheer.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export type ModelName = 'gelin';

const URLS: Record<ModelName, string> = {
  gelin: new URL('./assets/gelin.glb', import.meta.url).href,
};

const cache = new Map<ModelName, Promise<GLTF | null>>();
const loader = new GLTFLoader();

function load(name: ModelName): Promise<GLTF | null> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(URLS[name]).catch((err) => {
      console.warn(`[dugun] ${name}.glb yüklenemedi, basit figür kullanılıyor`, err);
      return null;
    });
    cache.set(name, p);
  }
  return p;
}

/** Halay klibinin kaydedildiği tempo: oyun bunu davulun temposuna göre hızlandırır */
export const HALAY_CLIP_BPM = 120;
/** Halay klibi kaç vuruş */
const HALAY_BEATS = 4;

export type Pose = 'halay' | 'idle' | 'walk' | 'wave' | 'fall' | 'jump' | 'cheer';

const CLIP_FOR: Record<Pose, string[]> = {
  halay: ['Halay'],
  idle: ['Idle'],
  walk: ['Walk'],
  wave: ['Wave'],
  fall: ['Fall'],
  jump: ['Jump'],
  cheer: ['Cheer', 'Clap', 'Wave'],
};

/** Bir figürün 3B modeli: yükleme, animasyon geçişleri ve halayın davula kilitlenmesi */
export class CharacterModel {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private pose: Pose = 'idle';
  private head: THREE.Bone | null = null;
  ready = false;

  constructor(name: ModelName, private readonly headScale = 1.25, onReady?: () => void) {
    void load(name).then((gltf) => {
      if (!gltf) return;
      const scene = cloneSkinned(gltf.scene);
      scene.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          // Kemikler animasyonda sınır kutusunun dışına çıkabilir: kenarda kaybolmasın
          mesh.frustumCulled = false;
        }
        if ((o as THREE.Bone).isBone && !this.head && /^head$/i.test(o.name.replace(/[_.]/g, ''))) this.head = o as THREE.Bone;
      });
      // Model 1,75 m; sahnedeki figürler ~2 m boyunda ölçülmüş (kamera, etiket yükseklikleri)
      scene.scale.setScalar(1.15);
      this.root.add(scene);
      this.mixer = new THREE.AnimationMixer(scene);
      for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
      this.ready = true;
      this.play(this.pose, 0);
      onReady?.();
    });
  }

  /** Animasyonu değiştirir (aynısıysa dokunmaz) */
  play(pose: Pose, fade = 0.25): void {
    this.pose = pose;
    if (!this.mixer) return;
    const action = CLIP_FOR[pose].map((n) => this.actions.get(n)).find(Boolean) ?? this.actions.get('Idle');
    if (!action || action === this.current) return;
    const once = pose === 'fall' || pose === 'jump';
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = once;
    // Halayın zamanını davul belirler (syncHalay); diğer klipler kendi hızında akar
    action.timeScale = pose === 'halay' ? 0 : 1;
    action.play();
    if (this.current) action.crossFadeFrom(this.current, fade, false);
    this.current = action;
  }

  /**
   * Halay klibini davulun vuruşuna kilitler: klibin zamanı doğrudan vuruş sayısından hesaplanır,
   * böylece 40 halaycı aynı adıma basar ve tempo değişince sapma olmaz.
   */
  syncHalay(beatCount: number, phaseOffset = 0): void {
    if (this.pose !== 'halay' || !this.current) return;
    const clip = this.current.getClip();
    const beats = ((beatCount + phaseOffset) % HALAY_BEATS + HALAY_BEATS) % HALAY_BEATS;
    this.current.time = (beats / HALAY_BEATS) * clip.duration;
  }

  update(dt: number): void {
    if (!this.mixer) return;
    // Halay klibinin zamanı syncHalay ile kuruluyor; karıştırıcı yalnız geçişleri ilerletir
    this.mixer.update(dt);
    // Stilize görünüm: kafa biraz büyük (animasyon kemik ölçeğine dokunmuyor)
    if (this.head) this.head.scale.setScalar(this.headScale);
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.root.removeFromParent();
    // Geometri ve dokular önbellekteki modelle ortak: burada serbest bırakılmaz
  }
}

/** Ön yükleme: oyun başlarken modeli indirmeye başlar */
export function preload(name: ModelName): void {
  void load(name);
}
