import { normalizeTargetUrl } from './ssrf';
import { fetchBounded } from './fetch';
import { extractReadableContent } from './extractor';
import { enrichImages } from './vision';

export interface Env {
  API_KEY?: string;
  CACHE?: KVNamespace;
  OAUTH_KV?: KVNamespace;
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  PUBLIC_URL?: string;
}

export interface Conversion {
  markdown: string;
  title: string;
  domain: string;
  word_count: number;
  images_analyzed: number;
  cached: boolean;
}

function yamlString(text: string): string {
  return JSON.stringify(text.replace(/[\r\n]+/g, ' ').trim());
}

export async function convertUrl(raw: string, env: Env, analyzeImages = false, requestedMaxImages = 3): Promise<Conversion> {
  const url = normalizeTargetUrl(raw);
  const maxImages = analyzeImages ? Math.min(3, Math.max(0, requestedMaxImages)) : 0;
  const keyInput = `v1:${url.href}:${maxImages}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyInput));
  const key = 'md:' + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  if (env.CACHE) {
    const cached = await env.CACHE.get(key, 'json') as Omit<Conversion, 'cached'> | null;
    if (cached) return { ...cached, cached: true };
  }
  const fetched = await fetchBounded(url, { kind: 'html' });
  const html = new TextDecoder().decode(fetched.bytes);
  const extracted = await extractReadableContent(html, fetched.url.href);
  const enriched = maxImages > 0 ? await enrichImages(extracted.markdown, fetched.url.href, env.AI, maxImages) : { markdown: extracted.markdown, imagesAnalyzed: 0 };
  const markdown = [
    '---',
    `title: ${yamlString(extracted.title)}`,
    `source: ${yamlString(fetched.url.href)}`,
    `domain: ${yamlString(extracted.domain)}`,
    `word_count: ${extracted.wordCount}`,
    `images_analyzed: ${enriched.imagesAnalyzed}`,
    '---', '',
    /(?:^|\n)#\s/.test(enriched.markdown) ? enriched.markdown : `# ${extracted.title.replace(/[\r\n]+/g, ' ')}\n\n${enriched.markdown}`,
  ].join('\n');
  const result = { markdown, title: extracted.title, domain: extracted.domain, word_count: extracted.wordCount, images_analyzed: enriched.imagesAnalyzed };
  if (env.CACHE) await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: 3600 });
  return { ...result, cached: false };
}
