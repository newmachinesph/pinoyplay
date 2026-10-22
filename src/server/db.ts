import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type { Verdict, VerdictCache } from './names';

const g = globalThis as { pinoyplayPool?: mysql.Pool; pinoyplaySchema?: Promise<void> };

/** Shared pool (kept on globalThis so dev reloads reuse it), with the tables ensured on first use. */
export async function db(): Promise<mysql.Pool> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not set');
  const pool = g.pinoyplayPool ??= mysql.createPool({ uri, connectionLimit: 5, charset: 'utf8mb4' });
  // db/schema.sql only uses CREATE TABLE IF NOT EXISTS, so applying it on every start is safe.
  g.pinoyplaySchema ??= applySchema(pool).catch(error => { g.pinoyplaySchema = undefined; throw error; });
  await g.pinoyplaySchema;
  return pool;
}

async function applySchema(pool: mysql.Pool) {
  const sql = await readFile(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');
  for (const statement of sql.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean))
    await pool.query(statement);
}

/** name_reviews table as the verdict cache. */
export const verdictCache = (pool: mysql.Pool): VerdictCache => ({
  async get(normalized) {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT allowed, reason, model FROM name_reviews WHERE normalized = ?', [normalized]);
    return rows[0] ? { allowed: !!rows[0].allowed, reason: rows[0].reason, model: rows[0].model } as Verdict : null;
  },
  async set(normalized, v) {
    await pool.execute('INSERT INTO name_reviews (normalized, allowed, reason, model) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE allowed = ?, reason = ?, model = ?, reviewed_at = CURRENT_TIMESTAMP',
      [normalized, v.allowed ? 1 : 0, v.reason, v.model, v.allowed ? 1 : 0, v.reason, v.model]);
  },
});
