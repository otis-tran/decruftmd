import type { MiddlewareHandler } from 'hono';
import type { Env } from './service';

export async function verifyKeyConstantTime(provided: string, expected?: string): Promise<boolean> {
  if (!expected || !provided) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const p = new Uint8Array(providedHash);
  const a = new Uint8Array(expectedHash);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= p[i] ^ a[i];
  return difference === 0;
}

/** One owner-held key; no user DB, scopes, or session semantics. */
export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (c.req.path === '/' || c.req.path.startsWith('/oauth/') || c.req.path.startsWith('/.well-known/')) return next();
  const expected = c.env?.API_KEY;
  if (!expected) return c.json({ error: { code: 'auth_unavailable', message: 'API key is not configured' } }, 503);

  const header = c.req.header('Authorization');
  const match = /^Bearer ([^\s]+)$/.exec(header ?? '');
  if (!match) return c.json({ error: { code: 'unauthorized', message: 'Authorization: Bearer token required' } }, 401, { 'WWW-Authenticate': 'Bearer' });

  const valid = await verifyKeyConstantTime(match[1], expected);
  if (!valid) return c.json({ error: { code: 'unauthorized', message: 'Invalid API key' } }, 401, { 'WWW-Authenticate': 'Bearer' });
  await next();
};
