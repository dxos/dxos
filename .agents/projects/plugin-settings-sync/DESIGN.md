# Plugin settings — device sync with a per-panel scope

Prototype: move plugin settings (and the plugin set itself) out of device-local `localStorage` and
into the **settings space**, so they follow the identity across devices — while letting a device opt
a plugin's settings, or its plugin set, out of the account.

## Problem

Today every plugin's settings atom is created with `createKvsStore` (`@dxos/effect`), a single
`localStorage` key per plugin, and the enabled-plugin list is a separate `localStorage` key
(`org.dxos.app-framework.enabled`, written from `useApp`). Nothing follows the user to a second
device: a fresh device starts from schema defaults and the app's default plugin set.

The settings space already exists — a hidden, membership-locked, EDGE-replicated space
(`AppSpace.SETTINGS_SPACE_TAG`) whose whole purpose is app configuration that replicates across a
user's devices but is never shared. It currently holds only the default-space designation and a
couple of annotations on `space.properties`.

## Prior art

Surveyed before settling on the granularity, because the first cut of this prototype guessed wrong.

| Pattern                           | Who                                                                             | Granularity                        | User-facing UI |
| --------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- | -------------- |
| Author declares scope             | VS Code `machine` / `machine-overridable`; Firefox `services.sync.prefs.sync.*` | Per setting, by whoever defines it | none           |
| Category opt-out                  | Chrome, Firefox, Obsidian, JetBrains                                            | Per category                       | one checklist  |
| Escape-hatch list                 | VS Code `settingsSync.ignoredSettings`                                          | Per setting, by the user           | a JSON array   |
| Second profile for a device class | Slack "Use different settings for my mobile devices"                            | One switch unlocks a parallel set  | one checkbox   |

