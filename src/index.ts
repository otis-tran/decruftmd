import { Hono } from 'hono';
import { convertUrl, type Env } from './service';
import { HttpError } from './ssrf';
import { handleMcp } from './mcp';
import { requireApiKey } from './auth';
import { renderConsentPage } from './oauth-consent';
import { verifyKeyConstantTime } from './auth';
import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface ExtendedEnv extends Env {
  OAUTH_PROVIDER?: OAuthHelpers;
}

const app = new Hono<{ Bindings: ExtendedEnv }>();
app.use('*', requireApiKey);

app.get('/', (c) => c.text('decruftmd — GET /https://example.com or POST /api/convert'));

app.post('/api/convert', async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json() as Record<string, unknown>; }
  catch { return c.json({ error: { code: 'invalid_json', message: 'Expected JSON body' } }, 400); }
  if (!body || typeof body.url !== 'string' || (body.analyze_images !== undefined && typeof body.analyze_images !== 'boolean') || (body.max_images !== undefined && (!Number.isInteger(body.max_images) || Number(body.max_images) < 0 || Number(body.max_images) > 3))) {
    return c.json({ error: { code: 'invalid_request', message: 'Expected url, optional analyze_images and max_images (0–3)' } }, 400);
  }
  try {
    const result = await convertUrl(body.url, c.env, body.analyze_images === true, body.max_images as number | undefined);
    return c.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 502;
    return c.json({ error: { code: error instanceof HttpError ? error.code : 'conversion_failed', message: error instanceof Error ? error.message : 'Conversion failed' } }, status as 400);
  }
});

app.get('/oauth/authorize', async (c) => {
  if (!c.env?.OAUTH_PROVIDER) return c.text('OAuth Provider is not bound', 503);
  let authRequest;
  try {
    authRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (err: unknown) {
    return c.text(err instanceof Error ? err.message : 'Invalid authorization request', 400);
  }
  const client = await c.env.OAUTH_PROVIDER.lookupClient(authRequest.clientId);
  const clientName = client?.clientName || 'ChatGPT';
  const { handle, headers } = await c.env.OAUTH_PROVIDER.beginConsent(authRequest);
  headers.forEach((val, key) => c.header(key, val, { append: true }));
  return c.html(renderConsentPage({ clientName, clientUri: client?.clientUri, state: handle }));
});

app.post('/oauth/authorize', async (c) => {
  if (!c.env?.OAUTH_PROVIDER) return c.text('OAuth Provider is not bound', 503);
  const body = await c.req.parseBody();
  const decision = body.decision;
  const state = String(body.state || '');
  const apiKey = String(body.api_key || '').trim();

  if (decision !== 'allow') {
    try {
      const denied = await c.env.OAUTH_PROVIDER.denyConsent(c.req.raw, state);
      denied.headers.forEach((val, key) => c.header(key, val, { append: true }));
      return c.redirect(denied.redirectTo);
    } catch {
      return c.text('Authorization request expired', 400);
    }
  }

  const isValid = await verifyKeyConstantTime(apiKey, c.env.API_KEY);
  if (!isValid) {
    return c.html(renderConsentPage({
      clientName: 'AI Client',
      state,
      error: 'Invalid API Key. Please enter the master decruftmd API Key to approve.',
    }), 401);
  }

  try {
    const approved = await c.env.OAUTH_PROVIDER.approveConsent(c.req.raw, state);
    const client = await c.env.OAUTH_PROVIDER.lookupClient(approved.request.clientId);
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: approved.request,
      userId: 'owner',
      metadata: { clientName: client?.clientName || 'ChatGPT', grantedAt: Date.now() },
      scope: ['read_url'],
      props: { userId: 'owner', scope: 'read_url' },
    });
    approved.headers.forEach((val, key) => c.header(key, val, { append: true }));
    return c.redirect(redirectTo);
  } catch (err: unknown) {
    return c.text(err instanceof Error ? err.message : 'Consent completion failed', 400);
  }
});

app.all('/mcp', async (c) => handleMcp(c.req.raw, c.env));

app.get('/*', async (c) => {
  const address = new URL(c.req.url);
  let target: string;
  try { target = decodeURIComponent(address.pathname.slice(1)); }
  catch { return c.text('Invalid URL encoding', 400); }
  if (!/^https?:\/\//i.test(target)) return c.text('Not found', 404);
  const analyze = address.searchParams.get('images') === 'true';
  address.searchParams.delete('images');
  const query = address.searchParams.toString();
  try {
    const result = await convertUrl(target + (query ? (target.includes('?') ? '&' : '?') + query : ''), c.env, analyze);
    return c.text(result.markdown, 200, { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Cache': result.cached ? 'HIT' : 'MISS' });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 502;
    return c.text(error instanceof Error ? error.message : 'Conversion failed', status as 400);
  }
});

export default app;
