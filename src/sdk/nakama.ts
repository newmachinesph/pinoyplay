import { Client, type Session } from '@heroiclabs/nakama-js';
import type { GameId, OnlineAdapter, Player, RankedScore, Score } from './index';
import { boardId } from './index';
import type { Difficulty } from '../core/difficulty';

/** Anonymous device identity works without making sign-in a condition of play. */
export class NakamaAdapter implements OnlineAdapter {
  private client: Client;
  private session?: Session;
  private username = '';
  private connecting?: Promise<void>;
  constructor(url: string, serverKey: string) {
    const target = new URL(url);
    this.client = new Client(serverKey, target.hostname, target.port || (target.protocol === 'https:' ? '443' : '80'), target.protocol === 'https:', 8000, false);
  }
  async connect(player: Player) {
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      if (!this.session || this.session.isexpired(Date.now() / 1000 + 60))
        this.session = await this.client.authenticateDevice(player.id, true);
      if (this.username !== player.username) {
        await this.client.updateAccount(this.session, { display_name: player.username });
        this.username = player.username;
      }
    })();
    try { await this.connecting; } finally { this.connecting = undefined; }
  }
  async submit(score: Score) {
    if (!this.session) throw new Error('Not connected');
    // Server uses "best": retrying a result cannot inflate a player's score.
    await this.client.writeLeaderboardRecord(this.session, boardId(score.game, score.difficulty), {
      score: String(score.score), metadata: { displayName: this.username, runId: score.id, difficulty: score.difficulty ?? 'normal', clientReported: true },
    });
  }
  async leaderboard(game: GameId, difficulty: Difficulty = 'normal'): Promise<RankedScore[]> {
    if (!this.session) throw new Error('Not connected');
    const result = await this.client.listLeaderboardRecords(this.session, boardId(game, difficulty), undefined, 10);
    return (result.records ?? []).map(r => ({
      rank: Number(r.rank), username: String((r.metadata as { displayName?: string })?.displayName ?? r.username ?? 'Kalaro'), score: Number(r.score),
    }));
  }
}
