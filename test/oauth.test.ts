import { describe, expect, it } from 'vitest';
import worker from '../src/worker';

describe('OAuth 2.1 Server Metadata & Consent Flow', () => {
  const env = {
    API_KEY: 'test-secret-key-123',
    PUBLIC_URL: 'https://example.com',
  };

  it('serves authorization server discovery metadata at /.well-known/oauth-authorization-server', async () => {
    const res = await worker.fetch(
      new Request('https://example.com/.well-known/oauth-authorization-server'),
      env,
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.issuer).toBe('https://example.com');
    expect(data.authorization_endpoint).toBe('https://example.com/oauth/authorize');
    expect(data.token_endpoint).toBe('https://example.com/oauth/token');
    expect(data.registration_endpoint).toBe('https://example.com/oauth/register');
  });

  it('serves protected resource metadata at /.well-known/oauth-protected-resource/mcp', async () => {
    const res = await worker.fetch(
      new Request('https://example.com/.well-known/oauth-protected-resource/mcp'),
      env,
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.resource).toBe('https://example.com/mcp');
    expect(data.scopes_supported).toContain('read_url');
  });

  it('allows direct MCP call with master static API_KEY even without OAuth token', async () => {
    const req = new Request('https://example.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-secret-key-123',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    const res = await worker.fetch(req, env, {} as ExecutionContext);
    expect(res.status).toBe(200);
    const data = await res.json() as { result: { tools: { name: string }[] } };
    expect(data.result.tools[0].name).toBe('read_url');
  });
});
