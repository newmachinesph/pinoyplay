import * as T from 'three';
import type { PropLibrary, PropName } from './props';

type Placement = [name: PropName, height: number, x: number, z: number, yaw?: number];
const FACE_EAST = Math.PI / 2, FACE_WEST = -Math.PI / 2;

/** Shop row at the far end of the lane; fronts line up on z = front. */
function shopRow(props: PropLibrary, parent: T.Object3D, names: PropName[], height: number, front: number) {
    const widths = names.map(n => props.size(n).x * height), gap = .35;
    let x = -(widths.reduce((a, b) => a + b, 0) + gap * (names.length - 1)) / 2;
    names.forEach((name, i) => {
        props.place(parent, name, height, [x + widths[i] / 2, 0, front - props.size(name).z * height / 2]);
        x += widths[i] + gap;
    });
}

const shared: Placement[] = [
    ['apartment', 9.5, -13.2, -15.2], ['two-storey-house', 7.6, 13.4, -14.8],
    ['coconut-palm', 7.4, -8.2, -11.4], ['coconut-palm', 6.4, 8.3, -10.8, 2],
    ['coconut-palm', 6.8, 8.6, 8.8, 4], ['mango-tree', 6.2, -9.2, 8.6],
    ['banana-plants', 3, -8.3, -4.5], ['banana-plants', 2.7, 8.4, -1.5, 1.4],
    ['bougainvillea-planter', 1.3, -3.4, -11.6], ['bougainvillea-planter', 1.3, 3.4, -11.6],
    ['water-drums', 1.35, 8.9, -6.5, FACE_WEST],
    ['two-storey-house', 7.6, -11.6, 0.5, FACE_EAST], ['apartment', 9.5, 11.9, 1.5, FACE_WEST],
];
const court: Placement[] = [
    ['monobloc-set', 1.25, -7.6, 1.4, .4], ['fishball-cart', 2.6, 7.4, -8.8, FACE_WEST],
    ['fruit-stall', 3.6, -10.6, -6.8, FACE_EAST], ['vulcanizing', 4.2, 11, -6.3, FACE_WEST],
];
const parking: Placement[] = [
    ['waiting-shed', 3.2, -8.4, 3.4, FACE_EAST], ['fishball-cart', 2.6, 8, -8.6, FACE_WEST],
    ['fruit-stall', 3.6, -10.6, -6.8, FACE_EAST], ['karinderya', 4.6, 11, -6.3, FACE_WEST],
];

export const BARANGAY_PROPS: PropName[] = ['sari-sari-store', 'karinderya', 'panaderia', 'botika', 'vulcanizing', 'fruit-stall',
    'two-storey-house', 'apartment', 'coconut-palm', 'mango-tree', 'banana-plants', 'bougainvillea-planter', 'water-drums',
    'monobloc-set', 'fishball-cart', 'waiting-shed'];

/** Generated buildings, trees and street props around the shared neighbourhood lane. */
export function dressBarangay(props: PropLibrary, parent: T.Object3D, kind: 'parking' | 'court') {
    const g = new T.Group();
    g.name = 'barangay-props';
    parent.add(g);
    shopRow(props, g, kind === 'court' ? ['karinderya', 'sari-sari-store', 'panaderia'] : ['botika', 'sari-sari-store', 'vulcanizing'], 5, -12.5);
    for (const [name, height, x, z, yaw = 0] of [...shared, ...(kind === 'court' ? court : parking)])
        props.place(g, name, height, [x, 0, z], yaw);
    return g;
}
