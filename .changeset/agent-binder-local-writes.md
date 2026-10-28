---
'@dxos/assistant': patch
'@dxos/plugin-illustrator': patch
---

`Binder.sync()` after an external binding write no longer stops waiting when a local binding is read first, and a failed re-read leaves the write for the next sync. `illustrator.draw` no longer fails on a host with no views (EDGE), where it skipped nothing but threw on the missing atom registry.
