import { bindings, defineConfig } from 'cf/config';

// Set actual Cloudflare resource identifiers before deployment; local dev can omit them.
export default defineConfig({
  worker: {
    name: 'decruftmd',
    entrypoint: './src/index.ts',
    compatibilityDate: '2026-10-25',
    compatibilityFlags: ['nodejs_compat'],
    env: {
      API_KEY: bindings.secret(),
      CACHE: bindings.kv({ id: 'ebe3915d3c154f6c84af76c5d2db999f' }),
      AI: bindings.ai({ dev: { remote: true } }),
    },
  },
});
