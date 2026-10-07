# Stream Deck — hardware dashboard for a Composer space

Status: design approved 2026-08-19. Target device: **Stream Deck +** (8 LCD keys, 4 dials with
press + rotation, 4 touch-strip segments).

## Goal

Project the user's space onto Stream Deck hardware:

- **8 keys** — the space's **favorites**: objects carrying the canonical `favorite` ECHO tag.
  Each key shows the object's icon and name; pressing it opens the object in Composer.
- **4 dial segments** — **progress monitors** while any task is running (the same data the R0
  rail's progress popover shows), otherwise **space stats** (object / feed / plugin / type counts).
- **Dials** — rotation and press are plumbed end-to-end but unbound in phase 1 (binding TBD).

## Why the device layer is an Elgato plugin, not a HID driver

While Elgato's Stream Deck application is running it holds the HID device and continuously pushes
its own images; a second writer fights it, which is why every community HID library documents
"quit the official software first". A Composer-owned `hidapi` driver would therefore mean _Composer
or Elgato, never both_.

Shipping an Elgato plugin (`.sdPlugin`) instead:

- coexists with the user's existing profiles and actions;
- gets the dials and touch strip through a supported API rather than a reverse-engineered protocol;
- is hosted by a login-item application, so the dashboard is available **more** of the time than
  Composer is, satisfying the "must work when the browser is closed" requirement;
- needs no Rust and no Tauri changes.

The cost is a data channel between the Elgato-hosted process and Composer, and that channel is the
same boundary a future edge-hosted dashboard needs — so it is not throwaway.

## Architecture

```
┌─────────────────────────┐         ws://127.0.0.1:21435        ┌──────────────────────────┐
│ Composer (webview)      │                                     │ Elgato Stream Deck app   │
│                         │  ── frame: SVG per slot ─────────▶  │  ┌────────────────────┐  │
│  plugin-stream-deck     │                                     │  │ composer-sdplugin  │  │
│   ├── model (ECHO)      │  ◀──── input: key/dial events ───   │  │  (Node, WS server) │  │
│   ├── render (pure SVG) │                                     │  └────────────────────┘  │
│   └── bridge (WS client)│                                     └────────────┬─────────────┘
└─────────────────────────┘                                          setImage / setFeedback
                                                                            ▼
                                                                     Stream Deck +
```

**Composer is the brain; the sdPlugin is a display and an input source.** All model building and all
rendering happen in the webview, where ECHO, the theme tokens and the icon sprite already live. The
sdPlugin holds no domain knowledge — it maps slots to action instances, forwards pixels, and reports
input.

The local process is the **server** and the webview is the **client**, matching the existing debug-port
pattern in this repo (a webview cannot listen on a port). `tauri.conf.json`'s CSP already permits
`ws://localhost:*`.

### Packages

| Package                      | Location                              | Role                                                                                                                                                  |
| ---------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dxos/plugin-stream-deck`   | `packages/plugins/plugin-stream-deck` | The brain: favorites/monitor model, pure SVG renderers, WS client, surfaces. Also owns the protocol, exported as the React-free `./Protocol` subpath. |
| `@dxos/composer-stream-deck` | `packages/apps/composer-stream-deck`  | The `.sdPlugin` bundle: manifest, WS server, Elgato SDK glue.                                                                                         |

#### The device plugin is an app, not a Composer plugin and not a tool

It is an **Elgato** plugin — a Node process spawned by Elgato's application, with an Elgato
`manifest.json`, no `Plugin.Meta`, no capabilities, and no React. It can never be enabled from
Composer's plugin registry, so it does not belong in `packages/plugins/`, where a package _is_ a
plugin by virtue of exporting `Plugin.Meta` and where `list_plugins` would miscount it.

Nor is it a tool. Everything under `tools/` — build tooling, codemods, vite plugins, storybook hosts,
and the editor and agent integrations (`tools/claude/plugins/dxos`, `tools/intellij-plugin`) — serves
people **working on this repo**. Running inside a third-party host is not what makes something a
tool; the audience is. This plugin ships to Composer **users** through a marketplace, which is
exactly `packages/apps/composer-crx`'s situation: `layer: application`, with a `pack` task emitting
the distributable.

#### Elgato naming

Elgato constrains the UUID and the directory; the npm package name is ours.

| Thing                  | Value                                                     | Constrained by                                     |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| npm package            | `@dxos/composer-stream-deck`                              | repo convention only                               |
| Elgato plugin UUID     | `org.dxos.composer`                                       | reverse-DNS, **lowercase** alphanumerics, `-`, `.` |
| Build output directory | `org.dxos.composer.sdPlugin/` (gitignored)                | must be `<uuid>.sdPlugin`                          |
| Action UUIDs           | `org.dxos.composer.favorite`, `org.dxos.composer.monitor` | prefixed with the plugin UUID                      |
| Marketplace `Name`     | `Composer`                                                | free-form                                          |

Two consequences: Composer's own plugin-key convention cannot carry over — `org.dxos.plugin.streamDeck`
is an illegal Elgato UUID, since uppercase is not allowed — and the `.sdPlugin` directory is derived
from the UUID, so it is a build output rather than a hand-maintained source tree. The UUID
deliberately matches the Tauri bundle identifier: different registries, and to an Elgato user this
plugin is "Composer".

The protocol deliberately does **not** get its own package yet: it has one consumer until the device
plugin exists. It lives in `src/protocol/Protocol.ts` behind the `./Protocol` export subpath — which
imports only `effect`, so a Node consumer can take it without pulling React — and moves to
`packages/common/stream-deck-protocol` if a third consumer (e.g. the edge variant) ever appears.

### `@dxos/plugin-stream-deck` internals

- `model/favorites.ts` — the space's favorites → `KeySpec[]` (`{ target, label, icon, hue }`), sorted
  stably by label then target. Phase 1 keeps **query order with no persisted slot assignment**; a
  `StreamDeckLayout` object with ordered slots is a later step.
  **`Filter.tag` matches a tag's URI, not its label**, so the query is two steps: find the space's
  keyless `Tag` labelled `favorite`, then `Filter.tag(Obj.getURI(tag))`. A keyed provider tag that
  happens to be labelled "favorite" belongs to that provider and is ignored.
- `model/monitors.ts` — `useProgressMonitors()` (the `ProgressRegistry` snapshot atom, which degrades
  to "no progress" when the host is absent) → `DialSpec[]` while any task is `pending`/`running`,
  else space stats: objects, feeds, distinct types, and enabled plugins, all derived from one
  `Filter.everything()` query plus the plugin manager's `enabled` atom.
- `render/key.ts`, `render/dial.ts` — **pure functions** `KeySpec → string` (SVG) and
  `DialSpec → Feedback`. No DOM, no canvas: unit-testable in node, snapshot-friendly, and the
  Storybook virtual device renders the exact same markup the device receives.
- `render/icons.ts` — the one DOM-dependent piece: resolves an icon name to inline SVG markup from
  the in-DOM sprite (`[data-dx-icon-sprite] #ph--house--regular`), calling
  `IconRegistry.requestIcon` and awaiting the subscription when the symbol is not yet present.
  Kept out of the renderers so those stay pure — markup is passed in.
- `bridge/StreamDeckBridge.ts` — WS client: connect with backoff (1s → 30s), protocol handshake,
  per-slot diffing so only changed slots are pushed, and dispatch of inbound input.
- `capabilities/` — `react-surface` (status/settings panel and the virtual device), and the input
  handler that opens the pressed object.

### Protocol

Effect Schema tagged union, JSON over WebSocket, versioned by a `hello` handshake.

Server → client: `Hello { protocol, device: { keys, dials, keySize, dialSize } }`,
`Input { kind: 'keyDown' | 'keyUp' | 'dialDown' | 'dialRotate' | 'touchTap', slot, ticks? }`.

Client → server: `Frame { keys: Array<{ slot, svg } | null>, dials: Array<Feedback | null> }`.

`slot` is an integer assigned by the sdPlugin: it sorts its placed action instances by
`(row, column)` and hands out indices, so a user who places three key actions gets slots 0–2 and
Composer fills them from the top of the favorites list.

### Key press → open object

Inbound `Input { kind: 'keyDown', slot }` resolves to the `KeySpec` currently occupying that slot,
then dispatches Composer's open-object operation and, on desktop, asks the Tauri host to focus the
window. Nothing is opened if the slot is empty or the space has changed since the frame was sent
(the frame carries the object DXN, so the press is resolved against the last frame, not a re-query).

### Failure behaviour

- **Composer absent** — the sdPlugin renders a bundled dim "Composer offline" SVG and drops input.
- **Device absent / Elgato app not running** — the WS connect fails; the plugin logs at debug and
  retries with backoff. No user-visible error; this is the normal state for most users.
- **Protocol mismatch** — logged, connection closed, no retry storm.
- **Unknown message** — ignored. The sdPlugin wraps every handler so a Composer-side bug can never
  take down the Elgato host process.

## Milestones

**M1 — model + renderers, no hardware required.** Protocol package, plugin package, favorites and
monitor models, pure SVG renderers, unit tests, and a Storybook **virtual Stream Deck +** (8 keys +
4 dial segments) rendering the identical SVG from live ECHO data. Fully verifiable without a device.

**M2 — the wire.** sdPlugin bundle (manifest, actions, WS server) and the plugin's WS client, with
slot assignment and unchanged-frame suppression. Everything but the hardware is verified by
`composer-stream-deck:smoke`, which runs the assembled bundle against a stand-in for the Stream Deck
application — the bundle is the thing that breaks (decorators Node cannot execute, module
initialization order, `ws` resolving to its browser build), and unit tests cannot see any of it.

**M3 — interaction.** Key press → open object + focus window, and a **headless driver** that owns the
single bridge so the keys stay live with no surface rendered. The panel became a preview: it renders
the frame but does not send it, because the device accepts one client and two publishers would fight.
`KeySpec.target` therefore carries the graph navigation path (what `LayoutOperation.Open` consumes)
rather than a DXN. A settings surface was deliberately dropped — the plugin registry toggle already
turns the feature off.

**M4 — later.** Dial bindings (undecided), persisted slot ordering (`StreamDeckLayout`), and edge
mode: the same protocol served from edge instead of a local Composer, for a dashboard that survives
Composer being closed entirely (admin vs. user views).

## Decisions and open questions

- **Favorite = the canonical `favorite` ECHO tag.** ECHO already has first-class tags
  (`Obj.getMeta(obj).tags`, `Obj.addTag`, `Tag.findOrCreate`, `Filter.tag`), so no new annotation
  primitive is introduced. Note `Filter.tag` takes a tag URI, not a label — see the model above.
- **Slot order** — phase 1 uses query order; positions can reshuffle when a favorite is added.
  Accepted for now, `StreamDeckLayout` in M4.
- **Which space** — the currently active space. Multi-space aggregation is not in scope.
- **Dial bindings** — open. Rotation and press are transported and logged; nothing is bound.
- **Who drives the bridge** — M2 drives it from the dashboard surface, so the keys are live only while
  that panel is open. A headless driver (a non-hook query subscription in a capability) is Phase 3;
  the models are already pure functions over query results, so only the subscription changes.
- **Other hardware** — a LaMetric TIME surface is tracked for later. It has no keys, so only the dial
  half of this design carries over, and if its display can be driven directly over HTTP it needs no
  host-application bridge at all.
