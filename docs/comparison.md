# Same-URL comparison: https://example.com

Measured locally on 2026-10-25 at 14:25:39 UTC using `npm run compare -- https://example.com http://localhost:8788`. Raw fetched separately from the Worker conversion, so upstream content could change between requests. Tokenizer: `js-tiktoken` `cl100k_base` on full UTF-8 bodies. This example has no image enrichment or shared KV binding (`cached: false`).

| Output | UTF-8 bytes | Tokens |
|---|---:|---:|
| Unprocessed HTML | 577 | 151 |
| decruftmd Markdown | 294 | 67 |
| Difference | 283 | 84 |

Savings: `(151 − 67) / 151 × 100 = 55.63%`. HTML-to-Markdown is not a like-for-like semantic compression or billing estimate. Captured hashes: raw SHA-256 `25ddf2c883e0d1958ea971d279a7e4f0fd446724ee3db7db19dadabd4a62e484`; clean SHA-256 `9f7f4d3aae80b06cbecf8619024b498708541b004d06c59657f4e1c237f10165`.

## Unprocessed response body

```html
<!doctype html><html lang=en><head><meta charset=utf-8><link rel=icon href=data:,><meta name=viewport content="width=device-width,initial-scale=1"><title>Example Domain</title><style>html{color-scheme:light dark;background:light-dark(#eee,#222)}body{font:16px/1.6 system-ui,sans-serif;max-width:26em;margin:auto;padding:25vh 2em 2em;text-align:center}</style></head><body><p>This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring purposes.</p><script src=/s.js></script></body></html>
```

## Processed response body

```markdown
---
title: "Example Domain"
source: "https://example.com/"
domain: "example.com"
word_count: 25
images_analyzed: 0
---

# Example Domain

This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring purposes.
```

The blueprint's universal latency targets have **not** been verified in hosted edge regions. This local run proves a conversion path only. Public deployment is blocked on verifying an egress policy that closes DNS rebinding exposure.
