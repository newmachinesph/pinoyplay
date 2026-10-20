import { GameModel, type ControlScheme } from '../../core/game-model';
export const ingredients = [
    { name: 'Beans', short: 'BEANS', color: 0x9e3c55 },
    { name: 'Jelly', short: 'JELLY', color: 0x48b988 },
    { name: 'Shaved ice', short: 'ICE', color: 0xd9f5ff },
    { name: 'Milk', short: 'MILK', color: 0xffedc1 },
    { name: 'Ube', short: 'UBE', color: 0x9660c0 },
    { name: 'Leche flan', short: 'FLAN', color: 0xf7ba46 },
];
export class HaloModel extends GameModel {
    recipe: number[] = [];
    glass: number[] = [];
    remaining = 25;
    served = 0;
    combo = 0;
    customer = 0;
    constructor() { super('halo-halo-shop'); }
    override get controls(): ControlScheme { return 'recipe'; }
    override get actionLabel() { return 'SERVE'; }
    override get hudLabel() { return 'SERVED'; }
    override get hudValue() { return String(this.served).padStart(2, '0'); }
    override get secondary() { return this.score; }
    get limit() { return Math.max(10, [32, 25, 19][this.mode] - this.stage * .7); }
    override get progress() { return this.remaining / this.limit; }
    override get stageLabel() { return `${Math.ceil(this.remaining)}s · ORDER ${this.served + 1}`; }
    override get objective() { return 'Follow the order left to right · serve when ready'; }
    protected reset() { this.served = 0; this.combo = 0; this.customer = 0; this.order(); }
    private order() {
        // The foundational order remains authentic: sweets, ice, milk, toppings.
        const sweets = this.random() < .5 ? [0, 1] : [1, 0];
        this.recipe = this.stage < 2 && this.mode === 0 ? [sweets[0], 2, 3, 4] : [...sweets, 2, 3, ...(this.stage >= 3 || this.mode === 2 ? [4, 5] : [this.random() < .5 ? 4 : 5])];
        this.glass = [];
        this.remaining = this.limit;
        this.customer = Math.floor(this.random() * 4);
    }
    override choose(index: number) { if (this.phase === 'running' && index >= 0 && index < ingredients.length && this.glass.length < 6)
        this.glass.push(index); }
    override undo() { if (this.phase === 'running')
        this.glass.pop(); }
    override action(pressed: boolean) {
        if (!pressed || this.phase !== 'running')
            return;
        if (this.glass.length === this.recipe.length && this.glass.every((item, i) => item === this.recipe[i])) {
            this.combo++;
            this.served++;
            this.award(100 + Math.ceil(this.remaining) * 3 + Math.min(100, this.combo * 10), 'Salamat! One happy customer.');
            if (this.served % 3 === 0)
                this.nextStage('Merienda rush! More toppings, less time.');
            this.order();
        }
        else {
            this.lose('Check the layers. The customer asked for a different mix.');
            this.combo = 0;
            this.order();
        }
    }
    protected update(dt: number) {
        this.remaining -= dt;
        if (this.remaining <= 0) {
            this.lose('Customer left. Keep the next order moving!');
            this.combo = 0;
            this.order();
        }
    }
}
