import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import './player.css';
import { registerSW } from 'virtual:pwa-register';
import { GameAudio } from './core/audio';
import { difficulties, difficultyLabel, type Difficulty } from './core/difficulty';
import { PinoyPlaySDK, type GameId } from './sdk';
import { RushModel, CROSSING_SECONDS } from './games/jeepney-rush/model';
import { PatinteroModel } from './games/patintero/model';
import { catalog, gameById, isGameId, coverUrl, logoUrl } from './catalog';
import { Gallery } from './gallery';
import { GameModel } from './core/game-model';
import { createModel, createWorld, type PlayModel, type PlayWorld } from './games/registry';
import { PikoModel } from './games/piko-challenge/model';
import { HaloModel, ingredients } from './games/halo-halo-shop/model';
import { BasketballModel } from './games/basketball-sa-kanto/model';
import { TumbangModel } from './games/tumbang-preso/model';
import { ParkingModel } from './games/tricycle-parking/model';
import { VolcanoModel } from './games/volcano-escape/model';
const icons = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    sound: '<path d="m11 5-5 4H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="m11 5-5 4H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 5 4m7-7h4v3a4 4 0 0 1-5 4m-3 1v5m-4 3h8m-6-3h4"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v1"/>',
    heart: '<path d="M12 21 3.5 12.5A5.5 5.5 0 0 1 12 5.6a5.5 5.5 0 0 1 8.5 6.9Z"/>',
    crossing: '<circle cx="14" cy="4.5" r="2" fill="currentColor" stroke="none"/><path d="m8 11 3-3 4 1 3 3m-7-4-1 6 4 2 2 4m-6-6-3 6M4 22h16"/>',
};
function icon(name: keyof typeof icons) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`; }
const sdk = new PinoyPlaySDK({
    getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
});
const audio = new GameAudio();
audio.enabled = sdk.sound;
let selected: GameId = isGameId(location.hash.slice(1)) ? location.hash.slice(1) as GameId : 'jeepney-rush';
let gallery: Gallery;
let model: PlayModel;
let world: PlayWorld | undefined;
let frame = 0, lastTime = 0, renderTime = 0, loadToken = 0;
let savedRun = false, previousBest = 0;
let displayedLives = -1;
let lastBallImpact = -10;
let deferredInstall: (Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: string;
    }>;
}) | undefined;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <aside class="sidebar">
    <a class="player-brand" href="#" aria-label="PinoyPlay home"><img src="${import.meta.env.BASE_URL}brand/pinoyplay.webp" alt="PinoyPlay" width="225"></a>
    <button class="text-button back-home sidebar-back">← Back to all games</button>
    <img id="sidebar-cover" class="sidebar-cover" alt="">
    <div class="sidebar-game-info"><p class="eyebrow" id="sidebar-tag"></p><h1 id="sidebar-title"></h1><p id="sidebar-description"></p><ol id="sidebar-instructions"></ol></div>
    <div class="sidebar-bottom"><button class="text-button profile-open">${icon('person')}<span class="player-name"></span></button><p><span class="status-dot"></span><span class="offline-label">Play offline. Keep your scores.</span></p></div>
  </aside>
  <main class="game-frame" aria-label="PinoyPlay game">
    <div id="world" aria-hidden="true"></div>
    <div class="scene-shade"></div>
    <header class="game-header"><button class="icon-button games-open" aria-label="Choose game">${icon('grid')}</button><a class="mini-brand player-brand-small" href="#" aria-label="PinoyPlay home"><img src="${import.meta.env.BASE_URL}brand/pinoyplay.webp" alt="PinoyPlay"></a><div class="header-actions"><button id="sound" class="icon-button" aria-label="Mute sound"></button><button id="pause" class="icon-button" aria-label="Pause game" hidden>${icon('pause')}</button></div></header>
    <section id="hud" hidden aria-label="Game statistics"><div><small id="hud-label"></small><strong id="hud-value">0</strong><div class="run-meta"><span id="run-mode"></span><b id="run-stage"></b><div class="progress-track"><i id="run-progress"></i></div></div></div><div class="hud-right"><span id="lives"></span><span class="coin-counter"><i>₱</i><b id="hud-secondary">0</b></span></div></section>
    <div id="toast" role="status"></div><div id="crossing-notice" hidden role="status"><span class="crossing-symbol" aria-hidden="true">${icon('crossing')}</span><div class="crossing-copy"><strong id="crossing-title"></strong><small id="crossing-hint"></small></div></div>
    <section id="welcome">
      <div class="title-block"><p class="eyebrow"><span class="little-line"></span><span id="game-tag"></span></p><h2 id="game-title"></h2><p id="game-description"></p></div>
      <div class="route-pill" id="route-pill"><span></span> CUBAO <b>↔</b> QUIAPO</div>
      <div class="welcome-bottom"><div class="best-line"><button id="choose-difficulty" aria-label="Choose difficulty"><span id="difficulty-name">Normal</span><span>⌄</span></button><span class="best-score">${icon('trophy')} BEST <strong id="best">0</strong></span></div><p id="game-detail"></p><button id="start" class="primary">Tara, biyahe! ${icon('arrow')}</button><p class="control-hint" id="control-hint"></p><div class="welcome-links"><button class="text-button scores-open">${icon('trophy')} High scores</button><button class="text-button" id="how-to">${icon('help')} How to play</button><button class="text-button" id="install">${icon('download')} Install</button></div></div>
    </section>
    <section id="controls" hidden aria-label="Touch controls"><div class="drive-controls"><button data-move="-1" aria-label="Steer left">←</button><div class="driving-center"><div><span class="speed-value">0</span> <small>KM/H</small></div><button id="brake" aria-label="Hold brake" aria-pressed="false">BRAKE</button></div><button data-move="1" aria-label="Steer right">→</button></div><div class="court-controls"><div class="control-note"><strong id="court-task">Cross the court</strong><span>Hold to run · avoid red shirts</span></div><div class="dpad"><button data-dir="up" aria-label="Run up">↑</button><button data-dir="left" aria-label="Run left">←</button><span>${icon('sun')}</span><button data-dir="right" aria-label="Run right">→</button><button data-dir="down" aria-label="Run down">↓</button></div></div><div id="extra-controls" hidden></div></section>
    <section id="pause-screen" class="screen-overlay" hidden><div class="overlay-card"><span class="badge">TAKE YOUR TIME</span><h2>Sandali lang.</h2><p>Your game is paused.<br>We’ll keep your place.</p><button id="resume" class="primary">Keep playing ${icon('arrow')}</button><button class="secondary restart">Start again</button><button class="text-button back-home">Back to games</button></div></section>
    <section id="result" class="screen-overlay" hidden><div class="overlay-card"><span class="badge" id="result-tag">GOOD RUN!</span><h2 id="result-title">Salamat,<br>driver!</h2><p class="result-caption">YOUR SCORE</p><strong id="final-score">0</strong><p id="result-detail"></p><p id="save-status" class="save-status"></p><button class="primary restart">One more round ${icon('arrow')}</button><button class="secondary scores-open">View high scores</button><button class="text-button back-home">Back to games</button></div></section>
    <div class="loading" id="loading"><span class="loading-sun">${icon('sun')}</span><p>Getting the game ready…</p></div>
  </main>
  <aside class="desktop-note"><span>BUILT FOR<br>YOUR THUMBS.</span><div class="phone-line">${icon('sun')}</div><p>Portrait play.<br>Anywhere you go.</p><kbd>←</kbd> <kbd>→</kbd><small>Keyboard works, too.</small></aside>
  <dialog id="dialog"><div class="dialog-head"><span class="mini-brand">pinoy<span>play</span></span><button class="icon-button" id="close-dialog" aria-label="Close">${icon('close')}</button></div><div id="dialog-content"></div></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const show = (selector: string, visible: boolean) => { $(selector).hidden = !visible; };
const number = (value: number) => value.toLocaleString('en-PH');
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2000); }
function updateSound() {
    audio.enabled = sdk.sound;
    $('#sound').innerHTML = icon(sdk.sound ? 'sound' : 'mute');
    $('#sound').setAttribute('aria-label', sdk.sound ? 'Mute sound' : 'Enable sound');
    $('#sound').setAttribute('aria-pressed', String(!sdk.sound));
}
function updateProfile() {
    document.querySelectorAll('.player-name').forEach(el => el.textContent = sdk.player.username);
    $('#best').textContent = number(sdk.best(selected, sdk.difficulty(selected)));
    $('#difficulty-name').textContent = difficultyLabel[sdk.difficulty(selected)];
    $('#save-status').textContent = sdk.storageAvailable ? sdk.status : 'Storage unavailable · score lasts this session';
}
sdk.addEventListener('change', updateProfile);
document.body.append($('#dialog'));
updateSound();
updateProfile();
async function loadGame(game: GameId) {
    const token = ++loadToken;
    cancelAnimationFrame(frame);
    audio.update(selected, false, 0);
    clearDirections();
    show('#crossing-notice', false);
    world?.dispose();
    world = undefined;
    $('#world').replaceChildren();
    gallery?.hide();
    app.hidden = false;
    selected = game;
    if (location.hash !== '#' + game)
        history.replaceState(null, '', '#' + game);
    const c = gameById(game);
    $('.game-frame').dataset.game = game;
    $('.game-frame').dataset.phase = 'ready';
    $('.game-frame').dataset.extended = String(game !== 'jeepney-rush' && game !== 'patintero');
    $('#game-title').innerHTML = `<img src="${logoUrl(game)}" alt="${c.name}">`;
    $('#game-tag').textContent = c.tag;
    $('#game-description').textContent = c.tagline;
    $('#game-detail').textContent = c.description;
    $('#control-hint').textContent = c.instructions[0];
    $('#sidebar-title').textContent = c.name;
    $('#sidebar-tag').textContent = c.tag;
    $('#sidebar-description').textContent = c.description;
    $<HTMLImageElement>('#sidebar-cover').src = coverUrl(game);
    $('#sidebar-instructions').innerHTML = c.instructions.map(t => '<li>' + t + '</li>').join('');
    $('#start').innerHTML = `${game === 'jeepney-rush' ? 'Tara, biyahe!' : 'Tara, laro!'} ${icon('arrow')}`;
    show('#route-pill', game === 'jeepney-rush');
    show('#welcome', true);
    show('#pause', false);
    show('#pause-screen', false);
    show('#result', false);
    show('#controls', false);
    show('#hud', false);
    show('#loading', true);
    $('#loading').innerHTML = '<span class="loading-sun">' + icon('sun') + '</span><p>Getting the game ready…</p>';
    updateProfile();
    controlLayout = '';
    try {
        // Canvas signs and labels draw with Barlow Condensed; load it even if no visible text uses it yet.
        await Promise.all([document.fonts.ready, document.fonts.load('800 32px "Barlow Condensed"'), document.fonts.load('700 32px "Barlow Condensed"')]);
        if (token !== loadToken)
            return;
        model = createModel(game);
        const loadHost = document.createElement('div');
        loadHost.className = 'scene-host';
        $('#world').append(loadHost);
        const loaded = await createWorld(game, loadHost, model, dt => { if (token === loadToken)
            tick(dt); });
        if (token !== loadToken) {
            loaded.dispose();
            return;
        }
        world = loaded;
        await loaded.ready;
        if (token !== loadToken)
            return;
        lastTime = performance.now();
        renderTime = 0;
        if (loaded.render) {
            const loop = (time: number) => {
                if (token !== loadToken)
                    return;
                const dt = Math.min(.04, (time - lastTime) / 1000);
                lastTime = time;
                if (model.phase === 'running' || model.phase === 'ready')
                    renderTime += dt;
                tick(dt);
                loaded.render!(renderTime);
                frame = requestAnimationFrame(loop);
            };
            frame = requestAnimationFrame(loop);
        }
        show('#loading', false);
    }
    catch (error) {
        console.error(error);
        $('#loading').innerHTML = '<p>This browser couldn’t start the game.<br>Try an updated browser with graphics acceleration.</p><button class="primary" id="load-retry">Try again</button><button class="secondary" id="load-other">Back to games</button>';
        $('#load-retry').onclick = () => void loadGame(selected);
        $('#load-other').onclick = gameMenu;
    }
}
function home() {
    ++loadToken;
    cancelAnimationFrame(frame);
    clearDirections();
    audio.update(selected, false, 0);
    world?.dispose();
    world = undefined;
    $('#world').replaceChildren();
    app.hidden = true;
    gallery.show();
}
function start() {
    if (!world || !$('#loading').hidden)
        return;
    audio.unlock();
    audio.play('start');
    model.start(sdk.difficulty(selected));
    clearDirections();
    previousBest = sdk.best(selected, model.difficulty);
    savedRun = false;
    displayedLives = -1;
    show('#welcome', false);
    show('#pause-screen', false);
    show('#result', false);
    show('#hud', true);
    show('#controls', true);
    show('#pause', true);
    $('.game-frame').dataset.phase = 'running';
    gallery.played(selected);
    configureControls();
    if (selected === 'patintero')
        toast('Cross the court, then come back home!');
    updateHud();
}
function updateHud() {
    const current = model, rush = current instanceof RushModel, court = current instanceof PatinteroModel;
    $('#hud-label').textContent = rush ? 'DISTANCE' : court ? 'ROUND' : current.hudLabel;
    $('#hud-value').textContent = rush ? `${number(Math.floor(current.distance))} m` : court ? String(current.round).padStart(2, '0') : current.hudValue;
    $('#hud-secondary').textContent = number(rush ? current.fares : court ? current.score : current.secondary);
    if (displayedLives !== current.lives) {
        $('#lives').innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < current.lives ? '' : 'lost'}">${icon('heart')}</i>`).join('');
        $('#lives').setAttribute('aria-label', `${current.lives} lives left`);
        displayedLives = current.lives;
    }
    $('#run-mode').textContent = difficultyLabel[current.difficulty];
    $('#run-stage').textContent = rush ? `LV ${current.level} · ${current.routeName}` : court ? `${Math.ceil(current.secondsLeft)}s left` : current.stageLabel;
    $('#run-progress').style.transform = `scaleX(${rush ? current.levelProgress : court ? current.secondsLeft / current.roundLimit : current.progress})`;
    $('.run-meta').classList.toggle('urgent', court && current.secondsLeft <= 10);
    if (rush) {
        $('.speed-value').textContent = String(Math.round(current.speed * 3.6));
        const crossing = current.crossing, visible = crossing && crossing.phase !== 'cleared';
        show('#crossing-notice', !!visible && current.phase === 'running');
        $('#brake').textContent = crossing?.phase === 'walking' ? 'WAIT' : visible ? 'YIELD' : 'BRAKE';
        $('#brake').classList.toggle('yield', !!visible);
        if (visible) {
            $('#crossing-title').textContent = crossing.phase === 'walking' ? 'Let them cross.' : 'Pedestrian crossing ahead';
            $('#crossing-hint').textContent = crossing.phase === 'walking' ? `${Math.max(0, Math.ceil(CROSSING_SECONDS - crossing.elapsed))}s · Release when the road clears` : 'Hold YIELD to stop at the line · +100 for yielding';
        }
    }
    else {
        show('#crossing-notice', false);
        if (court)
            $('#court-task').textContent = current.returning ? 'Come back home ↓' : 'Cross the court ↑';
        else {
            configureControls();
            $('#game-objective').textContent = current.objective;
            const action = $<HTMLButtonElement>('#game-action');
            if (action)
                action.textContent = current.actionLabel;
            if (current instanceof BasketballModel || current instanceof TumbangModel) {
                const meter = $('#power-fill');
                if (meter)
                    meter.style.width = current.power * 100 + '%';
                const mark = $('#power-ideal');
                if (mark)
                    mark.style.left = current.idealPower * 100 + '%';
            }
        }
    }
}
function tick(dt: number) {
    if (!model)
        return;
    audio.update(selected, model.phase === 'running', model instanceof RushModel || model instanceof ParkingModel ? model.speed : 0);
    const previousVy = model instanceof VolcanoModel ? model.vy : 0;
    const newThrow = model instanceof TumbangModel && model.turn === 'flight' && model.flight === 0;
    const events = model.tick(dt);
    if (model.phase === 'running') {
        if (model instanceof BasketballModel) {
            if (model.lastImpact && model.impactAt !== lastBallImpact) {
                audio.play(model.lastImpact); lastBallImpact = model.impactAt;
            }
            audio.motion(model.elapsed, model.walking, true);
        } else if (model instanceof PatinteroModel) {
            audio.motion(model.elapsed, Math.hypot(model.input.x, model.input.y) > 0);
        } else if (model instanceof TumbangModel) {
            audio.motion(model.elapsed, model.turn === 'retrieve' && Math.hypot(model.input.x, model.input.y) > 0);
            if (newThrow) audio.play('throw');
        } else if (model instanceof VolcanoModel) {
            if (model.vy > 300 && previousVy <= 0) audio.play('jump');
            if (model.grounded >= 0 && previousVy < -10) audio.play('step');
        }
    }
    for (const event of events) {
        if (event === 'coin')
            audio.play('coin');
        if (event === 'hit') {
            audio.play('hit');
            toast(model instanceof GameModel ? model.notice : selected === 'jeepney-rush' ? 'Ingat! Watch the traffic.' : 'Taya! Back to the safe zone.');
        }
        if (event === 'turn') {
            toast('Made it! Now get back home.');
            audio.play('start');
        }
        if (event === 'round') {
            toast(model instanceof GameModel ? model.notice : `Lusot! +${(model as PatinteroModel).roundBonus} time bonus · Faster guards!`);
            audio.play('start');
        }
        if (event === 'level') {
            toast(`Level ${(model as RushModel).level} · ${(model as RushModel).routeName}`);
            audio.play('start');
        }
        if (event === 'crossing' || event === 'warning')
            audio.play('warning');
        if (event === 'yield') {
            toast('Salamat! +100 · Release Brake to go');
            audio.play('start');
        }
        if (event === 'clear' && model instanceof RushModel && !model.crossing?.safe)
            toast('Road clear · Release Brake to go');
        if (event === 'missed-yield') {
            toast('Emergency stop! Yield earlier · −1 life');
            audio.play('hit');
            clearBrake();
        }
        if (event === 'timeout') {
            toast('Time’s up! Back to the safe zone.');
            audio.play('hit');
        }
        if (event === 'warning')
            toast(model instanceof GameModel ? model.notice : '10 seconds! Get back home.');
        if (event === 'over')
            finish();
    }
    if (model.phase === 'running')
        updateHud();
}
function finish() {
    if (savedRun)
        return;
    updateHud();
    savedRun = true;
    sdk.submitScore(selected, model.score, model.difficulty);
    clearDirections();
    show('#crossing-notice', false);
    show('#controls', false);
    show('#pause', false);
    show('#result', true);
    $('.game-frame').dataset.phase = 'over';
    $('#result-tag').textContent = model.score > previousBest ? 'NEW PERSONAL BEST' : 'GOOD RUN!';
    $('#result-title').innerHTML = selected === 'jeepney-rush' ? 'Salamat,<br>driver!' : 'Galing mo!';
    $('#final-score').textContent = number(model.score);
    $('#result-detail').innerHTML = model instanceof RushModel ? `${difficultyLabel[model.difficulty]} · Level ${model.level}<br>${Math.floor(model.distance)} m · ${model.fares} fares · ${model.bonus} bonus` : model instanceof PatinteroModel ? `${difficultyLabel[model.difficulty]} · Round ${model.round}` : `${difficultyLabel[model.difficulty]} · ${model.resultDetail}`;
    updateProfile();
}
function pause() {
    if (model?.phase !== 'running')
        return;
    model.pause();
    clearDirections();
    show('#crossing-notice', false);
    show('#pause-screen', true);
    show('#controls', false);
    show('#pause', false);
    $('.game-frame').dataset.phase = 'paused';
}
function resume() {
    audio.unlock();
    model.resume();
    show('#pause-screen', false);
    show('#controls', true);
    show('#pause', true);
    $('.game-frame').dataset.phase = 'running';
}
function move(dir: number) { if (model instanceof RushModel && model.move(dir)) {
    audio.unlock();
    audio.play('move');
} }
const directions = new Set<string>();
function applyDirections() {
    if (model instanceof PatinteroModel || model instanceof GameModel)
        model.input = { x: Number(directions.has('right')) - Number(directions.has('left')), y: Number(directions.has('down')) - Number(directions.has('up')) };
}
function clearDirections() { if (model instanceof GameModel)
    model.charging = false; if (model instanceof BasketballModel) model.aimInput = 0; clearBrake(); directions.clear(); applyDirections(); document.querySelectorAll('.held').forEach(b => b.classList.remove('held')); }
