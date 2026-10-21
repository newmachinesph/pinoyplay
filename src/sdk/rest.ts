import type { DevicePlayer, GameId, NameStatus, OnlineAdapter, RankedScore, Score } from './index';
import type { Difficulty } from '../core/difficulty';

/** Talks to the Next.js routes in app/api. Errors keep scores queued; a 400 means the server will never accept it. */
export class RestAdapter implements OnlineAdapter {
  private player?: DevicePlayer;

  async connect(player: DevicePlayer): Promise<NameStatus> {
    const body = await call<{ status: NameStatus }>('/api/players', { id: player.id, secret: player.secret, username: player.username });
    this.player = player;
    return body.status;
  }

  async submit(score: Score): Promise<void> {
    if (!this.player) throw new Error('Not connected');
    await call('/api/scores', { id: this.player.id, secret: this.player.secret, game: score.game, difficulty: score.difficulty ?? 'normal', score: score.score });
  }

  async leaderboard(game: GameId, difficulty: Difficulty = 'normal'): Promise<RankedScore[]> {
    const body = await call<{ scores: RankedScore[] }>(`/api/leaderboard?game=${encodeURIComponent(game)}&difficulty=${difficulty}`);
    return body.scores;
  }
}

async function call<T>(url: string, payload?: unknown): Promise<T> {
  const response = await fetch(url, payload === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw Object.assign(new Error(body.error ?? `HTTP ${response.status}`), { permanent: response.status === 400 });
  return body;
}
