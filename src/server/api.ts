import { createHash, timingSafeEqual } from 'node:crypto';
import type mysql from 'mysql2/promise';
import { gameIds, type GameId } from '../catalog';
import { isDifficulty, type Difficulty } from '../core/difficulty';
import { cleanUsername, reviewName } from './names';
import { verdictCache } from './db';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type NameStatus = 'pending' | 'approved' | 'rejected';
export type Device = { id: string; secret: string };
export type ScoreInput = Device & { game: GameId; difficulty: Difficulty; score: number };

// crypto.randomUUID() or 32 hex characters from the client's makeDeviceId.
const DEVICE_ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i;
const SECRET = /^[0-9a-f]{64}$/;
// shortcut: one ceiling for every game; replace with per-game limits if implausible scores show up.
export const MAX_SCORE = 10_000_000;

const record = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
  return body as Record<string, unknown>;
};

export function parseDevice(raw: unknown): Device {
  const body = record(raw);
  if (typeof body.id !== 'string' || !DEVICE_ID.test(body.id)) throw new HttpError(400, 'Invalid device id');
  if (typeof body.secret !== 'string' || !SECRET.test(body.secret)) throw new HttpError(400, 'Invalid device secret');
  return { id: body.id.toLowerCase(), secret: body.secret };
}

export function parseScore(raw: unknown): ScoreInput {
  const device = parseDevice(raw), body = record(raw);
  if (typeof body.game !== 'string' || !gameIds.includes(body.game as GameId)) throw new HttpError(400, 'Unknown game');
  if (!isDifficulty(body.difficulty)) throw new HttpError(400, 'Unknown difficulty');
  if (typeof body.score !== 'number' || !Number.isSafeInteger(body.score) || body.score < 0 || body.score > MAX_SCORE) throw new HttpError(400, 'Invalid score');
  return { ...device, game: body.game as GameId, difficulty: body.difficulty, score: body.score };
}

export function parseBoard(params: URLSearchParams): { game: GameId; difficulty: Difficulty } {
  const game = params.get('game'), difficulty = params.get('difficulty') ?? 'normal';
  if (!game || !gameIds.includes(game as GameId)) throw new HttpError(400, 'Unknown game');
  if (!isDifficulty(difficulty)) throw new HttpError(400, 'Unknown difficulty');
  return { game: game as GameId, difficulty };
}

/** Names are public only once approved; everyone else is an anonymous kalaro. */
export const publicName = (status: NameStatus, username: string, id: string) =>
  status === 'approved' ? username : `Kalaro #${id.replace(/-/g, '').slice(-4).toUpperCase()}`;

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest();

// shortcut: in-memory fixed windows suit one server instance; move to MySQL or Redis when scaled out.
const windows = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const w = windows.get(key);
  if (!w || w.reset <= now) {
    if (windows.size > 10_000) for (const [k, v] of windows) if (v.reset <= now) windows.delete(k);
    windows.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++w.count > limit) throw new HttpError(429, 'Too many requests, try again later');
}

type PlayerRow = mysql.RowDataPacket & { secret_hash: Buffer; username: string; name_status: NameStatus };

async function findPlayer(pool: mysql.Pool, device: Device): Promise<PlayerRow | null> {
  const [rows] = await pool.execute<PlayerRow[]>('SELECT secret_hash, username, name_status FROM players WHERE id = ?', [device.id]);
  const row = rows[0];
  if (row && !timingSafeEqual(Buffer.from(row.secret_hash), hashSecret(device.secret))) throw new HttpError(403, 'This device id belongs to another player');
  return row ?? null;
}

/** Registers the device on first use and (re)reviews its name when it changed or is still pending. */
export async function registerPlayer(pool: mysql.Pool, raw: unknown) {
  const device = parseDevice(raw);
  const username = cleanUsername(record(raw).username);
  if (!username) throw new HttpError(400, 'Use 2-20 letters, numbers, spaces, _ or -');
  const existing = await findPlayer(pool, device);
  if (existing && existing.username === username && existing.name_status !== 'pending')
    return { status: existing.name_status, displayName: publicName(existing.name_status, username, device.id) };
  rateLimit(`name:${device.id}`, 5, 3_600_000);
  const verdict = await reviewName(username, verdictCache(pool));
  const status: NameStatus = verdict === null ? 'pending' : verdict.allowed ? 'approved' : 'rejected';
  if (existing) await pool.execute('UPDATE players SET username = ?, name_status = ? WHERE id = ?', [username, status, device.id]);
  else {
    try {
      await pool.execute('INSERT INTO players (id, secret_hash, username, name_status) VALUES (?, ?, ?, ?)', [device.id, hashSecret(device.secret), username, status]);
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Registration already in progress, retry');
      throw error;
    }
  }
  return { status, displayName: publicName(status, username, device.id) };
}

/** Keeps the best score per player, game and difficulty, so retries never inflate a result. */
export async function submitScore(pool: mysql.Pool, raw: unknown) {
  const s = parseScore(raw);
  if (!await findPlayer(pool, s)) throw new HttpError(404, 'Register the player first');
  await pool.execute(
    // Value repeated instead of a row alias: works on MySQL 8+/9 and MariaDB (Hostinger) alike.
    'INSERT INTO scores (player_id, game, difficulty, score) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = GREATEST(score, ?)',
    [s.id, s.game, s.difficulty, s.score, s.score]);
  return { ok: true };
}

type BoardRow = mysql.RowDataPacket & { id: string; username: string; name_status: NameStatus; score: number };

export async function topScores(pool: mysql.Pool, game: GameId, difficulty: Difficulty) {
  // LIMIT is a literal: mysql2 prepared statements reject a bound LIMIT parameter.
  const [rows] = await pool.execute<BoardRow[]>(
    'SELECT p.id, p.username, p.name_status, s.score FROM scores s JOIN players p ON p.id = s.player_id WHERE s.game = ? AND s.difficulty = ? ORDER BY s.score DESC, s.updated_at ASC LIMIT 10',
    [game, difficulty]);
  return rows.map((r, i) => ({ rank: i + 1, username: publicName(r.name_status, r.username, r.id), score: Number(r.score) }));
}

const MAX_BODY = 2048;
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'Request too large');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON'); }
}

export const clientIp = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';

/** JSON error envelope; database outages become 503 so the game keeps scores queued offline. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error('API error', error instanceof Error ? error.message : error);
  return Response.json({ error: 'Scores are unavailable right now' }, { status: 503 });
}
