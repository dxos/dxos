---
'@dxos/test-utils': patch
---

Change two `e2ePreset` defaults: CI no longer retries a failed Playwright test (was 2 retries), and CI now runs 2 workers rather than 1. Set `PLAYWRIGHT_WORKERS` to override the worker count. The Knapsack Pro batch reporter and its per-invocation report naming are removed — e2e sharding now uses Playwright's own `--shard`.
