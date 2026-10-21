import mysql from 'mysql2/promise';
import type { Verdict, VerdictCache } from './names';

const g = globalThis as { pinoyplayPool?: mysql.Pool };

/** Shared pool (kept on globalThis so dev reloads reuse it). Throws when DATABASE_URL is missing. */
export function db(): mysql.Pool {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not set');
  g.pinoyplayPool ??= mysql.createPool({ uri, connectionLimit: 5, charset: 'utf8mb4' });
  return g.pinoyplayPool;
}

/** name_reviews table as the verdict cache. */
export const verdictCache = (pool: mysql.Pool): VerdictCache => ({
  async get(normalized) {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT allowed, reason, model FROM name_reviews WHERE normalized = ?', [normalized]);
    return rows[0] ? { allowed: !!rows[0].allowed, reason: rows[0].reason, model: rows[0].model } as Verdict : null;
  },
  async set(normalized, v) {
    await pool.execute('INSERT INTO name_reviews (normalized, allowed, reason, model) VALUES (?, ?, ?, ?) AS v ON DUPLICATE KEY UPDATE allowed = v.allowed, reason = v.reason, model = v.model, reviewed_at = CURRENT_TIMESTAMP',
      [normalized, v.allowed ? 1 : 0, v.reason, v.model]);
  },
});
