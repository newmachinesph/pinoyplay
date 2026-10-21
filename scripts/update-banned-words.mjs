// Rebuilds src/server/banned-words.json from LDNOOBW (CC BY 4.0, pinned commit) plus banned-extra.txt.
// node scripts/update-banned-words.mjs
import { readFile, writeFile } from 'node:fs/promises';

const COMMIT = '5faf2ba42d7b1c0977169ec3611df25a3c08eb13';
const LANGUAGES = ['ar', 'cs', 'da', 'de', 'en', 'eo', 'es', 'fa', 'fi', 'fil', 'fr', 'fr-CA-u-sd-caqc', 'hi', 'hu', 'it', 'ja', 'kab', 'ko', 'nl', 'no', 'pl', 'pt', 'ru', 'sv', 'th', 'tr', 'zh'];
const base = `https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/${COMMIT}`;

const lines = text => text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const terms = new Set();
for (const lang of LANGUAGES) {
  const response = await fetch(`${base}/${lang}`);
  if (!response.ok) throw new Error(`${lang}: HTTP ${response.status}`);
  lines(await response.text()).forEach(t => terms.add(t));
}
const extra = lines(await readFile('src/server/banned-extra.txt', 'utf8'));
extra.forEach(t => terms.add(t));
await writeFile('src/server/banned-words.json', JSON.stringify({
  source: `LDNOOBW List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words @ ${COMMIT} (CC BY 4.0, Shutterstock, Inc.) + src/server/banned-extra.txt`,
  terms: [...terms].sort(),
}, null, 1) + '\n');
console.log(`${terms.size} terms (${extra.length} project additions)`);
