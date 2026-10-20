import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/** Generated TRELLIS.2 props in public/models (see scripts/optimize-props.mjs and docs/ASSETS.md). */
export type PropName =
    | 'sari-sari-store' | 'karinderya' | 'panaderia' | 'two-storey-house' | 'apartment' | 'vulcanizing' | 'botika' | 'fruit-stall'
    | 'coconut-palm' | 'mango-tree' | 'banana-plants' | 'bougainvillea-planter'
    | 'karst-islet' | 'sea-stacks' | 'palm-islet' | 'nipa-hut-stilts' | 'bangka'
    | 'fishball-cart' | 'monobloc-set' | 'water-drums' | 'waiting-shed';

type Sign = { text: string; x: number; y: number; w: number; h: number; bg: string; fg: string };
/**
 * Generated textures turn lettering into pseudo-glyphs, so real signs are laid over the boards.
 * Board centre and size are in normalized model units (height 1), measured from orthographic front renders.
 */
const SIGNS: Partial<Record<PropName, Sign>> = {
    'sari-sari-store': { text: 'SARI-SARI STORE', x: .06, y: .77, w: .7, h: .11, bg: '#f3e6c4', fg: '#8a2a1e' },
    'karinderya': { text: 'KARINDERYA', x: .02, y: .66, w: .87, h: .15, bg: '#f5ead2', fg: '#b4241c' },
    'panaderia': { text: 'PANADERIA', x: .07, y: .85, w: .89, h: .17, bg: '#f3e3c8', fg: '#6b2a1a' },
    'botika': { text: '✚ BOTIKA', x: 0, y: .8, w: .9, h: .25, bg: '#fbfbf6', fg: '#1d7a3e' },
};

function signTexture(sign: Sign) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = Math.max(64, Math.round(512 * sign.h / sign.w));
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = sign.bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = sign.fg;
    ctx.lineWidth = Math.max(4, c.height * .07);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, c.width - ctx.lineWidth * 2, c.height - ctx.lineWidth * 2);
    ctx.fillStyle = sign.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(c.height * .62)}px "Barlow Condensed", sans-serif`;
    ctx.fillText(sign.text, c.width / 2, c.height * .54, c.width * .86);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

/**
 * Each model is normalized: origin at its bottom centre, front toward +Z, height 1.
 * Clones share geometry and materials, so a world loads its own library and disposes it once.
 */
export class PropLibrary {
    private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    private sources = new Map<PropName, T.Object3D>();
    private disposed = false;

    async load(names: PropName[]): Promise<void> {
        await Promise.all(names.map(async name => {
            try {
                const gltf = await this.loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
                gltf.scene.traverse(o => {
                    if (!(o instanceof T.Mesh))
                        return;
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.userData.sharedProp = true;
                });
                if (this.disposed)
                    return;
                const sign = SIGNS[name];
                if (sign)
                    this.addSign(gltf.scene, sign);
                this.sources.set(name, gltf.scene);
            }
            catch (error) {
                // A missing prop leaves an empty spot; the game itself keeps working.
                console.warn(`Prop ${name} unavailable`, error);
            }
        }));
    }

    private addSign(model: T.Object3D, sign: Sign) {
        model.updateMatrixWorld(true);
        // Sit just proud of the board: cast from the front onto the model to find its surface.
        const hit = new T.Raycaster(new T.Vector3(sign.x, sign.y, 5), new T.Vector3(0, 0, -1)).intersectObject(model, true)[0];
        const z = (hit?.point.z ?? new T.Box3().setFromObject(model).max.z) + .006;
        const board = new T.Mesh(new T.PlaneGeometry(sign.w, sign.h), new T.MeshStandardMaterial({ map: signTexture(sign), roughness: .75 }));
        board.position.set(sign.x, sign.y, z);
        board.receiveShadow = true;
        board.userData.sharedProp = true;
        model.add(board);
    }

    has(name: PropName): boolean { return this.sources.has(name); }

    /** Footprint per unit of height: x = width, z = depth (front to back). */
    size(name: PropName): T.Vector3 {
        const source = this.sources.get(name);
        return source ? new T.Box3().setFromObject(source).getSize(new T.Vector3()) : new T.Vector3(1, 1, 1);
    }

    /** Places a copy scaled to `height` world units, turned by `yaw` radians. */
    place(parent: T.Object3D, name: PropName, height: number, at: readonly number[], yaw = 0): T.Object3D | undefined {
        const source = this.sources.get(name);
        if (!source)
            return undefined;
        const prop = source.clone();
        prop.scale.setScalar(height);
        prop.position.set(at[0], at[1], at[2]);
        prop.rotation.y = yaw;
        parent.add(prop);
        return prop;
    }

    dispose(): void {
        this.disposed = true;
        const materials = new Set<T.Material>();
        for (const source of this.sources.values())
            source.traverse(o => {
                if (!(o instanceof T.Mesh))
                    return;
                o.geometry.dispose();
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
            });
        for (const m of materials) {
            for (const value of Object.values(m))
                if (value instanceof T.Texture)
                    value.dispose();
            m.dispose();
        }
        this.sources.clear();
    }
}
