---
'@dxos/test-utils': patch
---

`e2ePreset` now defaults `timeout` to 60s. Playwright's 30s default equalled the preset's action bound, leaving a test no budget beyond one slow action — and a storybook-backed suite spends most of it on the story compile the first test pays for, which measured 29.3s against the 30s cap.
