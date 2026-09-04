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

## Phase 2b — end-to-end verification

- [x] `settings.spec.ts` — single device: a device-local edit leaves the account's value intact,
      proven by rejoining and watching the shared value come back (green 3/3 locally)
- [x] Fix found by it: `unsynced` held the live ECHO array, whose proxy identity survives a
      reassignment, so the atom never notified and the scope control never flipped
- [x] `AppManager.waitForDefaultWorkspace()` — the boot navigation to the default space lands
      seconds after the shell renders and replaces any route set before it
- [x] `halo.spec.ts` two-device test — passes against real EDGE device invitations (2026-09-04, local)
- [x] The stall was never environmental. The test read the auth code straight after creating the
      invitation, but the host only learns it from `readyForAuthentication`, which the flow reaches
      once a guest is on the other side — so it waited on a value that could not exist yet. Behind
      it: the guest was driven before its boot navigation landed, and a device joining an existing
      identity stops at the inviter's workspace root, never reaching the `/home` plank
- [x] Merged main forward after three weeks of drift (301 commits). Main's Ark UI tree rebuild
      (#12873) broke both settings and registry navigation: the row is the control, holds no nested
      button, and needs a settled pointer sequence — a zero-delay click only moves focus

## Phase 3 — follow-ups (not in the prototype)

- [ ] Retire bespoke settings articles. 16 of the 30 settings panels render their own article rather
      than the schema-driven default, so anything belonging to the panel as a whole — the sync scope
      today, whatever comes next — has to be wired into each of them by hand. Flagged as deprecated
      on `AppSurface.settings`; the fix is to make each panel's remaining custom controls
      expressible from its schema, then delete the bespoke surface

- [ ] `DeviceScoped` schema annotation, so an author can mark one machine-specific field without
      forcing the user to unsync the whole plugin (deferred — add when the need shows up)
- [ ] Garbage-collect override sets for devices no longer in `client.halo.devices`
- [ ] Per-namespace schema version + migration for settings whose shape changed
- [ ] Surface "this is different on N other devices" somewhere
- [ ] Decide whether installed-plugin sync should install without a reload
