import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SceneKit, skyTexture } from './scene-kit';
import { PropLibrary } from './props';
import { Bursts } from './bursts';
export class ThreeWorld {
    renderer: T.WebGLRenderer;
    scene = new T.Scene();
    camera: T.PerspectiveCamera | T.OrthographicCamera;
    ready = Promise.resolve();
    protected kit = new SceneKit();
    protected props = new PropLibrary();
    protected bursts = new Bursts();
    private observer: ResizeObserver;
    private environment: T.WebGLRenderTarget;
    private viewWidth = 18;
    constructor(private host: HTMLElement, kind: 'parking' | 'tumbang' | 'sea' | 'basketball') {
        this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = T.PCFSoftShadowMap;
        this.renderer.toneMapping = T.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = .92;
        host.append(this.renderer.domElement);
        const sea = kind === 'sea';
        this.scene.background = skyTexture(sea ? '#4fa9d6' : '#6fb2dc', sea ? '#9ddde7' : '#b8dbe8');
        this.scene.fog = new T.Fog(sea ? 0x9ddde7 : 0xb8dbe8, sea ? 60 : 55, sea ? 125 : 100);
        const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(this.renderer);
        this.environment = pmrem.fromScene(room, .04);
        room.dispose();
        pmrem.dispose();
        this.scene.environment = this.environment.texture;
        this.scene.environmentIntensity = .35;
        this.scene.add(new T.HemisphereLight(0xd5f2ff, 0x978263, 1.35));
        const sun = new T.DirectionalLight(0xffe8bb, 2);
        sun.position.set(-10, 18, 8);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -15;
        sun.shadow.camera.right = 15;
        sun.shadow.camera.top = 16;
        sun.shadow.camera.bottom = -16;
        sun.shadow.normalBias = .035;
        sun.shadow.bias = -.0004;
        this.scene.add(sun, this.bursts);
        if (kind === 'parking' || kind === 'tumbang') {
            this.viewWidth = kind === 'parking' ? 15.5 : 13.5;
            this.camera = new T.OrthographicCamera(-9, 9, 16, -16, .1, 100);
            this.camera.position.set(kind === 'parking' ? 2 : 0, kind === 'parking' ? 25 : 19, 23);
            this.camera.lookAt(0, 0, -1);
        }
        else {
            this.camera = new T.PerspectiveCamera(sea ? 48 : 46, 1, .1, 140);
            this.camera.position.set(0, sea ? 10 : 8, sea ? 18 : 17);
            this.camera.lookAt(0, sea ? 0 : 2, sea ? -4 : -1);
        }
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(host);
        this.resize();
    }
    private resize() {
        const w = this.host.clientWidth, h = this.host.clientHeight;
        if (!w || !h)
            return;
        this.renderer.setSize(w, h);
        if (this.camera instanceof T.PerspectiveCamera)
            this.camera.aspect = w / h;
        else {
            const height = Math.max(25, this.viewWidth / (w / h));
            this.camera.top = height / 2;
            this.camera.bottom = -height / 2;
            this.camera.left = -height * w / h / 2;
            this.camera.right = height * w / h / 2;
        }
        this.camera.updateProjectionMatrix();
    }
    protected disposeTree(root: T.Object3D) {
        const shared = new Set(this.kit.materials.values());
        root.traverse(o => {
            if (!(o instanceof T.Mesh) || o.userData.sharedProp)
                return;
            o.geometry.dispose();
            for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
                if (shared.has(material))
                    continue;
                for (const value of Object.values(material))
                    if (value instanceof T.Texture)
                        value.dispose();
                material.dispose();
            }
        });
    }
    dispose() {
        this.observer.disconnect();
        const materials = new Set<T.Material>(), textures = new Set<T.Texture>();
        this.scene.traverse(o => {
            if (!(o instanceof T.Mesh))
                return;
            if (o instanceof T.InstancedMesh)
                o.dispose();
            o.geometry.dispose();
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
                materials.add(m);
                for (const value of Object.values(m))
                    if (value instanceof T.Texture)
                        textures.add(value);
            }
        });
        textures.forEach(t => t.dispose());
        materials.forEach(m => m.dispose());
        this.props.dispose();
        (this.scene.background as T.Texture).dispose();
        this.environment.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}
