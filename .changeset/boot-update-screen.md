---
'@dxos/app-framework': minor
'@dxos/plugin-client': minor
---

The boot loader stays up as an "Updating database" screen while the worker migrates or rebuilds a large index after an upgrade, instead of opening an app with no data.

- `@dxos/app-framework`: `Capabilities.BootGate` holds the boot loader past startup while its atom is `pending`, and the loader shows the gate's `status` line and `progress` ring. A gate must be contributed by a `Startup` module, since a dismissed loader does not come back.
- `@dxos/plugin-client`: contributes a gate driven by `Client.indexStatus`. It holds through index migrations and through a rebuild of at least 500 documents and feed blocks, and releases on anything smaller, when the worker sends no status within 5 s, or after 60 s without a status while holding.
