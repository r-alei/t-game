# Düğün bahçesi modelleri

Üretici: **Quaternius** — https://quaternius.com

Yalnız kullanılan modeller paketlenmiştir. `scripts/convert-dugun-models.py`, Blender 5.2 arka planında kaynak glTF/FBX dosyalarını GLB'ye dönüştürür. En büyük doku kenarı 512 piksele indirilmiştir. Geometri ve temel renkler korunur; animasyon/kamera/ışık dışa aktarılmaz.

| GLB | Paket ve kaynak model |
|---|---|
| tree.glb | Stylized Nature MegaKit Standard, glTF/CommonTree_1.gltf |
| bush-flowers.glb | Stylized Nature MegaKit Standard, glTF/Bush_Common_Flowers.gltf |
| flowers.glb | Stylized Nature MegaKit Standard, glTF/Flower_3_Group.gltf |
| grass.glb | Stylized Nature MegaKit Standard, glTF/Grass_Common_Short.gltf |
| path-stone.glb | Stylized Nature MegaKit Standard, glTF/RockPath_Round_Small_1.gltf |
| table.glb | Ultimate House Interior Pack – June 2020, FBX/Table_RoundLarge.fbx |
| chair.glb | Aynı paket, FBX/Chair_1.fbx |
| plate.glb | Aynı paket, FBX/Plate_1.fbx |
| lamp.glb | Aynı paket, FBX/Light_Stand1.fbx |
| bread.glb | Ultimate Food Pack – Oct 2019, FBX/Bread.fbx |
| apple.glb | Aynı paket, FBX/Apple.fbx |

Lisans: **CC0 1.0 Universal / Public Domain Dedication** — https://creativecommons.org/publicdomain/zero/1.0/

Kaynak lisans dosyaları: `asset-src/nature/License_Standard.txt`, `asset-src/interior/Ultimate House Interior Pack - June 2020/License.txt`, `asset-src/food/Ultimate Food Pack - Oct 2019/License.txt`. Nature paketindeki “Standard” ücretsiz sürümü belirtir; içindeki lisans metni de CC0 1.0'dır. Üç kaynak lisansının kopyası bu dizindedir.

11 GLB toplamı: **2.584.768 bayt (2,47 MiB / 2,58 MB)**. Modeller GLTFLoader ile bağımsız asenkron yüklenir; aynı modelin alt örgüleri InstancedMesh ile çoğaltılır. Pist yarıçapı 10,5; yeni dekorlar pist ve araba şeridinin dışındadır. Ön görüş koridorunda yüksek dekor bulunmaz.
