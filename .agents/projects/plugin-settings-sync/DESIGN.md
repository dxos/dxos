# Plugin settings — device sync with per-device overrides

Prototype: move plugin settings (and the plugin set itself) out of device-local `localStorage` and
into the **settings space**, so they follow the identity across devices — while keeping a device
able to pin any individual setting to a local value.

## Problem

Today every plugin's settings atom is created with `createKvsStore` (`@dxos/effect`), a single
`localStorage` key per plugin, and the enabled-plugin list is a separate `localStorage` key
(`org.dxos.app-framework.enabled`, written from `useApp`). Nothing follows the user to a second
device: a fresh device starts from schema defaults and the app's default plugin set.

The settings space already exists — a hidden, membership-locked, EDGE-replicated space
(`AppSpace.SETTINGS_SPACE_TAG`) whose whole purpose is app configuration that replicates across a
user's devices but is never shared. It currently holds only the default-space designation and a
couple of annotations on `space.properties`.

## Model

One ECHO object, `AppSettings`, in the settings space:

```ts
AppSettings {
  shared:  Record<namespace, Record<key, value>>       // every device
  devices: Record<deviceKey, { label?, overrides: Record<namespace, Record<key, value>> }>
}
```

Resolution is a two-layer merge over three sources, per key:

```
resolved[key] = device.overrides[ns][key] ?? shared[ns][key] ?? schemaDefault[key]
```

**Presence, not equality, is the override.** A key present in `devices[me].overrides[ns]` is pinned
to this device — even if its value happens to equal the shared one. That distinction is what lets
"pinned" survive a shared-value change from another device.

### Writes

A local write to a settings atom is diffed against the previously resolved value and each changed
key is routed by its pin state:

- key pinned on this device → write to `devices[me].overrides[ns]`
- otherwise → write to `shared[ns]`

So _shared is the default_, which is what the feature asks for. Pinning is an explicit, per-key
user action (`pin` copies the current resolved value into the device layer; `unpin` deletes the key
and the shared value takes over again).

### Namespaces

A namespace is just a string key. Three kinds:

| Namespace                                        | Keys         | Values              |
| ------------------------------------------------ | ------------ | ------------------- |
| `<plugin key>` (e.g. `org.dxos.plugin.markdown`) | schema field | field value         |
| `org.dxos.app-framework.plugins`                 | plugin id    | `boolean` (enabled) |
| `org.dxos.app-framework.plugins.installed`       | plugin id    | `{ url, version? }` |

The plugin set deliberately uses **plugin id as the key**, not a single `enabled: string[]` field.
That makes it fall out of the generic per-key model with no special case: enabling a plugin on one
device shares it; pinning `org.dxos.plugin.chess` to `false` on the work laptop overrides only that
one entry and still inherits every future plugin the other device enables. A whole-list field would
have made a device override swallow all later shared additions.

`installed` covers plugins loaded from a URL (`url-loader`'s `RemotePluginView`), which is the
"which plugins you have installed" half of the ask.

The first sync records a decision for every plugin the device has registered, so the account carries
the whole plugin set rather than a diff against whatever defaults that build happened to ship. An id
still absent afterwards — a plugin only one device knows about, or one added to the defaults in a
later release — has no shared decision and falls back to that device's own state, so new default
plugins still turn themselves on.

## Runtime

`SettingsSync` (a `plugin-settings` capability module activating on `ClientEvents.SpacesReady`)
binds the ECHO object to the atoms that already exist. No plugin changes:

1. Resolve the settings space, get-or-create the singleton `AppSettings`.
2. For each `AppCapabilities.Settings` contribution (live — new ones arrive as plugins lazily
   activate), and for the plugin-manager's `enabled` atom:
   - seed the atom from the resolved value,
   - subscribe atom → ECHO (diff + route by pin state),
   - subscribe ECHO → atom (recompute + set).
3. A reentrancy guard around each direction keeps the two subscriptions from ping-ponging.

`localStorage` keeps working underneath — the plugin atoms are still `Atom.kvs`-backed, so it
becomes the **boot cache**: the app renders last-known settings immediately and reconciles when the
space opens. That matters for the plugin set specifically, which is read before the client exists.

### Ordering / applicability

- **Settings values**: apply live in both directions.
- **Enabled plugins**: apply live (the plugin manager supports runtime enable/disable).
- **Installed (remote) plugins**: written through to the `url-loader` storage key; effective on the
  next reload, because installation happens during preload, before the client exists.

## UI

- **Default settings surface** (`plugin-settings`' `DefaultSettings`, used by every plugin that does
  not register a bespoke settings surface): a "This device" section with one switch per schema
  field, pinning that field to the device.
- **Plugin detail** (`plugin-registry`'s `PluginDetail`): an "Only on this device" switch that pins
  the plugin's own enabled state.

Plugins with a _bespoke_ settings surface (markdown, space, support, …) sync exactly the same way,
but show no pin control — the switches live in the shared default surface only. Lifting them into
`Form.Section`/`Form.Row` so any settings surface can opt in is the obvious next step.

## Open questions

1. Device identity is `client.halo.device.deviceKey` — stable per device, but a re-created profile
   on the same machine gets a new key, orphaning its override set. Garbage collection of override
   sets for devices no longer in `client.halo.devices` is not implemented.
2. Conflict semantics are last-writer-wins per key via Automerge. Fine for scalars; a settings
   field holding a nested object merges structurally, which may surprise.
3. Values are stored as `Schema.Any`. A plugin that changes its settings schema will read stale
   shapes; there is no per-namespace version or migration.
4. Pinning granularity is per key. A "pin this whole plugin's settings to this device" shortcut is
   sugar over pinning each key, not implemented.
