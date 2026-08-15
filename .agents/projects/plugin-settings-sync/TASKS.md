# Plugin settings device sync — tasks

Design: [DESIGN.md](./DESIGN.md)

## Phase 1 — substrate

- [x] `AppSettings` ECHO type + layered resolution/mutation helpers (`@dxos/app-toolkit/AppSettings`)
- [x] Unit tests for the merge rules
- [x] `AppCapabilities.SettingsSync` capability declaration
- [x] `Reconciler` — two-way, reentrancy-guarded binding of one namespace
- [x] Unit tests for the reconciler (seed asymmetry, routing, no echo)
- [x] `SettingsSync` capability module in plugin-space (activates on `ClientEvents.SpacesReady`)
- [x] Bind every `AppCapabilities.Settings` contribution, live as plugins activate
- [x] Bind the plugin-manager's enabled set (per-plugin-id keys)
- [x] Bind the remote plugin install list (`UrlLoader.setRemoteEntries`)
- [x] Register `AppSettings` in plugin-space's schema module

## Phase 2 — scope UI (replaced the per-field pin)

Prior-art survey (see DESIGN.md) showed per-field sync toggles are what nobody ships. Reworked to a
per-namespace scope: `unsynced` routes writes, reads still layer shared underneath.

- [x] Replace per-key pinning with `Device.unsynced` + `setSynced`
- [x] Snapshot-on-leave for plugin settings; no snapshot for the plugin set (soft fork)
- [x] Adopt-the-account on rejoin, behind a confirmation
- [x] `useSettingsScope(prefix)` in `@dxos/app-toolkit/ui`
- [x] `SettingsScope` control in the settings plank header (`NavbarEnd`) — reaches all 27 plugins
- [x] "Use a different plugin set on this device" switch in `RegistrySettings`
- [x] Delete `DeviceOverrides` and the per-plugin switch in `PluginDetail`
- [ ] Manual verification against two profiles/devices

## Phase 3 — follow-ups (not in the prototype)

- [ ] `DeviceScoped` schema annotation, so an author can mark one machine-specific field without
      forcing the user to unsync the whole plugin (deferred — add when the need shows up)
- [ ] Garbage-collect override sets for devices no longer in `client.halo.devices`
- [ ] Per-namespace schema version + migration for settings whose shape changed
- [ ] Surface "this is different on N other devices" somewhere
- [ ] Decide whether installed-plugin sync should install without a reload