document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(button => {
    const direction = button.dataset.dir!;
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); audio.unlock(); directions.add(direction); button.classList.add('held'); applyDirections(); });
    const release = () => { directions.delete(direction); button.classList.remove('held'); applyDirections(); };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
});
function clearBrake() {
    if (model instanceof RushModel)
        model.braking = false;
    $('#brake').classList.remove('held');
    $('#brake').setAttribute('aria-pressed', 'false');
}
function holdBrake() {
    if (!(model instanceof RushModel) || model.phase !== 'running')
        return;
    model.braking = true;
    audio.unlock();
    $('#brake').classList.add('held');
    $('#brake').setAttribute('aria-pressed', 'true');
}
$('#brake').addEventListener('pointerdown', e => { e.preventDefault(); $('#brake').setPointerCapture(e.pointerId); holdBrake(); });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
    $('#brake').addEventListener(event, clearBrake);
document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(b => b.onclick = () => move(Number(b.dataset.move)));
let swipeStart: {
    x: number;
    y: number;
} | undefined;
$('#world').addEventListener('pointerdown', e => { swipeStart = { x: e.clientX, y: e.clientY }; });
$('#world').addEventListener('pointerup', e => {
    if (swipeStart && Math.abs(e.clientX - swipeStart.x) > 25 && Math.abs(e.clientX - swipeStart.x) > Math.abs(e.clientY - swipeStart.y))
        move(e.clientX > swipeStart.x ? 1 : -1);
    swipeStart = undefined;
});
$('#world').addEventListener('pointercancel', () => swipeStart = undefined);
const keyDirection: Record<string, string> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
window.addEventListener('keydown', e => {
    if (app.hidden || $<HTMLDialogElement>('#dialog').open || e.target instanceof HTMLInputElement)
        return;
    if (model instanceof GameModel && model.phase === 'running') {
        if (model instanceof BasketballModel && (e.key === 'q' || e.key === 'e')) model.aimInput = e.key === 'q' ? -1 : 1;
        if (e.key === ' ' && !e.repeat) {
            e.preventDefault();
            audio.unlock();
            model.action(true);
        }
        if (model instanceof PikoModel && /^[1-8]$/.test(e.key) && !e.repeat) {
            model.choose(Number(e.key));
            audio.play('step');
        }
        if (model instanceof HaloModel) {
            if (/^[1-6]$/.test(e.key) && !e.repeat) {
                model.choose(Number(e.key) - 1);
                audio.play('pour');
            }
            if (e.key === 'Backspace') {
                e.preventDefault();
                model.undo();
            }
            if (e.key === 'Enter' && !e.repeat)
                model.action(true);
        }
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
        e.preventDefault();
    if (e.key === 'Escape' || e.key === 'p') {
        if (model?.phase === 'running')
            pause();
        else if (model?.phase === 'paused')
            resume();
        return;
    }
    if (e.key === 'Enter' && (model?.phase === 'ready' || model?.phase === 'over'))
        start();
    if (model instanceof RushModel && [' ', 'ArrowDown', 's'].includes(e.key))
        holdBrake();
    if (e.repeat && model instanceof RushModel)
        return;
    if (model?.phase === 'running' && keyDirection[e.key]) {
        audio.unlock();
        if (model instanceof RushModel) {
            if (keyDirection[e.key] === 'left')
                move(-1);
            if (keyDirection[e.key] === 'right')
                move(1);
        }
        else {
            directions.add(keyDirection[e.key]);
            applyDirections();
        }
    }
});
window.addEventListener('keyup', e => { if (e.key === ' ' && model instanceof GameModel)
    model.action(false); if ([' ', 'ArrowDown', 's'].includes(e.key))
    clearBrake(); if (model instanceof BasketballModel && (e.key === 'q' || e.key === 'e')) model.aimInput = 0; if (keyDirection[e.key]) {
    directions.delete(keyDirection[e.key]);
    applyDirections();
} });
window.addEventListener('blur', () => { clearDirections(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden)
    pause(); });
$('#start').onclick = start;
$('#pause').onclick = pause;
$('#resume').onclick = resume;
document.querySelectorAll<HTMLElement>('.restart').forEach(el => el.onclick = start);
$('#sound').onclick = () => { audio.unlock(); sdk.setSound(!sdk.sound); updateSound(); };
let controlLayout = '';
function configureControls() {
    const extended = model instanceof GameModel;
    show('.drive-controls', model instanceof RushModel);
    show('.court-controls', model instanceof PatinteroModel);
    show('#extra-controls', extended);
    if (!(model instanceof GameModel))
        return;
    const layout = model.controls;
    if (layout === controlLayout)
        return;
    controlLayout = layout;
    $('.game-frame').dataset.controls = layout;
    directions.clear();
    applyDirections();
    const dir = (name: string, label: string, symbol: string) => `<button data-hold="${name}" aria-label="${label}">${symbol}</button>`;
    const action = '<button id="game-action" class="action-control"></button>';
    let content = '';
    if (layout === 'parking' || layout === 'court')
        content = `<div class="new-pad">${dir('up', layout === 'parking' ? 'Drive forward' : 'Run up', '↑')}${dir('left', layout === 'parking' ? 'Steer left' : 'Run left', '←')}<span>${layout === 'parking' ? action : '★'}</span>${dir('right', layout === 'parking' ? 'Steer right' : 'Run right', '→')}${dir('down', layout === 'parking' ? 'Reverse' : 'Run down', '↓')}</div>`;
    if (layout === 'steer' || layout === 'platform' || layout === 'aim')
        content = `<div class="new-steering">${dir('left', layout === 'aim' ? 'Aim left' : 'Move left', '←')}${layout === 'steer' ? '<span class="steer-hint">HOLD TO MOVE<br>or drag the scene</span>' : action}${dir('right', layout === 'aim' ? 'Aim right' : 'Move right', '→')}</div>`;
    if (layout === 'aim')
        content = '<div class="power-meter" aria-label="Throwing power"><span id="power-fill"></span><i id="power-ideal"></i></div>' + content;
    if (layout === 'basketball')
        content = `<div class="basketball-controls"><div class="new-pad">${dir('up', 'Walk toward hoop', '↑')}${dir('left', 'Walk left', '←')}<span>MOVE</span>${dir('right', 'Walk right', '→')}${dir('down', 'Walk back', '↓')}</div><div class="basketball-shot"><div class="power-meter" aria-label="Shooting power"><span id="power-fill"></span><i id="power-ideal"></i></div>${action}<div class="aim-adjust"><button data-aim="-1" aria-label="Adjust aim left">↶</button><span>AIM</span><button data-aim="1" aria-label="Adjust aim right">↷</button></div></div></div>`;
    if (layout === 'tap')
        content = '<div class="piko-buttons">' + Array.from({ length: 8 }, (_, i) => `<button data-choice="${i + 1}" aria-label="Hop to square ${i + 1}">${i + 1}</button>`).join('') + '</div>';
    if (layout === 'recipe')
        content = '<div class="ingredient-buttons">' + ingredients.map((i, n) => `<button data-choice="${n}"><span style="background:#${i.color.toString(16).padStart(6, '0')}"></span>${i.short}</button>`).join('') + '</div><div class="recipe-actions"><button id="undo-ingredient">↶ Undo</button>' + action + '</div>';
    $('#extra-controls').innerHTML = '<p id="game-objective"></p>' + content;
    document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach(b => {
        const d = b.dataset.hold!;
        b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); audio.unlock(); directions.add(d); b.classList.add('held'); applyDirections(); };
        const release = () => { directions.delete(d); b.classList.remove('held'); applyDirections(); };
        b.onpointerup = release;
        b.onpointercancel = release;
        b.onlostpointercapture = release;
    });
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => b.onclick = () => { audio.unlock(); if (model instanceof GameModel) {
        model.choose(Number(b.dataset.choice)); audio.play(model instanceof HaloModel ? 'pour' : 'step'); } });
    document.querySelectorAll<HTMLButtonElement>('[data-aim]').forEach(b => {
        b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); if (model instanceof BasketballModel) model.aimInput = Number(b.dataset.aim); b.classList.add('held'); };
        const release = () => { if (model instanceof BasketballModel) model.aimInput = 0; b.classList.remove('held'); };
        b.onpointerup = release; b.onpointercancel = release; b.onlostpointercapture = release;
    });
    const button = $<HTMLButtonElement>('#game-action');
    if (button) {
        button.onpointerdown = e => { e.preventDefault(); button.setPointerCapture(e.pointerId); audio.unlock(); if (model instanceof GameModel)
            model.action(true); button.classList.add('held'); };
        button.onpointerup = () => { if (model instanceof GameModel)
            model.action(false); button.classList.remove('held'); };
        const cancel = () => { if (model instanceof GameModel)
            model.charging = false; button.classList.remove('held'); };
        button.onpointercancel = cancel;
        button.onlostpointercapture = cancel;
    }
    const undo = $<HTMLButtonElement>('#undo-ingredient');
    if (undo)
        undo.onclick = () => { if (model instanceof GameModel)
            model.undo(); };
}
$('#world').addEventListener('pointermove', e => {
    if (e.buttons && selected === 'island-boat-racing' && model instanceof GameModel) {
        const r = $('#world').getBoundingClientRect();
        model.drag((e.clientX - r.left) / r.width);
    }
});
const dialog = $<HTMLDialogElement>('#dialog');
function openDialog(html: string) { pause(); $('#dialog-content').innerHTML = html; if (!dialog.open)
    dialog.showModal(); }
