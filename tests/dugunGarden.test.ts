import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { gardenModels } from '../client/src/games/dugun/garden.ts';

/** GLB konum accessor sınırlarından, düğüm dönüşümleri dahil gerçek model kutusu. */
function modelBounds(bytes: Buffer): THREE.Box3 {
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim());
  const bounds = new THREE.Box3();
  function visit(index: number, parent: THREE.Matrix4): void {
    const node = gltf.nodes[index];
    const local = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
      new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]),
      new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
      new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]));
    const matrix = parent.clone().multiply(local);
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      bounds.union(new THREE.Box3(new THREE.Vector3().fromArray(accessor.min), new THREE.Vector3().fromArray(accessor.max)).applyMatrix4(matrix));
    }
    for (const child of node.children ?? []) visit(child, matrix);
  }
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, new THREE.Matrix4());
  return bounds;
}

it('paketlenen modeller 8 MB altında; dekor pist, araba şeridi ve ön görüş koridorunun dışında', () => {
  let total = 0;
  for (const model of gardenModels()) {
    const bytes = readFileSync(fileURLToPath(new URL(`../client/public/models/dugun/${model.name}.glb`, import.meta.url)));
    total += bytes.length;
    const box = modelBounds(bytes), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const scale = model.size / (model.axis === 'height' ? size.y : Math.max(size.x, size.z));
    const normalized = box.clone().translate(new THREE.Vector3(-center.x, -box.min.y, -center.z));
    normalized.min.multiplyScalar(scale); normalized.max.multiplyScalar(scale);
    for (const place of model.places) {
      const placement = new THREE.Matrix4().compose(new THREE.Vector3(place.x, place.y ?? 0.01, place.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), place.yaw ?? 0),
        new THREE.Vector3().setScalar(place.scale ?? 1));
      const placed = normalized.clone().applyMatrix4(placement);
      const closest = placed.clampPoint(new THREE.Vector3(), new THREE.Vector3());
      expect(Math.hypot(closest.x, closest.z), model.name).toBeGreaterThan(10.5);
      expect(placed.max.z < -10.75 || placed.min.z > -7.65, `${model.name}: araba şeridi`).toBe(true);
      expect(placed.max.z < 0 || placed.min.x > 11 || placed.max.x < -11, `${model.name}: ön görüş`).toBe(true);
    }
  }
  expect(total).toBeLessThan(8_000_000);
});
