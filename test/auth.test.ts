import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const conversionBody = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://example.org/' }) };
const mcpBody = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) };

describe('private conversion API', () => {
  it.each([
    ['/api/convert', conversionBody],
    ['/https://example.org/', { method: 'GET' }],
    ['/mcp', mcpBody],
  ] as const)('rejects missing and wrong keys at %s without fetching', async (path, init) => {
    globalThis.fetch = vi.fn();
    const absent = await app.request(path, init, { API_KEY: 'owner-secret' });
    expect(absent.status).toBe(401);
    expect(absent.headers.get('www-authenticate')).toBe('Bearer');
    const wrong = await app.request(path, { ...init, headers: { ...('headers' in init ? init.headers : {}), authorization: 'Bearer wrong-key' } }, { API_KEY: 'owner-secret' });
    expect(wrong.status).toBe(401);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fails closed when the binding is absent and preserves the public root health response', async () => {
    const missing = await app.request('/mcp', mcpBody, {});
    expect(missing.status).toBe(503);
    expect((await missing.json() as { error: { code: string } }).error.code).toBe('auth_unavailable');
    const health = await app.request('/', {}, {});
    expect(health.status).toBe(200);
  });

  it('permits an authorized MCP initialize and tool discovery', async () => {
    const env = { API_KEY: 'owner-secret' };
    const headers = { 'content-type': 'application/json', authorization: 'Bearer owner-secret' };
    const init = await app.request('/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }) }, env);
    expect(init.status).toBe(200);
    const list = await app.request('/mcp', { ...mcpBody, headers }, env);
    expect(list.status).toBe(200);
    expect((await list.json() as { result: { tools: { name: string }[] } }).result.tools[0].name).toBe('read_url');
  });
});