Nobody ships a per-setting sync toggle as primary UI. VS Code's own request for a cleaner
per-setting local ignore ([microsoft/vscode#89627](https://github.com/microsoft/vscode/issues/89627))
was closed `*out-of-scope`, and its per-row gear menu carries reset/copy actions only. Obsidian —
the closest analogue, being local-first with a plugin ecosystem — is strictly category-level, and
notably splits _installed_ from _enabled_ plugins as two separate toggles.

The first cut of this prototype implemented the escape-hatch pattern as a switch on every field.
This design is the category-level pattern instead, with the plugin set getting Slack's shape.

## Model

One ECHO object, `AppSettings`, in the settings space:

```ts
AppSettings {
  shared:  Record<namespace, Record<key, value>>
  devices: Record<deviceKey, {
    label?,
    overrides: Record<namespace, Record<key, value>>,
    unsynced: string[],          // namespaces this device WRITES locally
  }>
}
```

Reads always layer all three:

```
resolved[key] = device.overrides[ns][key] ?? shared[ns][key] ?? default[key]
```

**`unsynced` governs where writes go, not what reads see.** That single choice is what makes an
unsynced namespace _soft_: a key this device has never written has no override, so it still follows
the account. Turning sync off does not sever the namespace, it redirects this device's future edits.

### Writes

```
setValue(ns, key) → isSynced(ns) ? shared[ns][key] : device.overrides[ns][key]
```

So shared is the default, and leaving the account is a deliberate, per-namespace act.

### Leaving and rejoining

- **Leaving** (`setSynced(ns, false)`) is lossless and touches no other device. For a plugin's
  settings it passes a **snapshot** of the values in effect, freezing them locally so the switch is
  visibly a no-op. For the plugin set it passes **no snapshot**, so only what the user changes
  afterwards diverges — plugins enabled on another device later still arrive.
- **Rejoining** (`setSynced(ns, true)`) deletes this device's overrides for the namespace and adopts
  the account's values. This is the one lossy direction, so both call sites confirm first.

Whether leaving snapshots is a property of the namespace, not of the UI, so the sync module decides
it (`namespace === PLUGINS_NAMESPACE ? no snapshot : snapshot`) rather than the caller.

### Namespaces

| Namespace                                        | Keys         | Values              |
| ------------------------------------------------ | ------------ | ------------------- |
| `<plugin key>` (e.g. `org.dxos.plugin.markdown`) | schema field | field value         |
| `org.dxos.app-framework.plugins`                 | plugin id    | `boolean` (enabled) |
| `org.dxos.app-framework.plugins.installed`       | plugin id    | `{ url, version? }` |

The plugin set uses **plugin id as the key**, not one `enabled: string[]` field. That is what makes
the soft fork possible at all: a device's divergence is recorded per plugin, so an id it never
touched still resolves from the shared layer. A list-valued override would have made "different
plugin set here" swallow every plugin another device enables afterwards.

`installed` covers plugins loaded from a URL (`url-loader`'s `RemotePluginView`) — the "which
plugins you have installed" half of the ask.

The first sync records a decision for every plugin the device has registered, so the account carries
the whole plugin set rather than a diff against whatever defaults that build shipped. An id still
absent afterwards has no shared decision and falls back to that device's own state, so plugins added
to the defaults in a later release still turn themselves on.

## Runtime

`SettingsSync` (a plugin-space capability module activating on `ClientEvents.SpacesReady`) binds the
ECHO object to the atoms that already exist. No plugin changes:

1. Resolve the settings space, get-or-create the singleton `AppSettings`.
2. For each `AppCapabilities.Settings` contribution (live — new ones arrive as plugins lazily
   activate), for the plugin manager's `enabled`/`plugins` atoms, and for the remote install list:
   seed, subscribe atom → ECHO, subscribe ECHO → atom.
3. A reentrancy guard plus an `#agreed` baseline keeps the two directions from ping-ponging.

`localStorage` keeps working underneath — the plugin atoms are still `Atom.kvs`-backed, so it is the
**boot cache**: the app renders last-known settings immediately and reconciles when the space opens.
That matters for the plugin set specifically, which is read before the client exists.

### Applicability

- **Settings values** and **enabled plugins**: apply live in both directions.
- **Installed (remote) plugins**: written through to the `url-loader` storage key; effective on the
  next reload, because installation happens during preload, before the client exists.

## UI

Two controls, both coarse.

- **Settings plank header** (`plugin-settings`' `SettingsScope`, contributed as a `NavbarEnd`
  surface guarded on `AppCapabilities.isSettings`): one icon button per settings panel —
  `cloud-check` when it follows the account, `monitor` when it is local. It lives in the header
  because the scope belongs to the panel, not to any one field; that placement is also what makes it
  reach **all 27** settings-contributing plugins, including the 16 that render their own settings
  surface instead of `DefaultSettings`.
- **Plugin registry settings** (`RegistrySettings`): one switch, "Use a different plugin set on this
  device."

Both share `useSettingsScope(prefix)` from `@dxos/app-toolkit/ui` for state; the controls themselves
differ enough (icon button versus form row) that only the state is worth sharing.

## Open questions

1. Device identity is `client.halo.device.deviceKey` — stable per device, but a re-created profile on
   the same machine gets a new key, orphaning its override set. No GC for devices no longer in
   `client.halo.devices`.
2. Conflict semantics are last-writer-wins per key via Automerge. Fine for scalars; a settings field
   holding a nested object merges structurally, which may surprise.
3. Values are stored as `Schema.Any`. A plugin that changes its settings schema will read stale
   shapes; there is no per-namespace version or migration.
4. **A single machine-specific field inside an otherwise shareable plugin is unserved** — the only
   remedy is unsyncing that whole plugin's settings. Real cases exist (plugin-native's local Ollama
   endpoint, plugin-script's dev server URL). The fix is the author-declared scope VS Code and
   Firefox use — a `DeviceScoped` schema annotation, invisible to users, which composes with this
   design. Deliberately deferred until the need shows up.
