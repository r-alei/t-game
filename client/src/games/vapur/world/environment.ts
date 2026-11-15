/**
 * İstanbul sabahı: açık mavi gök, alçak sıcak güneş, pus, birkaç bulut ve Boğaz'ın
 * yeşil-mavi suyu. Vapur yerinde durur; deniz dokusu akarak ilerleme hissi verir.
 * Gündüz seçildi: telefonda okunurluk gece sahnesinden çok daha iyi.
 */
import * as THREE from 'three';
import { glowTexture, waveNormalTexture } from './textures.ts';

export class Environment {
  readonly group = new THREE.Group();
  private readonly normal: THREE.CanvasTexture;
  private readonly clouds: THREE.Sprite[] = [];
  /** Güneş: solda ve kameranın arkasında, alçak (sabah). Önden aydınlatma yüzleri ve
   *  isimleri okunur kılar; gölge yana düşer, kameraya doğru uzamaz. */
  readonly sunDir = new THREE.Vector3(-0.75, 0.5, 0.45).normalize();
  readonly sun: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    scene.fog = new THREE.FogExp2('#d6e4f0', 0.0015);
    scene.background = new THREE.Color('#a9cdeb');

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#3f8fd8') },
          horizon: { value: new THREE.Color('#e9eef2') },
          sunColor: { value: new THREE.Color('#ffd9a0') },
          sunDir: { value: this.sunDir },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 c = mix(horizon, top, pow(smoothstep(0.0, 0.75, h), 0.8));
            // Güneş tarafında sıcak sabah ışıması
            float s = max(dot(normalize(vDir), sunDir), 0.0);
            c = mix(c, sunColor, pow(s, 6.0) * 0.55 * (1.0 - h * 0.6));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    sky.renderOrder = -10;
    this.group.add(sky);

    // Güneş diski
    const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff3d6', fog: false, depthWrite: false }));
    sunDisc.position.copy(this.sunDir).multiplyScalar(700);
    sunDisc.scale.setScalar(110);
    this.group.add(sunDisc);

    // Bulutlar: yumuşak, yavaş kayan
    const cloudTex = glowTexture();
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: '#ffffff', fog: false, transparent: true, opacity: 0.55, depthWrite: false }));
      c.position.set((Math.random() - 0.5) * 900, 120 + Math.random() * 120, -200 - Math.random() * 500);
      c.scale.set(160 + Math.random() * 160, 40 + Math.random() * 30, 1);
      this.clouds.push(c);
      this.group.add(c);
    }

    // Işıklar: sıcak güneş + gökyüzü dolgusu
    this.sun = new THREE.DirectionalLight('#fff0dc', 2.6);
    this.sun.position.copy(this.sunDir).multiplyScalar(60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); // gölge yalnız vapurun çevresinde; 1024 yeterli
    const sc = this.sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 160;
    // Gölge lekelenmesini (shadow acne) önler: düz yüzeylerde çizgili titreme olmaz
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.group.add(this.sun, this.sun.target);
    this.group.add(new THREE.HemisphereLight('#cfe6ff', '#6a7a60', 1.3));

    // Deniz: Boğaz'ın koyu yeşil-mavisi
    this.normal = waveNormalTexture();
    this.normal.repeat.set(70, 70);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshStandardMaterial({
        color: '#1f5a73',
        roughness: 0.28,
        metalness: 0.08,
        normalMap: this.normal,
        normalScale: new THREE.Vector2(0.45, 0.45),
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    this.group.add(water);

    scene.add(this.group);
  }

  update(dt: number, speed: number): void {
    this.normal.offset.y += (speed * dt) / 40;
    this.normal.offset.x += dt * 0.004;
    for (const c of this.clouds) {
      c.position.x += dt * 1.5;
      if (c.position.x > 500) c.position.x = -500;
    }
  }
}
