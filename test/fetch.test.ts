import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBounded, HttpError } from '../src/fetch.js';

afterEach(() => vi.unstubAllGlobals());
const html = (body: string, headers: Record<string, string> = {}) => new Response(body, {
  headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
});

describe('fetchBounded', () => {
  it('validates every redirect destination before requesting it', async () => {
    const mock = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } }));
    vi.stubGlobal('fetch', mock);
    await expect(fetchBounded(new URL('https://example.com/'))).rejects.toMatchObject({ code: 'blocked_target' });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('limits redirect loops', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: URL | RequestInfo) => new Response(null, {
      status: 302, headers: { location: new URL(input.toString()).href },
    })));
    await expect(fetchBounded(new URL('https://example.com/'))).rejects.toMatchObject({ code: 'too_many_redirects' });
  });

  it('rejects a declared oversized body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => html('x', { 'content-length': '100' })));
    await expect(fetchBounded(new URL('https://example.com/'), { maxBytes: 10 })).rejects.toBeInstanceOf(HttpError);
  });

  it('bounds streamed data even without content-length', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)); controller.close(); },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { headers: { 'content-type': 'text/html' } })));
    await expect(fetchBounded(new URL('https://example.com/'), { maxBytes: 10 })).rejects.toMatchObject({ code: 'response_too_large' });
  });

  it('checks MIME type', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { headers: { 'content-type': 'text/plain' } })));
    await expect(fetchBounded(new URL('https://example.com/'))).rejects.toMatchObject({ status: 415 });
  });
});
