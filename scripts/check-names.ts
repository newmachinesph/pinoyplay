// Runs names through the real AI review (uses OPENAI_API_KEY; does not touch the database).
// npx tsx --env-file=.env.local scripts/check-names.ts [name ...]
import { askModel, normalizeName } from '../src/server/names.ts';

const clean = ['Juan Dela Cruz', 'Maria', 'Kalaro99', 'Pitik', 'Dikit', 'Scunthorpe', 'Ñiño_23', 'Pedro Penduko', 'Lola Basyang', 'Ate Girl'];
const bad = ['Putangina', 'Tng1na M0', 'G@go ka', 'Kantot', 'Pekpek', 'Burat69', 'Yawa ka', 'Fuck You', 'Bitch', 'Jakolero', 'ちんこ', 'p u t a'];
const names = process.argv.slice(2);
const cases = names.length ? names.map(name => [name, undefined] as const)
  : [...clean.map(n => [n, true] as const), ...bad.map(n => [n, false] as const)];

let wrong = 0;
for (const [name, expected] of cases) {
  const v = await askModel(name, normalizeName(name));
  const mark = v === null ? 'UNAVAILABLE' : expected === undefined ? '' : v.allowed === expected ? 'ok' : 'MISMATCH';
  if (mark === 'MISMATCH' || mark === 'UNAVAILABLE') wrong++;
  console.log(`${mark.padEnd(11)} ${v === null ? '-' : v.allowed ? 'allowed ' : 'rejected'}  ${name.padEnd(16)} ${v?.reason ?? ''}`);
}
if (wrong) process.exitCode = 1;
