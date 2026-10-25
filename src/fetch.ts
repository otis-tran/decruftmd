import { HttpError, normalizeTargetUrl } from './ssrf.js';

export { HttpError } from './ssrf.js';
export { normalizeTargetUrl } from './ssrf.js';

type FetchKind = 'html' | 'image';
export interface FetchOptions {
  kind?: FetchKind;
  maxBytes?: number;
}

const DEFAULT_LIMITS: Record<FetchKind, number> = { html: 5 * 1024 * 1024, image: 10 * 1024 * 1024 };
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const HTML_TYPES: Record<string, true> = { 'text/html': true, 'application/xhtml+xml': true };
const IMAGE_TYPES: Record<string, true> = {
  'image/avif': true, 'image/gif': true, 'image/jpeg': true, 'image/png': true, 'image/webp': true,
};

export async function fetchBounded(
  input: URL,
  options: FetchOptions = {},
): Promise<{ bytes: Uint8Array; url: URL; contentType: string }> {
  const kind = options.kind ?? 'html';
  const maxBytes = options.maxBytes ?? DEFAULT_LIMITS[kind];
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('maxBytes must be a positive safe integer');

  let target = normalizeTargetUrl(input.href);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let redirects = 0; ; redirects++) {
      let response: Response;
      try {
        response = await fetch(target, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 (compatible; decruftmd/1.0; +https://github.com/otis-tran/decruftmd)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
          },
        });
      } catch (error) {
        if (controller.signal.aborted) throw new HttpError(504, 'fetch_timeout', 'Upstream request timed out');
        throw new HttpError(502, 'fetch_failed', 'Unable to fetch upstream resource');
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= MAX_REDIRECTS) throw new HttpError(502, 'too_many_redirects', 'Upstream redirect limit exceeded');
        const location = response.headers.get('location');
        if (!location) throw new HttpError(502, 'invalid_redirect', 'Upstream redirect is missing a location');
        let redirected: URL;
        await response.body?.cancel();
        try {
          redirected = new URL(location, target);
        } catch {
          throw new HttpError(502, 'invalid_redirect', 'Upstream returned an invalid redirect');
        }
        target = normalizeTargetUrl(redirected.href);
        continue;
      }
      if (!response.ok) throw new HttpError(502, 'upstream_error', `Upstream returned HTTP ${response.status}`);

      const contentType = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
      const allowed = kind === 'html' ? HTML_TYPES : IMAGE_TYPES;
      if (!allowed[contentType]) throw new HttpError(415, 'unsupported_media_type', 'Upstream returned an unsupported media type');
      const declaredLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        await response.body?.cancel();
        throw new HttpError(413, 'response_too_large', 'Upstream response exceeds the size limit');
      }
      if (!response.body) throw new HttpError(502, 'empty_response', 'Upstream response has no body');

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel();
            throw new HttpError(413, 'response_too_large', 'Upstream response exceeds the size limit');
          }
          chunks.push(value);
        }
      } catch (error) {
        if (error instanceof HttpError) throw error;
        if (controller.signal.aborted) throw new HttpError(504, 'fetch_timeout', 'Upstream request timed out');
        throw new HttpError(502, 'fetch_failed', 'Unable to read upstream response');
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return { bytes, url: target, contentType };
    }
  } finally {
    clearTimeout(timeout);
  }
}
