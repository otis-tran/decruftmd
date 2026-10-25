import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index';

const page = '<!doctype html><html><head><title>Sample Article</title></head><body><article><h1>Sample Article</h1><p>An informative article explains a concrete subject with enough detail for extraction.</p></article></body></html>';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('conversion interfaces', () => {
  it('returns identical Markdown and metadata across REST, Direct URL and MCP on cache hits', async () => {
    const values = new Map<string, string>();
    const CACHE = {
      get: vi.fn(async (key: string) => JSON.parse(values.get(key) ?? 'null')),
      put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    } as unknown as KVNamespace;
    globalThis.fetch = vi.fn(async () => new Response(page, { headers: { 'content-type': 'text/html' } }));
    const env = { CACHE, API_KEY: 'local-test-key' };
    const rest = await app.request('/api/convert', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer local-test-key' }, body: JSON.stringify({ url: 'https://example.org/story' }) }, env);
    const first = await rest.json() as { markdown: string; cached: boolean; title: string; word_count: number };
    expect(rest.status).toBe(200);
    expect(first.cached).toBe(false);
    expect(first.title).toBe('Sample Article');
    expect(first.word_count).toBeGreaterThan(5);
    const direct = await app.request('/https://example.org/story', { headers: { authorization: 'Bearer local-test-key' } }, env);
    expect(direct.headers.get('X-Cache')).toBe('HIT');
    expect(await direct.text()).toBe(first.markdown);
    const mcp = await app.request('/mcp', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer local-test-key' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'read_url', arguments: { url: 'https://example.org/story' } } }) }, env);
    const rpc = await mcp.json() as { result: { content: { text: string }[] } };
    expect(rpc.result.content[0].text).toBe(first.markdown);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects private targets without an upstream fetch', async () => {
    globalThis.fetch = vi.fn();
    const response = await app.request('/api/convert', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer local-test-key' }, body: JSON.stringify({ url: 'http://127.0.0.1/' }) }, { API_KEY: 'local-test-key' });
    expect(response.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
