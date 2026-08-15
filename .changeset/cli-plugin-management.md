---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Let a host decide which plugins are core via `PluginManager`'s new `core` option, instead of deriving the set from each plugin's `system` tag. `dx plugin list` now reports `installed` and `enabled` as separate fields (plus any load or activation failure) rather than one collapsed status, `dx plugin list --enabled` filters to the active set, and `enable`/`disable` are idempotent and fail with actionable messages. The CLI supplies its own core set, so telemetry, connectors and routines are now disableable there, and its demo plugins move behind `DX_LABS`. A profile whose enabled list is empty is no longer re-seeded with the defaults.
