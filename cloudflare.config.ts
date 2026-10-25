import { bindings, defineConfig } from 'cf/config';

// Set actual Cloudflare resource identifiers before deployment; local dev can omit them.
export default defineConfig({
  worker: {
    name: 'decruftmd',
    entrypoint: './src/worker.ts',
    compatibilityDate: '2026-10-25',
    compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
    env: {
      API_KEY: bindings.secret(),
      CACHE: bindings.kv({ id: 'ebe3915d3c154f6c84af76c5d2db999f' }),
      OAUTH_KV: bindings.kv({ id: 'ebe3915d3c154f6c84af76c5d2db999f' }),
      AI: bindings.ai({ dev: { remote: true } }),
    },
  },
});
