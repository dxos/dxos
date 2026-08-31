---
'@dxos/echo': patch
---

Suppress the local OAuth callback server's per-request HTTP logs and listen banner during CLI OAuth flows (`dx account login`, `dx connector add`) unless `--verbose` is set.
