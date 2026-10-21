import { catalog, coverUrl, gameById, isGameId, type GameId } from './catalog';
import type { PinoyPlaySDK } from './sdk';
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
const heart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21 3.5 12.5A5.5 5.5 0 0 1 12 5.6a5.5 5.5 0 0 1 8.5 6.9Z"/></svg>';
const search = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
const readList = (key: string): GameId[] => {
    try {
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(items) ? items.filter(isGameId) : [];
    }
    catch {
        return [];
    }
};
export class Gallery {
    readonly element = document.createElement('div');
    private favorites = new Set(readList('pinoyplay.favorites'));
    private recent = readList('pinoyplay.recent');
    private category = 'All';
    private query = '';
    private onlyFavorites = false;
    private scroll = 0;
    constructor(private sdk: PinoyPlaySDK, private play: (id: GameId) => void, profile: () => void, install: () => void) {
        this.element.id = 'gallery';
        this.element.innerHTML = `
      <a class="skip-link" href="#collection">Skip to games</a>
      <header class="collection-header"><div class="collection-header-inner">
        <a class="collection-brand" href="#" aria-label="PinoyPlay home"><img src="/brand/pinoyplay.webp" width="220" height="73" alt="PinoyPlay"></a>
        <nav aria-label="Collection navigation"><a href="#collection" class="browse-link">The games</a><button id="favorites-view">${heart}<span>Favorites</span><b id="favorite-count">0</b></button></nav>
        <button id="gallery-profile" class="profile-chip"><span class="profile-avatar">P</span><span class="gallery-player"></span></button>
      </div></header>
      <main class="collection-main">
        <section class="feature-wall" aria-labelledby="collection-title">
          <div class="feature-copy"><span class="collection-eyebrow"><i></i> A LITTLE BREAK. A LITTLE HOME.</span><h1 id="collection-title">Laro tayo<span>.</span></h1><p>From the kanto to the islands. <br>Your next little escape starts here.</p><a class="explore-link" href="#collection">Find your game ${arrow}</a><div class="feature-count"><b>10</b> games <span>★</span> <b>100%</b> Pinoy spirit</div></div>
          <div class="feature-posters">
            ${this.feature('jeepney-rush', 'hero-poster', 'THE EVERYDAY ADVENTURE')}
            <div class="poster-pair">${this.feature('patintero', 'small-poster', 'LARONG KALYE')}${this.feature('halo-halo-shop', 'small-poster', 'MERIENDA BREAK')}</div>
          </div>
          <span class="wall-star star-one">✦</span><span class="wall-star star-two">✦</span>
        </section>
        <div class="collection-promise"><span><i class="promise-dot"></i><b class="offline-label">Play first. No sign-up needed.</b></span><span>Portrait play</span><span>Offline ready after download</span><button id="gallery-install">Take the games with you ${arrow}</button></div>
        <section id="recent-section" class="recent-section" hidden><div class="section-heading"><h2>One more round?</h2><span>RECENTLY PLAYED</span></div><div id="recent-games"></div></section>
        <section class="collections-strip" aria-label="Explore collections">
          <button data-collection="Street games" class="collection-tile street"><span class="collection-symbol">✦</span><span><small>THE CLASSICS</small><strong>Larong kalye</strong><em>Chalk lines. Quick feet.</em></span>${arrow}</button>
          <button data-collection="Island life" class="collection-tile island"><span class="collection-symbol">≈</span><span><small>A LITTLE GETAWAY</small><strong>Island time</strong><em>Sun, sea, and fresh buko.</em></span>${arrow}</button>
          <button data-collection="Driving" class="collection-tile driving"><span class="collection-symbol">↗</span><span><small>LET’S GO PLACES</small><strong>Diskarteng driver</strong><em>Find your own way.</em></span>${arrow}</button>
        </section>
        <section id="collection" class="all-games" aria-labelledby="games-heading">
          <div class="section-heading games-heading"><div><span class="collection-eyebrow">MADE FOR YOUR MERIENDA BREAK</span><h2 id="games-heading">Pick your next laro<span>.</span></h2></div><label class="game-search">${search}<input id="game-search" type="search" placeholder="Find a game…" aria-label="Search games" autocomplete="off"></label></div>
          <div class="filter-row"><span class="collection-label">Find your kind of fun</span><span id="result-count" role="status" aria-live="polite"></span></div>
          <div class="category-filter" aria-label="Game category">${['All', ...new Set(catalog.map(g => g.category))].map(c => `<button data-category="${c}" aria-pressed="${c === 'All'}">${c === 'All' ? 'Every kind of fun' : c}</button>`).join('')}</div>
          <div id="game-grid" class="game-grid"></div>
          <div id="gallery-empty" class="gallery-empty" hidden><span>✦</span><h3>No games here yet.</h3><p id="empty-copy"></p><button id="reset-filters">See all 10 games ${arrow}</button></div>
        </section>
        <section class="pocket-banner"><div class="pocket-mark"><img src="/brand/mark.svg" width="72" height="72" alt=""></div><div><span class="collection-eyebrow">A LITTLE HOME, IN YOUR POCKET</span><h2>No signal? Tuloy ang laro.</h2><p>Download once. Play all ten offline. Your scores stay with you.</p></div><button id="pocket-install">Install PinoyPlay ${arrow}</button></section>
      </main>
      <footer class="collection-footer"><img src="/brand/pinoyplay.webp" width="145" height="48" alt="PinoyPlay"><p>Small games. Familiar places. One more round.</p><span>BLUE. RED. GOLD. ALL HEART. <b>★ ★ ★</b></span></footer>`;
        document.body.prepend(this.element);
        this.element.querySelector<HTMLButtonElement>('#gallery-profile')!.onclick = profile;
        for (const id of ['gallery-install', 'pocket-install'])
            this.element.querySelector<HTMLButtonElement>('#' + id)!.onclick = install;
        this.element.querySelector<HTMLInputElement>('#game-search')!.oninput = e => { this.query = (e.target as HTMLInputElement).value; this.renderCards(); };
        this.element.addEventListener('click', e => {
            const target = (e.target as Element).closest<HTMLElement>('button,a');
            if (!target)
                return;
            const id = target.dataset.play;
            if (isGameId(id)) {
                e.preventDefault();
                this.scroll = window.scrollY;
                this.play(id);
            }
            const favorite = target.dataset.favorite;
            if (isGameId(favorite)) {
                if (this.favorites.has(favorite))
                    this.favorites.delete(favorite);
                else
                    this.favorites.add(favorite);
                this.saveList('pinoyplay.favorites', [...this.favorites]);
                this.renderCards();
                this.updateProfile();
            }
            if (target.dataset.category) {
                this.category = target.dataset.category;
                this.renderCards();
            }
            if (target.dataset.collection) {
                this.category = target.dataset.collection;
                this.onlyFavorites = false;
                this.query = '';
                this.element.querySelector<HTMLInputElement>('#game-search')!.value = '';
                this.renderCards();
                this.element.querySelector('#collection')!.scrollIntoView({ behavior: 'smooth' });
            }
        });
        this.element.querySelector<HTMLButtonElement>('#favorites-view')!.onclick = () => { this.onlyFavorites = !this.onlyFavorites; this.renderCards(); this.element.querySelector('#collection')!.scrollIntoView({ behavior: 'smooth' }); };
        this.element.querySelector<HTMLButtonElement>('#reset-filters')!.onclick = () => {
            this.category = 'All';
            this.query = '';
            this.onlyFavorites = false;
            this.element.querySelector<HTMLInputElement>('#game-search')!.value = '';
            this.renderCards();
        };
        sdk.addEventListener('change', () => { this.updateProfile(); this.renderCards(); });
        this.renderCards();
        this.renderRecent();
        this.updateProfile();
    }
    private feature(id: GameId, className: string, label: string) {
        const game = gameById(id);
        return `<a class="feature-poster ${className}" href="#${id}" data-play="${id}" aria-label="Play ${game.name}"><img class="poster-cover" src="${coverUrl(id)}" alt="${game.name}" fetchpriority="${className === 'hero-poster' ? 'high' : 'auto'}"><span class="poster-caption">${label}</span><span class="poster-play" aria-hidden="true">▶</span></a>`;
    }
    private renderCards() {
        const query = this.query.trim().toLocaleLowerCase();
        const games = catalog.filter(g => (this.category === 'All' || g.category === this.category) && (!this.onlyFavorites || this.favorites.has(g.id)) && `${g.name} ${g.category} ${g.tagline} ${g.description}`.toLocaleLowerCase().includes(query));
        this.element.querySelector('#game-grid')!.innerHTML = games.map(g => `
      <article class="game-card" style="--game-accent:${g.accent}">
        <div class="card-image"><a href="#${g.id}" data-play="${g.id}" aria-label="Play ${g.name}"><img class="card-cover" src="${coverUrl(g.id)}" alt="" loading="lazy" width="1024" height="683"><span class="card-play">Play now ${arrow}</span></a></div>
        <div class="card-caption"><a class="card-title" href="#${g.id}" data-play="${g.id}"><div><h3>${g.name}</h3><p><i class="card-category">${g.category}<span>·</span></i>${this.bestLine(g.id, g.tagline)}</p></div></a>
          <button class="favorite-button" data-favorite="${g.id}" aria-label="${this.favorites.has(g.id) ? 'Remove ' + g.name + ' from' : 'Add ' + g.name + ' to'} favorites" aria-pressed="${this.favorites.has(g.id)}">${heart}</button></div>
      </article>`).join('');
        this.element.querySelector('#result-count')!.textContent = `${games.length} ${games.length === 1 ? 'game' : 'games'}${this.onlyFavorites ? ' saved' : ''}`;
        this.element.querySelector<HTMLElement>('#gallery-empty')!.hidden = games.length > 0;
        this.element.querySelector('#empty-copy')!.textContent = this.onlyFavorites ? 'Tap a heart on any game to keep it in your favorites.' : 'Try another search or clear a filter.';
        this.element.querySelector('#games-heading')!.textContent = this.onlyFavorites ? 'Your favorites.' : 'Pick your next laro.';
        this.element.querySelectorAll<HTMLElement>('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === this.category)));
        this.element.querySelector('#favorites-view')!.setAttribute('aria-pressed', String(this.onlyFavorites));
    }
    /** The player's best for their chosen difficulty, or the tagline before the first run. */
    private bestLine(id: GameId, tagline: string) {
        const best = this.sdk.best(id, this.sdk.difficulty(id));
        return best > 0 ? `Best <b>${best.toLocaleString('en-PH')}</b>` : tagline;
    }
    private renderRecent() {
        this.element.querySelector<HTMLElement>('#recent-section')!.hidden = !this.recent.length;
        this.element.querySelector('#recent-games')!.innerHTML = this.recent.slice(0, 4).map(id => `<a href="#${id}" data-play="${id}"><img src="${coverUrl(id)}" alt="" width="88" height="60"><span><strong>${gameById(id).name}</strong><small>Jump back in</small></span>${arrow}</a>`).join('');
    }
    private saveList(key: string, value: GameId[]) { try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch { /* Favorites still work for this session. */ } }
    private updateProfile() {
        this.element.querySelector('.gallery-player')!.textContent = this.sdk.player.username;
        this.element.querySelector('.profile-avatar')!.textContent = this.sdk.player.username.slice(0, 1).toUpperCase();
        this.element.querySelector('#favorite-count')!.textContent = String(this.favorites.size);
    }
    played(id: GameId) { this.recent = [id, ...this.recent.filter(g => g !== id)].slice(0, 4); this.saveList('pinoyplay.recent', this.recent); this.renderRecent(); }
    show() { this.element.hidden = false; document.body.classList.remove('playing'); requestAnimationFrame(() => window.scrollTo(0, this.scroll)); }
    hide() { this.scroll = window.scrollY; this.element.hidden = true; document.body.classList.add('playing'); window.scrollTo(0, 0); }
}
