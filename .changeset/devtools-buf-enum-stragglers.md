---
'@dxos/cli-util': patch
'@dxos/plugin-debug': patch
---

Move the last two top-level protobuf enum imports in devtools-owned packages onto buf: `EdgeReplicationSetting` in `cli-util`'s space helpers and `ConnectionState` in `plugin-debug`'s `DebugStatus`. Both enums are value-identical between the two generators and TypeScript relates enum types by name, so the swap needs no call-site change.
