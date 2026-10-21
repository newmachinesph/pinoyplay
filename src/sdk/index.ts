import { difficulties, isDifficulty, type Difficulty } from '../core/difficulty';
import { gameIds, type GameId } from '../catalog';
export const games = gameIds;
export type { GameId } from '../catalog';
export type Player = { id: string; username: string };
export type Score = { id: string; game: GameId; score: number; at: string; difficulty?: Difficulty };
export type RankedScore = { rank: number; username: string; score: number };
/** Server review of the display name: only approved names appear on the public board. */
export type NameStatus = 'pending' | 'approved' | 'rejected';
export type DevicePlayer = Player & { secret: string };
export interface OnlineAdapter {
  connect(player: DevicePlayer): Promise<NameStatus | void>;
  submit(score: Score): Promise<void>;
  leaderboard(game: GameId, difficulty?: Difficulty): Promise<RankedScore[]>;
}
export interface SaveStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
type Saved = { version: 1; player: Player; secret: string; nameStatus?: NameStatus; scores: Score[]; pending: Score[]; sound: boolean; difficulty: Record<GameId, Difficulty> };
export const boardId = (game: GameId, difficulty: Difficulty = 'normal') => difficulty === 'normal' ? game : `${game}-${difficulty}`;
const modeOf = (score: Score) => score.difficulty ?? 'normal';
const KEY = 'pinoyplay.sdk.v1';
// randomUUID requires HTTPS; getRandomValues also supports local LAN previews.
function makeDeviceId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}
/** 32 random bytes as hex; only its hash is stored on the server. */
const makeSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const isNameStatus = (v: unknown): v is NameStatus => v === 'pending' || v === 'approved' || v === 'rejected';
const validScore = (s: Score) => s && typeof s.id === 'string' && games.includes(s.game)
  && Number.isSafeInteger(s.score) && s.score >= 0 && typeof s.at === 'string'
  && (s.difficulty === undefined || isDifficulty(s.difficulty));
const retainScores = (scores: Score[], limit: number) => games.flatMap(game => difficulties.flatMap(difficulty =>
  scores.filter(s => s.game === game && modeOf(s) === difficulty).sort((a, b) => b.score - a.score).slice(0, limit)));

