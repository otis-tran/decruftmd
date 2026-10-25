import type { MiddlewareHandler } from 'hono';
import type { Env } from './service';

/** One owner-held key; no user DB, scopes, or session semantics. */
export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (c.req.path === '/') return next();
  const expected = c.env?.API_KEY;
  if (!expected) return c.json({ error: { code: 'auth_unavailable', message: 'API key is not configured' } }, 503);

  const header = c.req.header('Authorization');
  const match = /^Bearer ([^\s]+)$/.exec(header ?? '');
  if (!match) return c.json({ error: { code: 'unauthorized', message: 'Authorization: Bearer token required' } }, 401, { 'WWW-Authenticate': 'Bearer' });

  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(match[1])),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const provided = new Uint8Array(providedHash);
  const actual = new Uint8Array(expectedHash);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= provided[i] ^ actual[i];
  if (difference !== 0) return c.json({ error: { code: 'unauthorized', message: 'Invalid API key' } }, 401, { 'WWW-Authenticate': 'Bearer' });
  await next();
};
