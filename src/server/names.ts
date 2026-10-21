/** Username rules: a free banned-word list first, then the AI review. Server-only: reads OPENAI_API_KEY. */
import banned from './banned-words.json' with { type: 'json' };

export const NAME_PATTERN = /^[\p{L}\p{N}_ -]{2,20}$/u;
export const DEFAULT_NAME_MODEL = 'gpt-6-luna';

/** Trim, NFC and collapse runs of spaces; returns null when the name breaks the 2-20 character rule. */
export function cleanUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  return NAME_PATTERN.test(name) ? name : null;
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i' };

/** Cache key that folds the usual evasions together: case, accents, leetspeak, spacing and separators. */
export function normalizeName(name: string): string {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[0-9@$!]/g, c => LEET[c] ?? c)
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 80);
}

export type Verdict = { allowed: boolean; reason: string; model: string };

// Folded once at load; terms under 3 letters are left to the AI (too many innocent matches).
const BANNED = new Set(banned.terms.map(normalizeName).filter(t => t.length >= 3));

/**
 * Free first pass. Rejects only confident hits: the whole folded name ("p u t a", "Tng1na") or one of
 * its words ("Yawa ka"). A term inside a longer word ("Therapist", "Scunthorpe") returns null and goes
 * to the AI, which reads context, as does everything the list doesn't know.
 */
export function listVerdict(username: string): Verdict | null {
  const folded = normalizeName(username);
  const words = username.split(/[\s_-]+/).map(normalizeName).filter(Boolean);
  const hit = BANNED.has(folded) || words.some(w => BANNED.has(w));
  return hit ? { allowed: false, reason: 'matches the banned-word list', model: 'wordlist' } : null;
}
export interface VerdictCache {
  get(normalized: string): Promise<Verdict | null>;
  set(normalized: string, verdict: Verdict): Promise<void>;
}

const PROMPT = `You review player display names for a family-friendly Filipino mobile game leaderboard.
Reject a name if it contains, hides or strongly implies, in ANY language or script (including Tagalog, Bisaya/Cebuano, Ilocano, Hiligaynon, Taglish, English, Spanish, and others):
- profanity or curse words (e.g. "putangina", "gago", "tangina", "pakyu", "fuck"), including abbreviations like "tngina", "ptngna", "wtf" used as a curse;
- sexual, lewd or genital terms and innuendo (e.g. "kantot", "jakol", "titi", "puke", "pekpek", "burat", "69", "boobs");
- slurs or hate toward a group, harassment of a person, threats, or drug and violence glorification;
- evasions: leetspeak, repeated or swapped letters, spaces, reversed spelling, mixed scripts or homoglyphs.
Allow ordinary names, nicknames and playful names that are clean, including words that only resemble a swear word in another language (e.g. "Pitik", "Dikit", "Buko", "Kalaro", "Scunthorpe"). Judge the whole name, not fragments. When unsure whether a name is lewd or a curse, reject it.
Return a short English reason.`;

const SCHEMA = {
  type: 'object',
  properties: { allowed: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['allowed', 'reason'],
  additionalProperties: false,
};

type Fetch = typeof fetch;

/** Asks OpenAI. Returns null when the review could not be completed (no key, timeout, bad reply): callers fail closed. */
type ModelEnv = Record<string, string | undefined>;
export async function askModel(username: string, normalized: string, env: ModelEnv = process.env, doFetch: Fetch = fetch): Promise<Verdict | null> {
  const key = env.OPENAI_API_KEY;
  if (!key) return null;
  const model = env.OPENAI_NAME_MODEL || DEFAULT_NAME_MODEL;
  try {
    const response = await doFetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{ role: 'system', content: PROMPT }, { role: 'user', content: JSON.stringify({ name: username, folded: normalized }) }],
        text: { format: { type: 'json_schema', name: 'username_review', schema: SCHEMA, strict: true } },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error('Name review failed', response.status);
      return null;
    }
    const body = await response.json() as { status?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
    if (body.status && body.status !== 'completed') return null;
    const message = body.output?.find(item => item.type === 'message');
    const part = message?.content?.find(c => c.type === 'output_text' || c.type === 'refusal');
    // A refusal means the model would not even discuss the name: treat it as rejected.
    if (part?.type === 'refusal') return { allowed: false, reason: 'refused by reviewer', model };
    const parsed: unknown = JSON.parse(part?.text ?? 'null');
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as Verdict).allowed !== 'boolean') return null;
    const reason = String((parsed as Verdict).reason ?? '').slice(0, 200);
    return { allowed: (parsed as Verdict).allowed, reason, model };
  } catch (error) {
    console.error('Name review unavailable', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Word list first (free), then the cached AI review: each distinct folded name costs at most one AI call. null = pending (fail closed). */
export async function reviewName(username: string, cache: VerdictCache, ask = askModel): Promise<Verdict | null> {
  const listed = listVerdict(username);
  if (listed) return listed;
  const normalized = normalizeName(username);
  const cached = await cache.get(normalized);
  if (cached) return cached;
  const verdict = await ask(username, normalized);
  if (verdict) await cache.set(normalized, verdict);
  return verdict;
}
