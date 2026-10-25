# decruftmd

Lean web-to-Markdown context service for AI agents. Product scope and API contract: [BLUEPRINT.md](./BLUEPRINT.md). Source inspiration: [digitopvn/anymd](https://github.com/digitopvn/anymd) ([MIT license](https://github.com/digitopvn/anymd/blob/main/LICENSE)); extraction/polyfill, URL normalization and image enrichment patterns were consulted and adapted, not the full application. The blueprint came from the local anymd source repository. This project is not an official anymd service.

## Local development

Requires Node 22.18+, npm and the Cloudflare `cf` CLI. Configure your private key via `API_KEY` in `.dev.vars` (see `.dev.vars.example`) or pass `API_KEY=... CLOUDFLARE_INCLUDE_PROCESS_ENV=true` to `npm run dev`. Run `npm run dev` (`cf dev`, backed by the Cloudflare Vite plugin). Typecheck with `npm run typecheck`; test with `npm test`; build locally with `cf build`. `cloudflare.config.ts` declares the typed `API_KEY` secret. Hosted deployment supplies secrets via `cf deploy --secrets-file <path>`. Local development without `CACHE` recomputes each request; hosted caching requires an actual KV namespace ID in `CLOUDFLARE_KV_NAMESPACE_ID`. Set `CLOUDFLARE_AI_ENABLED=true` to enable Workers AI; otherwise text-only conversion works. No remote resources are provisioned automatically.

**Deployment is blocked pending a verified egress policy.** Hostname and redirect checks reject obvious internal targets, but Cloudflare Workers Fetch has no documented connected-peer IP verification or DNS pinning. A public hostname resolving to an internal address may bypass hostname-only checks; do not expose this as an open public proxy until the platform/account egress restriction is proven. See [Cloudflare's Worker fetch notes](https://developers.cloudflare.com/workers/platform/known-issues/).

Personal-use release checks and verified local Workers AI behavior: [docs/release-readiness.md](./docs/release-readiness.md). `CLOUDFLARE_AI_ENABLED=true npm run dev` connects the local Worker to **remote** Workers AI and may consume account quota.


## Interfaces & Authentication

Every endpoint except the root health check (`GET /`) requires a Bearer token:
`Authorization: Bearer <API_KEY>`. Requests with missing or incorrect keys receive `401 Unauthorized` without fetching upstream resources. If `API_KEY` is unset in the Worker environment, requests fail closed with `503`.

- `GET /https://example.com/article?images=true` returns Markdown with `X-Cache: HIT|MISS`.
- `POST /api/convert` JSON: `{ "url": "https://example.com/article", "analyze_images": false, "max_images": 3 }`. Returns `{ok,cached,title,domain,word_count,markdown,images_analyzed}`.
- `POST /mcp`: JSON-RPC MCP endpoint over HTTP (`initialize`, `ping`, `tools/list`, `tools/call` for `read_url`).
  - **For Desktop AI Clients (Claude Code, Cursor):** Send `Authorization: Bearer <API_KEY>` directly to `POST /mcp`.
  - **For ChatGPT Web (Custom MCP Server):** Select **OAuth** authentication in ChatGPT settings. ChatGPT will automatically discover endpoints at `/.well-known/oauth-authorization-server` and open the popup consent screen at `/oauth/authorize`. Enter your master `API_KEY` to approve the connection.
Only public HTTP(S) URLs with standard ports are accepted. Image analysis is optional; if Workers AI is missing or image processing fails, the text conversion still succeeds. Cache TTL is 3600 seconds when bound.

## Compare tokens for one URL

Start the local Worker, then `npm run compare -- https://example.com`. The script fetches raw HTML and calls the REST converter for the same URL, prints both byte/token counts using `js-tiktoken` `cl100k_base` and saves the **full actual outputs** locally as ignored `artifacts/raw.html` and `artifacts/clean.md`. An observed run, including both bodies, is in [docs/comparison.md](./docs/comparison.md). Savings = raw HTML tokens − Markdown tokens; percentages are not a measure of semantic equivalence or model billing. HTML can change between fetches; the script reports its fetch time and capture hashes. Do not publish scraped full-page captures without permission.
