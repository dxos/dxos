# Plugin settings device sync — tasks

Design: [DESIGN.md](./DESIGN.md)

## Phase 1 — prototype

- [x] `AppSettings` ECHO type + layered resolution/mutation helpers (`@dxos/app-toolkit/AppSettings`)
- [x] Unit tests for the merge rules (shared vs device, plugin set, installed plugins)
- [x] `AppCapabilities.SettingsSync` capability declaration
- [x] `Reconciler` — two-way, reentrancy-guarded binding of one namespace
- [x] Unit tests for the reconciler (seed asymmetry, routing, no echo)
- [x] `SettingsSync` capability module in plugin-space (activates on `ClientEvents.SpacesReady`)
- [x] Bind every `AppCapabilities.Settings` contribution, live as plugins activate
- [x] Bind the plugin-manager's enabled set (per-plugin-id keys)
- [x] Bind the remote plugin install list (`UrlLoader.setRemoteEntries`)
- [x] Register `AppSettings` in plugin-space's schema module
- [x] Per-field pin/unpin UI in the default settings surface
- [x] Per-plugin "only on this device" affordance in the plugin detail article
- [ ] Manual verification against two profiles/devices

## Phase 2 — follow-ups (not in the prototype)

- [ ] Garbage-collect override sets for devices no longer in `client.halo.devices`
- [ ] Per-namespace schema version + migration for settings whose shape changed
- [ ] Surface "overridden on N other devices" next to a shared value
- [ ] Lift the pin control into `Form.Row` so bespoke settings surfaces get it too
- [ ] Decide whether installed-plugin sync should install without a reload
