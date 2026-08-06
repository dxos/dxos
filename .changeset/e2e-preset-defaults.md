---
'@dxos/test-utils': patch
---

Change two `e2ePreset` defaults: CI no longer retries a failed Playwright test (was 2 retries), and CI now runs 4 workers rather than 1. Set `PLAYWRIGHT_WORKERS` to override the worker count.
