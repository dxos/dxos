# @dxos/test-utils

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
