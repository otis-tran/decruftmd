# Release readiness — personal-use project

Current intent: use the Worker privately. Local-only use does not require public rate limits or a custom domain. A reachable `workers.dev` endpoint is public unless separately protected; being its only intended user does not restrict access.

## Observed

- `cf deploy --dry-run` built the Worker but reported **No bindings found** without binding environment variables. No remote deployment or KV provisioning has been performed.
- `CLOUDFLARE_AI_ENABLED=true cf dev` started a local Worker with a remote AI binding. Before agreement, the Android Developers blog image returned `images_analyzed: 0`, despite the image itself fetching as `image/png` (~92 KB). Direct `cf ai run` identified model agreement code 5016.
- At the account owner's explicit request, `cf ai run @cf/meta/llama-3.2-11b-vision-instruct --prompt agree` returned “Thank you for agreeing … You may now use the model” (its CLI exit status remained 403 for that special agreement request). A subsequent local REST call returned `images_analyzed: 1` and a Visual Context block. This is remote inference and may consume quota.
- The live check exposed image context being inserted inside a linked Markdown image. `src/vision.ts` now inserts after the complete link; regression test and another local Vision call confirmed the link remains intact. Model-generated descriptions may still be inaccurate; do not treat them as verified OCR.

## TODO before using AI routinely

- [x] Account owner requested and completed the model agreement; local remote-binding inference produced a Visual Context block.
- [ ] Inspect a few representative diagram/OCR outputs for factual accuracy and quota usage. Text conversion must continue to work when the model is unavailable.

## TODO before deployment

- [x] Personal Bearer authentication implemented in `src/auth.ts` and enforced across REST, Direct URL and MCP. Missing/invalid keys return 401 without upstream fetch; unset key fails closed with 503.
- [ ] Verify an effective egress policy against DNS rebinding before accepting arbitrary public URLs. Hostname and redirect filtering in `src/ssrf.ts` and `src/fetch.ts` is not a complete network boundary.
- [ ] Provision KV only when needed and set `CLOUDFLARE_KV_NAMESPACE_ID`; verify `cf deploy --dry-run` shows `CACHE` and, when enabled, `AI` bindings. No production resource has been created.
- [ ] Resolve the blueprint's outdated deployment snippets: `BLUEPRINT.md` remains the original SSOT artifact, while `cloudflare.config.ts` and `README.md` own actual `cf`-based commands. Record any deliberate spec deviations before release.
- [ ] Run typecheck, tests, local API/MCP smoke and dry-run; write a rollback procedure for the chosen deployment target and measure hosted latency rather than using blueprint estimates.

Code layout is adequate for this small service: `src/ssrf.ts` + `fetch.ts` own outbound requests, `extractor.ts` + `vision.ts` own content, `service.ts` owns conversion/cache, `index.ts` + `mcp.ts` expose it, `scripts/` holds comparison tooling, and `test/` tracks behavior. No reorganization is required before personal local use. Keep generated `.cloudflare/` and raw captures under ignored `artifacts/` out of Git.
