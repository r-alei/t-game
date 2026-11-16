import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Placement = { x: number; z: number; y?: number; yaw?: number; scale?: number };
type Model = { name: string; size: number; axis: 'height' | 'width'; shadows?: boolean; places: Placement[] };

/** Tüm dekor pistin dışında; z=-9.2 araba şeridi ve ön (+z) görüş koridoru açık. */
export function gardenModels(): Model[] {
  const tables = [{ x: -7, z: -18 }, { x: -13, z: -18 }, { x: -16, z: -3 }, { x: 16, z: -3 }];
  const chairs: Placement[] = [], plates: Placement[] = [], bread: Placement[] = [], apples: Placement[] = [];
  for (const t of tables) {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      chairs.push({ x: t.x + Math.sin(a) * 1.65, z: t.z + Math.cos(a) * 1.65, yaw: a + Math.PI });
      plates.push({ x: t.x + Math.sin(a) * 0.7, z: t.z + Math.cos(a) * 0.7, y: 0.96 });
    }
    bread.push({ ...t, y: 0.96, yaw: 0.4 });
    apples.push({ x: t.x + 0.4, z: t.z, y: 0.96 });
  }
  const stones: Placement[] = [];
  for (let i = 0; i < 23; i++) {
    const a = Math.PI * 0.55 + i / 22 * Math.PI * 0.9;
    const x = Math.sin(a) * 12.7, z = Math.cos(a) * 12.7;
    if (Math.abs(z + 9.2) > 2.4) stones.push({ x, z, yaw: i * 0.7 });
  }
  const borders: Placement[] = [];
  for (const side of [-1, 1]) for (const z of [-23, -19, -15, -4, 0, 4]) borders.push({ x: side * 20, z, yaw: z });
  return [
    { name: 'tree', size: 6, axis: 'height', shadows: true, places: [
      { x: -20, z: -21 }, { x: 20, z: -20 }, { x: -15, z: -26 }, { x: -7, z: -27 },
      { x: 3, z: -27 }, { x: 14, z: -26 }, { x: -22, z: -1 }, { x: 22, z: -1 },
    ] },
    { name: 'bush-flowers', size: 1.1, axis: 'height', places: borders },
    { name: 'flowers', size: 0.55, axis: 'height', places: borders.map((p) => ({ ...p, x: p.x * 0.91, z: p.z + 1.3 })) },
    { name: 'grass', size: 0.25, axis: 'height', places: borders.flatMap((p) => [
      { ...p, x: p.x * 0.7, z: p.z + 0.5 }, { ...p, x: p.x * 0.8, z: p.z - 0.7 },
    ]) },
    { name: 'path-stone', size: 0.95, axis: 'width', places: stones },
    { name: 'table', size: 0.95, axis: 'height', shadows: true, places: tables },
    { name: 'chair', size: 1.2, axis: 'height', shadows: true, places: chairs },
    { name: 'plate', size: 0.42, axis: 'width', places: plates },
    { name: 'bread', size: 0.62, axis: 'width', places: bread },
    { name: 'apple', size: 0.22, axis: 'height', places: apples },
    { name: 'lamp', size: 2.8, axis: 'height', places: [
      { x: -11, z: -21 }, { x: 10, z: -20 }, { x: -17, z: 2 }, { x: 17, z: 2 },
    ] },
  ];
}

/** Model başına tek yükleme; alt örgüler ve malzemeler örnekler arasında paylaşılır. */
export class Garden {
  readonly group = new THREE.Group();
  private disposed = false;
  private sources: THREE.Object3D[] = [];

  constructor(parent: THREE.Group) {
    parent.add(this.group);
    const loader = new GLTFLoader();
    for (const model of gardenModels()) {
      void loader.loadAsync(`/models/dugun/${model.name}.glb`).then(({ scene }) => {
        if (this.disposed) { this.release(scene); return; }
        this.sources.push(scene);
        this.instance(scene, model);
      }).catch((error: unknown) => console.warn(`Bahçe modeli yüklenemedi: ${model.name}`, error));
    }
  }

  private instance(source: THREE.Object3D, model: Model): void {
    source.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = model.size / Math.max(0.001, model.axis === 'height' ? size.y : Math.max(size.x, size.z));
    const normalization = new THREE.Matrix4().makeScale(scale, scale, scale)
      .multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
    const placement = new THREE.Object3D();
    source.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, model.places.length);
      mesh.castShadow = model.shadows ?? false;
      mesh.receiveShadow = true;
      mesh.name = `bahçe:${model.name}`;
      for (let i = 0; i < model.places.length; i++) {
        const p = model.places[i];
        placement.position.set(p.x, p.y ?? 0.01, p.z);
        placement.rotation.set(0, p.yaw ?? 0, 0);
        placement.scale.setScalar(p.scale ?? 1);
        placement.updateMatrix();
        mesh.setMatrixAt(i, placement.matrix.clone().multiply(normalization).multiply(part.matrixWorld));
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    });
  }

  private release(root: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    root.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      geometries.add(part.geometry);
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }

  dispose(): void {
    this.disposed = true;
    for (const source of this.sources) this.release(source);
    this.sources = [];
    this.group.traverse((o) => { if (o instanceof THREE.InstancedMesh) o.dispose(); });
    this.group.clear();
    this.group.removeFromParent();
  }
}
