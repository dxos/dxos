# Stream Deck — Tasks

_Resume: M1 landed and green (build/lint/26 node tests/4 storybook tests). Phase 2's home and naming are now decided: `packages/apps/composer-stream-deck`, `layer: application`, Elgato UUID `org.dxos.composer`. Next: author `PLUGIN.mdl` (required before the first PR), then Phase 2 — the `.sdPlugin` bundle and the WebSocket, which needs the device. Uncommitted: none. Last: `@dxos/plugin-stream-deck` scaffolded with protocol, favorites/monitor models, pure SVG renderers, virtual-device component + stories, and registration in `composer-app` under the labs flag._

Design and decisions: [DESIGN.md](./DESIGN.md).

## Phase 1 (M1): Model and renderers — no hardware required

Everything that can be built and verified without the device: the shared protocol schema, the
favorites/monitor models over ECHO, and pure SVG renderers. The Storybook "virtual Stream Deck +"
renders the identical markup the device will receive, so the whole visual surface is reviewable
before the wire exists.

### Tasks

- [x] **Protocol** — `src/protocol/Protocol.ts`, exported as the React-free `./Protocol` subpath
  - `Hello` / `Input` / `Frame` messages, `KeyImage`, `DialFeedback`, `PROTOCOL_VERSION`, `DEFAULT_PORT`.
  - `DeviceProfile` (`keys`, `dials`, `keySize`, `dialSize`) with a `streamDeckPlus` constant.
  - Kept in the plugin rather than its own package until the device plugin gives it a second consumer.
- [x] **Scaffold `@dxos/plugin-stream-deck`** (`packages/plugins/plugin-stream-deck`)
  - Package files following `plugin-sample`'s shape; `labs` tier in `dx.config.ts`.
  - `meta.ts`, `plugin.ts`, `StreamDeckPlugin.ts`, `translations.ts`, `index.ts`, `.storybook/`.
- [x] **Favorites model** — the space's `favorite` tag → `KeySpec[]`
  - `Filter.tag` matches a tag URI, not a label, so the keyless `favorite` `Tag` is resolved first.
  - Stable sort (label, then target); `Obj.getLabel` / `Obj.getIcon` for name and icon.
  - Tested against a real `EchoTestBuilder` space: tagged vs untagged, and a keyed provider tag
    labelled "favorite" is correctly ignored.
- [x] **Monitor model** — `useProgressMonitors()` → `DialSpec[]`, falling back to space stats
  - Progress mode while any task is `pending`/`running`; else objects / feeds / types / plugins.
  - Tested: both modes, indeterminate tasks, finished/failed tasks ignored, truncation to 4 dials.
- [x] **Pure key renderer** — `renderKey(spec, { size, icon }): string`
  - 144×144 SVG: inlined icon, wrapped/ellipsised label, literal hue colours (the device cannot
    resolve CSS custom properties).
  - Tested: geometry, hue mapping and fallback, XML escaping, icon inlining, empty slot.
- [x] **Pure dial renderer** — `renderDial(spec): Protocol.DialFeedback`
  - Semantic `title` / `value` / `bar`, leaving the Elgato layout mapping to the device plugin.
  - Tested: determinate, percentage fallback, indeterminate, stat.
- [x] **Icon markup resolver** — `resolveIcon(name)` / `useIcons(names)` from the in-DOM sprite
  - Reads `[data-dx-icon-sprite] #<name>`; requests via `IconRegistry.requestIcon` and re-renders
    off the registry subscription. Browser-only, kept out of the renderers.
- [x] **Storybook virtual Stream Deck +**
  - `VirtualStreamDeck` renders the exact SVG the device is sent; 3 component stories (stats,
    progress, empty) verified by screenshot, plus a container story over a live seeded ECHO space.
  - Container stories do not render in an ad-hoc root-launched storybook (the client worker fails to
    initialise there — the reference `plugin-kanban` container story is blank too); they pass under
    `moon run plugin-stream-deck:test-storybook`.
- [x] **Register the plugin** in `composer-app`'s `plugin-defs.tsx`, enabled only under `isLabs`.
- [ ] **Author `PLUGIN.mdl`** — required before the plugin's first PR merges (`composer-plugins`
      skill); transcribe the design plus the as-built plugin.
- [ ] **Changeset** — new private package, so likely none required; confirm against
      `agents/instructions/changesets.md`.

## Phase 2 (M2): The wire

The `.sdPlugin` bundle and the WebSocket transport. Needs the physical device and the Elgato app.

### Tasks

- [ ] **Scaffold `@dxos/composer-stream-deck`** (`packages/apps/composer-stream-deck`)
  - `layer: application`, mirroring `composer-crx`: a `pack` task emits the `.streamDeckPlugin`
    distributable. It is an Elgato plugin, not a Composer plugin (no `Plugin.Meta`) and not a tool
    (it ships to users, not contributors) — see the design's naming section.
  - Elgato plugin UUID `org.dxos.composer`, so the build output directory is
    `org.dxos.composer.sdPlugin/` (derived from the UUID, therefore gitignored). Marketplace name
    `Composer`. Uppercase is illegal in an Elgato UUID, so `org.dxos.plugin.streamDeck` cannot be
    reused.
  - `manifest.json` with a keypad action (`org.dxos.composer.favorite`) and an encoder action
    (`org.dxos.composer.monitor`); Node entrypoint using `@elgato/streamdeck`.
  - Dev loop via Elgato's `streamdeck` CLI (`link`, `dev`, `restart`).
- [ ] **WS server in the sdPlugin** — listen on `127.0.0.1:21435`, `Hello` handshake, single client.
- [ ] **Slot assignment** — sort placed action instances by `(row, column)`, map to slot indices.
- [ ] **Apply frames** — `setImage(context, svg)` per key, `setFeedback` per dial.
- [ ] **Emit input** — `keyDown`/`keyUp`/`dialDown`/`dialRotate`/`touchTap` → `Input` messages.
- [ ] **Offline state** — bundled dim "Composer offline" SVG when no client is connected.
- [ ] **`StreamDeckBridge` WS client** in the plugin — backoff reconnect, handshake, per-slot diffing.
- [ ] **End-to-end on hardware** — favorites appear on keys, monitors on the strip.

## Phase 3 (M3): Interaction

- [ ] **Key press → open object** — resolve the slot against the last frame's DXN, dispatch the
      open-object operation.
- [ ] **Focus the window** on desktop (Tauri) when a key is pressed.
- [ ] **Settings surface** — enable/disable the bridge, show connection state and the bound space.
- [ ] **Status indicator** — surface bridge state in the app (disconnected is the normal state for
      users without the hardware, so it must be quiet).

## Phase 4 (M4): Later

- [ ] **Dial bindings** — undecided; rotation/press are transported and logged until then.
- [ ] **Persisted slot ordering** — a `StreamDeckLayout` ECHO object with ordered slots.
- [ ] **Edge mode** — serve the same protocol from edge so the dashboard survives Composer being
      closed entirely (admin vs. user views).

## References

- [DESIGN.md](./DESIGN.md) — architecture, protocol, and the rationale for the Elgato-plugin route.
- Elgato SDK: [keys / `setImage`](https://docs.elgato.com/streamdeck/sdk/guides/keys/),
  [dials & touch strip](https://docs.elgato.com/streamdeck/sdk/guides/dials/),
  [SD+ layouts](https://docs.elgato.com/streamdeck/sdk/references/touchscreen-layout/).
- Repo precedents: `packages/plugins/plugin-osrm` (package shape),
  `packages/plugins/plugin-progress` + `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`
  (monitor data), `packages/apps/composer-crx` (third-party-host bundle).
