import OAuthProvider, { type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import app from './index';
import { handleMcp } from './mcp';
import { renderConsentPage } from './oauth-consent';
import { verifyKeyConstantTime } from './auth';
import type { Env } from './service';

export interface OAuthEnv extends Env {
  OAUTH_PROVIDER: OAuthHelpers;
}

let provider: OAuthProvider<OAuthEnv> | null = null;
let currentPublicUrl = '';

function getOAuthProvider(publicUrl: string): OAuthProvider<OAuthEnv> {
  if (!provider || currentPublicUrl !== publicUrl) {
    provider = new OAuthProvider<OAuthEnv>({
      apiRoute: '/mcp',
      apiHandler: {
        async fetch(request: Request, env: OAuthEnv) {
          // Token has already been validated by OAuthProvider
          return handleMcp(request, env);
        },
      },
      defaultHandler: {
        fetch(request: Request, env: OAuthEnv, ctx: ExecutionContext) {
          return app.fetch(request, env, ctx);
        },
      },
      authorizeEndpoint: '/oauth/authorize',
      tokenEndpoint: '/oauth/token',
      clientRegistrationEndpoint: '/oauth/register',
      scopesSupported: ['read_url'],
      accessTokenTTL: 3600,
      refreshTokenTTL: 60 * 60 * 24 * 30, // 30 days
      resourceMetadata: {
        resource: `${publicUrl}/mcp`,
        scopes_supported: ['read_url'],
      },
    });
    currentPublicUrl = publicUrl;
  }
  return provider;
}

// OAuth endpoints (/oauth/authorize) are registered directly on Hono app

// ─── Worker Default Export ──────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.PUBLIC_URL || url.origin;

    // Check if the request is directly presenting the master static API_KEY to /mcp
    if (url.pathname === '/mcp') {
      const auth = request.headers.get('authorization') ?? '';
      const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
      if (token && env.API_KEY && (await verifyKeyConstantTime(token, env.API_KEY))) {
        return handleMcp(request, env);
      }
    }

    const oauth = getOAuthProvider(origin);
    return oauth.fetch(request, env as unknown as OAuthEnv, ctx);
  },
};