/** Offline-first SDK. Games only submit results; persistence and network retries live here. */
export class PinoyPlaySDK extends EventTarget {
  private data: Saved;
  private running?: Promise<void>;
  private nameDirty = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private adapter?: OnlineAdapter;
  status = 'On this device';
  storageAvailable = true;
  constructor(private storage: SaveStore, private makeId = makeDeviceId) {
    super();
    this.data = { version: 1, player: { id: makeId(), username: 'Kalaro' }, secret: makeSecret(), scores: [], pending: [], sound: true, difficulty: Object.fromEntries(games.map(game => [game, 'normal'])) as Record<GameId, Difficulty> };
    try {
      const saved = JSON.parse(storage.getItem(KEY) ?? 'null');
      if (saved?.version === 1 && typeof saved.player?.id === 'string' && typeof saved.player?.username === 'string') {
        this.data = {
          ...this.data, player: saved.player,
          secret: typeof saved.secret === 'string' && /^[0-9a-f]{64}$/.test(saved.secret) ? saved.secret : this.data.secret,
          nameStatus: isNameStatus(saved.nameStatus) ? saved.nameStatus : undefined,
          scores: Array.isArray(saved.scores) ? retainScores(saved.scores.filter(validScore), 50) : [],
          pending: Array.isArray(saved.pending) ? retainScores(saved.pending.filter(validScore), 1) : [],
          sound: typeof saved.sound === 'boolean' ? saved.sound : true,
          difficulty: Object.fromEntries(games.map(game => [game, isDifficulty(saved.difficulty?.[game]) ? saved.difficulty[game] : 'normal'])) as Record<GameId, Difficulty>,
        };
      }
    } catch { /* Recover gracefully from corrupt data or blocked storage. */ }
    this.persist();
  }
  get player() { return { ...this.data.player }; }
  get sound() { return this.data.sound; }
  get pendingCount() { return this.data.pending.length; }
  get nameStatus() { return this.data.nameStatus; }
  setSound(value: boolean) { this.data.sound = value; this.persist(); }
  difficulty(game: GameId) { return this.data.difficulty[game]; }
  setDifficulty(game: GameId, difficulty: Difficulty) {
    if (!games.includes(game) || !isDifficulty(difficulty)) throw new Error('Invalid difficulty');
    this.data.difficulty[game] = difficulty; this.persist();
  }
  setUsername(name: string) {
    const username = name.trim();
    if (!/^[\p{L}\p{N}_ -]{2,20}$/u.test(username)) throw new Error('Use 2–20 letters, numbers, spaces, _ or -.');
    if (username !== this.data.player.username) { this.data.nameStatus = undefined; this.nameDirty = true; }
    this.data.player.username = username; this.persist();
    void this.sync();
  }
  best(game: GameId, difficulty: Difficulty = 'normal') { return Math.max(0, ...this.data.scores.filter(s => s.game === game && modeOf(s) === difficulty).map(s => s.score)); }
  history(game: GameId, difficulty: Difficulty = 'normal') { return this.data.scores.filter(s => s.game === game && modeOf(s) === difficulty).sort((a, b) => b.score - a.score).slice(0, 10); }
  submitScore(game: GameId, value: number, difficulty: Difficulty = 'normal') {
    if (!games.includes(game) || !Number.isSafeInteger(value) || value < 0 || !isDifficulty(difficulty)) throw new Error('Invalid score');
    const score = { id: this.makeId(), game, score: value, at: new Date().toISOString(), difficulty };
    const all = [...this.data.scores, score];
    this.data.scores = retainScores(all, 50);
    // One highest queued result per game AND difficulty; at most thirty entries.
    this.data.pending = retainScores([...this.data.pending, score], 1);
    this.persist(); void this.sync(); return score;
  }
  useOnline(adapter: OnlineAdapter) { this.adapter = adapter; void this.sync(); }
  /** Resolves when the current upload finishes; concurrent callers share one run. */
  sync(): Promise<void> {
    if (!this.adapter) return Promise.resolve();
    this.running ??= this.upload(this.adapter).finally(() => {
      this.running = undefined;
      // Results submitted during the upload start a fresh run.
      if (this.status === 'Scores synced' && (this.data.pending.length || this.nameDirty)) void this.sync();
    });
    return this.running;
  }
  private async upload(adapter: OnlineAdapter) {
    this.status = 'Syncing scores…'; this.changed();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    try {
      // Nothing to upload: don't register the device with the server yet.
      if (!this.data.pending.length && !this.nameDirty) { this.status = 'Scores synced'; return; }
      this.nameDirty = false;
      const status = await adapter.connect({ ...this.player, secret: this.data.secret });
      if (status) { this.data.nameStatus = status; this.persist(); }
      // Snapshot IDs: a newer score submitted during upload must remain queued.
      for (const score of [...this.data.pending]) {
        try { await adapter.submit(score); }
        catch (error) {
          // The server will never accept this result (e.g. malformed); drop it instead of retrying forever.
          if (!(error as { permanent?: boolean }).permanent) throw error;
        }
        this.data.pending = this.data.pending.filter(s => s.id !== score.id);
        this.persist();
      }
      this.status = 'Scores synced';
    } catch {
      this.status = 'Saved offline · sync pending';
      this.retryTimer = setTimeout(() => void this.sync(), 30_000);
    } finally {
      this.changed();
    }
  }
  async leaderboard(game: GameId, difficulty: Difficulty = 'normal') {
    if (!this.adapter) return null;
    return this.adapter.leaderboard(game, difficulty);
  }
  private persist() {
    try { this.storage.setItem(KEY, JSON.stringify(this.data)); this.storageAvailable = true; }
    catch { this.storageAvailable = false; this.status = 'Storage unavailable · session only'; }
    this.changed();
  }
  private changed() { this.dispatchEvent(new Event('change')); }
}
