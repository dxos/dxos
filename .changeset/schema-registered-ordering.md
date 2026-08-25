---
'@dxos/echo': patch
'@dxos/plugin-client': patch
---

Register contributed schema before first-run consumers create typed objects. `SchemaDefs` now
contributes a `ClientCapabilities.SchemaRegistered` marker that modules writing typed objects on
`IdentityCreated` can require, and `ManagerOptions`/`TestAppOptions` accept a `whenIdle` effect so a
test can model a host that has not gone idle yet.