$('#close-dialog').onclick = () => dialog.close();
dialog.addEventListener('click', e => { if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
} });
function gameMenu() { dialog.close(); if (location.hash)
    location.hash = '';
else
    home(); }
document.querySelectorAll<HTMLElement>('.games-open,.back-home').forEach(el => el.onclick = gameMenu);
document.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(b => b.onclick = () => { if (selected !== b.dataset.game)
    void loadGame(b.dataset.game as GameId); });
function profile() {
    openDialog(`<p class="eyebrow">HEY, KALARO.</p><h2>What’s your name?</h2><p>This name appears with your scores. Your player is saved on this device.</p><form id="profile-form"><label for="username">Player name</label><input id="username" name="username" maxlength="20" minlength="2" autocomplete="nickname" required><p id="profile-error" role="alert"></p><button class="primary" type="submit">Save name ${icon('arrow')}</button></form>`);
    $<HTMLInputElement>('#username').value = sdk.player.username;
    $('#profile-form').onsubmit = e => { e.preventDefault(); try {
        sdk.setUsername($<HTMLInputElement>('#username').value);
        dialog.close();
        toast('Player name saved.');
    }
    catch (error) {
        $('#profile-error').textContent = (error as Error).message;
    } };
}
document.querySelectorAll<HTMLElement>('.profile-open').forEach(el => el.onclick = profile);
async function scores() {
    openDialog(`<p class="eyebrow">${gameById(selected).name.toUpperCase()} · ${difficultyLabel[sdk.difficulty(selected)]}</p><h2>Good company.</h2><div class="score-tabs"><button id="local-scores" class="active">On this device</button><button id="online-scores">Online</button></div><div id="score-list"></div><p class="small-print" id="score-note"></p>`);
    const renderLocal = () => {
        $('#local-scores').classList.add('active');
        $('#online-scores').classList.remove('active');
        $('#score-list').replaceChildren();
        const entries = sdk.history(selected, sdk.difficulty(selected));
        if (!entries.length)
            $('#score-list').innerHTML = '<p class="empty">Your first run belongs here.<br>Play a round to set your best.</p>';
        else
            entries.forEach((entry, index) => addScoreRow(index + 1, sdk.player.username, entry.score));
        $('#score-note').textContent = 'Your best runs on this device. Play offline; scores sync when a server is connected.';
    };
    $('#local-scores').onclick = renderLocal;
    $('#online-scores').onclick = async () => {
        $('#local-scores').classList.remove('active');
        $('#online-scores').classList.add('active');
        $('#score-list').innerHTML = '<p class="empty">Checking online scores…</p>';
        try {
            const records = await sdk.leaderboard(selected, sdk.difficulty(selected));
            if (!$('#online-scores')?.classList.contains('active'))
                return;
            $('#score-list').replaceChildren();
            if (records === null)
                $('#score-list').innerHTML = '<p class="empty">Online rankings aren’t connected yet.<br>Your scores are safe on this device.</p>';
            else if (!records.length)
                $('#score-list').innerHTML = '<p class="empty">Be the first to finish a round.</p>';
            else
                records.forEach(r => addScoreRow(r.rank, r.username, r.score));
            $('#score-note').textContent = 'Casual leaderboard · client-reported scores. Internet is never required to play.';
        }
        catch {
            if ($('#score-list'))
                $('#score-list').innerHTML = '<p class="empty">You’re offline or the score server is unavailable.<br>Your saved runs will sync later.</p>';
        }
    };
    renderLocal();
}
function addScoreRow(rank: number, name: string, score: number) {
    const row = document.createElement('div');
    row.className = 'score-row';
    for (const text of [String(rank).padStart(2, '0'), name, number(score)]) {
        const span = document.createElement('span');
        span.textContent = text;
        row.append(span);
    }
    $('#score-list').append(row);
}
document.querySelectorAll<HTMLElement>('.scores-open').forEach(el => el.onclick = () => void scores());
function chooseDifficulty() {
    const details = gameById(selected).modeDetails;
    openDialog(`<p class="eyebrow">FIND YOUR PACE</p><h2>How hard?</h2><p>Every mode gets tougher as you play.</p><div class="difficulty-options">${difficulties.map((difficulty, i) => `<button data-difficulty="${difficulty}" aria-pressed="${sdk.difficulty(selected) === difficulty}"><span class="difficulty-dots">${'●'.repeat(i + 1)}${'○'.repeat(2 - i)}</span><span><strong>${difficultyLabel[difficulty]}</strong><small>${details[i]}</small></span></button>`).join('')}</div><p class="small-print">Each difficulty has its own best scores and online rankings.</p>`);
    document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(button => button.onclick = () => {
        sdk.setDifficulty(selected, button.dataset.difficulty as Difficulty);
        dialog.close();
    });
}
$('#choose-difficulty').onclick = chooseDifficulty;
$('#how-to').onclick = () => {
    const c = gameById(selected);
    openDialog(`<p class="eyebrow">${c.name.toUpperCase()}</p><h2>Tara, laro!</h2><ol class="how-to">${c.instructions.map((text, i) => `<li><strong>0${i + 1}</strong><span>${text}</span></li>`).join('')}</ol><p class="small-print">Pause anytime. Sound is optional. Your scores save offline.</p>`);
};
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e as typeof deferredInstall; });
async function install() {
    if (deferredInstall) {
        await deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = undefined;
    }
    else
        openDialog(`<p class="eyebrow">KEEP A LITTLE HOME CLOSE</p><h2>Play anywhere.</h2><p>On iPhone or iPad, open this page in Safari, tap Share, then <strong>Add to Home Screen</strong>.</p><p>On Android, use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p class="small-print">Open once online and wait for “Ready for offline play” before going offline. Scores stay on this device until they can sync.</p>`);
}
$('#install').onclick = install;
const updateSW = registerSW({
    onOfflineReady() { document.querySelectorAll('.offline-label').forEach(e => e.textContent = 'All 10 games ready offline'); if (!app.hidden)
        toast('All 10 games are ready for offline play.'); },
    onNeedRefresh() {
        const btn = document.createElement('button');
        btn.className = 'update-notice';
        btn.textContent = 'New version ready · Update';
        btn.onclick = () => { pause(); void updateSW(true); };
        document.body.append(btn);
    },
    onRegisterError(error) { console.warn('Offline install unavailable', error); $('.offline-label').textContent = 'Offline installation unavailable'; },
});
if (import.meta.env.VITE_NAKAMA_URL) {
    void import('./sdk/nakama').then(({ NakamaAdapter }) => sdk.useOnline(new NakamaAdapter(import.meta.env.VITE_NAKAMA_URL, import.meta.env.VITE_NAKAMA_SERVER_KEY || 'defaultkey')));
}
window.addEventListener('online', () => void sdk.sync());
gallery = new Gallery(sdk, game => { if (location.hash === '#' + game)
    void loadGame(game);
else
    location.hash = game; }, profile, () => void install());
function route() {
    const id = location.hash.slice(1);
    if (isGameId(id)) {
        if (app.hidden || selected !== id || !world)
            void loadGame(id);
    }
    else if (!app.hidden)
        home();
}
app.hidden = true;
gallery.show();
window.addEventListener('hashchange', route);
route();
