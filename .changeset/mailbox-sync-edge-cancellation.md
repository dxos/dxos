---
'@dxos/app-toolkit': minor
'@dxos/plugin-inbox': minor
---

Mailbox sync progress can now be cancelled from the sync meter: for an edge-executed sync trigger the cancel control stops the current run and its continuation chain, while the trigger's schedule stays enabled and re-syncs on its next tick.
