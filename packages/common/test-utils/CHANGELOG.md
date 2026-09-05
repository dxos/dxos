# @dxos/test-utils

## 0.12.0

### Patch Changes

- 659f554: Change two `e2ePreset` defaults: CI no longer retries a failed Playwright test (was 2 retries), and CI now runs 2 workers rather than 1. Set `PLAYWRIGHT_WORKERS` to override the worker count. The Knapsack Pro batch reporter and its per-invocation report naming are removed — CI now splits e2e by moon target across browser x composer/rest matrix cells.
- 4b9ae33: `setupPage` now returns a `close()` that disposes the browser context it created. Closing only the page left the context open, and Playwright re-serialized every live context into each later trace until the writer exceeded V8's string limit and left a truncated `trace.zip` behind.
- @dxos/async@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- bce1dbc: `e2ePreset` now defaults `timeout` to 60s. Playwright's 30s default equalled the preset's action bound, leaving a test no budget beyond one slow action — and a storybook-backed suite spends most of it on the story compile the first test pays for, which measured 29.3s against the 30s cap.
- Updated dependencies [aea1e6e]
  - @dxos/async@0.11.0
  - @dxos/node-std@0.11.0
