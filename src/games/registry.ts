import type { GameId } from '../catalog';
import { GameModel } from '../core/game-model';
import { RushModel } from './jeepney-rush/model';
import { PatinteroModel } from './patintero/model';
import { ParkingModel } from './tricycle-parking/model';
import { BoatModel } from './island-boat-racing/model';
import { TumbangModel } from './tumbang-preso/model';
import { BasketballModel } from './basketball-sa-kanto/model';
import { PikoModel } from './piko-challenge/model';
import { HaloModel } from './halo-halo-shop/model';
import { CoconutModel } from './coconut-catcher/model';
import { VolcanoModel } from './volcano-escape/model';
export type PlayModel = RushModel | PatinteroModel | GameModel;
export interface PlayWorld {
    dispose(): void;
    ready?: Promise<void>;
    render?(time: number): void;
}
export function createModel(id: GameId): PlayModel {
    const constructors = {
        'jeepney-rush': RushModel, patintero: PatinteroModel,
        'tricycle-parking': ParkingModel, 'island-boat-racing': BoatModel,
        'tumbang-preso': TumbangModel, 'basketball-sa-kanto': BasketballModel,
        'piko-challenge': PikoModel, 'halo-halo-shop': HaloModel,
        'coconut-catcher': CoconutModel, 'volcano-escape': VolcanoModel,
    };
    const model = new constructors[id]();
    if (model instanceof GameModel) {
        model.start();
        model.phase = 'ready';
    }
    return model;
}
/** Every scene is loaded from its own game folder. Gallery visits start no engine. */
export async function createWorld(id: GameId, host: HTMLElement, model: PlayModel, tick: (dt: number) => void): Promise<PlayWorld> {
    const wrap3D = <M>(world: {
        dispose(): void;
        ready?: Promise<void>;
        render(m: M, time: number): void;
    }, m: M): PlayWorld => ({
        dispose: () => world.dispose(), ready: world.ready, render: time => world.render(m, time),
    });
    switch (id) {
        case 'jeepney-rush': return wrap3D(new (await import('./jeepney-rush/world')).RushWorld(host), model as RushModel);
        case 'patintero': return new (await import('./patintero/world')).PatinteroWorld(host, model as PatinteroModel, tick);
        case 'tricycle-parking': return wrap3D(new (await import('./tricycle-parking/world')).ParkingWorld(host), model as ParkingModel);
        case 'island-boat-racing': return wrap3D(new (await import('./island-boat-racing/world')).BoatWorld(host), model as BoatModel);
        case 'tumbang-preso': return wrap3D(new (await import('./tumbang-preso/world')).TumbangWorld(host), model as TumbangModel);
        case 'basketball-sa-kanto': return wrap3D(new (await import('./basketball-sa-kanto/world')).BasketballWorld(host), model as BasketballModel);
        case 'piko-challenge': return new (await import('./piko-challenge/world')).PikoWorld(host, model as PikoModel, tick);
        case 'halo-halo-shop': return new (await import('./halo-halo-shop/world')).HaloWorld(host, model as HaloModel, tick);
        case 'coconut-catcher': return new (await import('./coconut-catcher/world')).CoconutWorld(host, model as CoconutModel, tick);
        case 'volcano-escape': return new (await import('./volcano-escape/world')).VolcanoWorld(host, model as VolcanoModel, tick);
    }
}
