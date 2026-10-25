import { getEncoding } from 'js-tiktoken';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const target = process.argv[2];
const endpoint = process.argv[3] ?? 'http://127.0.0.1:8787';
if (!target || !/^https?:\/\//.test(target)) {
  console.error('Usage: npm run compare -- <public-url> [local-worker-base-url]');
  process.exit(2);
}
const rawResponse = await fetch(target, { redirect: 'follow', headers: { Accept: 'text/html' } });
if (!rawResponse.ok) throw new Error(`Raw fetch failed: HTTP ${rawResponse.status}`);
const raw = await rawResponse.text();
const token = process.env.API_KEY;
const convertedResponse = await fetch(`${endpoint}/api/convert`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ url: target }),
});
if (!convertedResponse.ok) throw new Error(`Conversion failed: HTTP ${convertedResponse.status} ${await convertedResponse.text()}`);
const converted = await convertedResponse.json() as { markdown: string; cached: boolean };
const markdown = converted.markdown;
const encoder = getEncoding('cl100k_base');
const rawTokens = encoder.encode(raw).length;
const cleanTokens = encoder.encode(markdown).length;
const bytes = new TextEncoder();
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/raw.html', raw);
await writeFile('artifacts/clean.md', markdown);
console.log(JSON.stringify({
  url: target, fetched_at: new Date().toISOString(), tokenizer: 'js-tiktoken cl100k_base',
  raw_bytes: bytes.encode(raw).length, clean_bytes: bytes.encode(markdown).length,
  raw_tokens: rawTokens, clean_tokens: cleanTokens, tokens_saved: rawTokens - cleanTokens,
  savings_percent: rawTokens ? Math.round((rawTokens - cleanTokens) * 10000 / rawTokens) / 100 : null,
  raw_sha256: createHash('sha256').update(raw).digest('hex'),
  clean_sha256: createHash('sha256').update(markdown).digest('hex'),
  cached: converted.cached, raw_output: 'artifacts/raw.html', clean_output: 'artifacts/clean.md',
}, null, 2));
