"""Yalnız sahnede kullanılan kaynakları Blender arka planında GLB'ye dönüştürür."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[1]
output = root / 'client/public/models/dugun'
output.mkdir(parents=True, exist_ok=True)
sources = {
    'tree': 'nature/glTF/CommonTree_1.gltf',
    'bush-flowers': 'nature/glTF/Bush_Common_Flowers.gltf',
    'flowers': 'nature/glTF/Flower_3_Group.gltf',
    'grass': 'nature/glTF/Grass_Common_Short.gltf',
    'path-stone': 'nature/glTF/RockPath_Round_Small_1.gltf',
    'table': 'interior/Ultimate House Interior Pack - June 2020/FBX/Table_RoundLarge.fbx',
    'chair': 'interior/Ultimate House Interior Pack - June 2020/FBX/Chair_1.fbx',
    'plate': 'interior/Ultimate House Interior Pack - June 2020/FBX/Plate_1.fbx',
    'lamp': 'interior/Ultimate House Interior Pack - June 2020/FBX/Light_Stand1.fbx',
    'bread': 'food/Ultimate Food Pack - Oct 2019/FBX/Bread.fbx',
    'apple': 'food/Ultimate Food Pack - Oct 2019/FBX/Apple.fbx',
}
for name, relative in sources.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = root / 'asset-src' / relative
    if source.suffix == '.gltf':
        bpy.ops.import_scene.gltf(filepath=str(source))
    else:
        bpy.ops.import_scene.fbx(filepath=str(source))
    for image in bpy.data.images:
        if image.size[0] > 512 or image.size[1] > 512:
            ratio = 512 / max(image.size)
            image.scale(round(image.size[0] * ratio), round(image.size[1] * ratio))
    bpy.ops.export_scene.gltf(filepath=str(output / (name + '.glb')), export_format='GLB',
                              export_animations=False, export_cameras=False, export_lights=False)
    print('DUGUN_MODEL', name, (output / (name + '.glb')).stat().st_size, flush=True)
