---
'@dxos/agent-runtime': patch
---

Agent rehydration discards a dormant agent whose chat no longer exists instead of retrying it on every boot, and the assistant plugin starts rehydration only after the app's first idle.
