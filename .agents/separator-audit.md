# String Separator Audit

_Generated 2026-03-19, updated after consolidation_

## Well-Defined Helpers (Centralized)

| Helper | Separator | Location | Purpose |
|--------|-----------|----------|---------|
| `compositeKey()` / `splitCompositeKey()` | `:` | `util/src/composite-key.ts` | **NEW** — Generic colon-separated composite key primitive |
| `PropertyPath.create()` / `.parts()` / `.append()` | `.` | `util/src/property-path.ts` | **NEW** — Dot-separated property path utilities |
| `companionSegment()` / `companionId()` / `isCompanion()` | `~` | `app-toolkit/src/paths.ts` | **NEW** — Companion node ID helpers (prefix is private) |
| `pinnedWorkspaceId()` / `getPinnedWorkspacePath()` | `!dxos:` | `app-toolkit/src/paths.ts` | **NEW** — Pinned workspace ID helpers (prefix is private) |
| `registryCategoryId()` | `>` | `plugin-registry/src/meta.ts` | **NEW** — Registry category node ID helper (separator is private) |
| `Separators.primary` / `.secondary` | `\u0001` / `\u0002` | `app-graph/src/util.ts` | Graph key composition (internal to package, not exported) |
| `Separators.path` | `/` | `app-graph/src/util.ts` | Qualified node ID segments (internal to package) |
| `qualifyId()` / `validateSegmentId()` | `/` | `app-graph/src/util.ts` | Public helpers for graph path composition |
| `relationKey()` / `connectionKey()` | `\u0001` / `\u0002` | `app-graph/src/graph.ts` | Graph relation/connection keys |
| `getCompanionVariant()` | `~` | `app-toolkit/src/paths.ts` | Strips companion prefix from segment |
| `isPinnedWorkspace()` | `!dxos:` | `app-toolkit/src/paths.ts` | Checks if path is a pinned workspace |
| `Path.create()` / `Path.parts()` | `+` | `react-ui-list/src/util/path.ts` | Tree list path utilities |
| `PATH_SEPARATOR` | `~` | `react-ui/Treegrid.tsx` | Treegrid path segments |
| `KEY_SEPARATOR` | `~` | `echo-atom/src/query-atom.ts` | Atom family keys |
| `headsCodec` | `\|` | `automerge-data-source.ts` | Automerge heads encoding |
| `separator` | `,` | `lit-grid/src/types.ts` | Grid cell coordinates |

## Prefix Markers

### Companion Prefix `~` (Encapsulated)

The `~` prefix is now a private implementation detail. Consumers use helpers:
- `companionSegment('settings')` → `~settings`
- `companionId(parentPath, 'presenter')` → `parentPath/~presenter`
- `isCompanion(qualifiedId)` → checks if last segment starts with `~`
- `getCompanionVariant(qualifiedId)` → strips `~` to get variant name

**All known companion variants:**
- `~settings` (plugin-space, plugin-pipeline)
- `~comments` (plugin-thread, plugin-sheet)
- `~presenter` (plugin-presenter)
- `~transcript` (plugin-meeting)
- `~automation` (plugin-automation)
- `~help` (plugin-observability)
- `~search` (plugin-search)
- `~trace` (plugin-assistant)
- `~message` (plugin-inbox)
- `~event` (plugin-inbox)
- `~selected-objects` (plugin-space)

### Pinned Workspace Prefix `!dxos:` (Encapsulated)

The `!dxos:` prefix is now a private implementation detail. Consumers use helpers:
- `pinnedWorkspaceId('settings')` → `!dxos:settings`
- `getPinnedWorkspacePath('settings')` → `root/!dxos:settings`
- `isPinnedWorkspace(qualifiedPath)` → checks if path starts with `root/!dxos:`

**Known pinned workspace IDs:**
- `!dxos:settings` — `SETTINGS_ID` in `plugin-settings/src/actions.ts`
- `!dxos:plugin-registry` — `REGISTRY_ID` in `plugin-registry/src/meta.ts`

### Registry Category Separator `>` (Encapsulated)

The `>` separator is now a private implementation detail. Consumers use:
- `registryCategoryId('all')` → `plugin-registry>all`

### Other Prefix Constants (Ad-Hoc, Not Yet Migrated)

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `MULTIBASE_PREFIX` | `'B'` | `keys/space-id.ts`, `keys/identity-did.ts` | RFC4648 base-32 encoding prefix |
| `DID_PREFIX` | `'did:halo:'` | `keys/identity-did.ts` | Decentralized Identifier scheme |
| `SURFACE_PREFIX` | `'surface:'` | `plugin-deck/DeckLayout/constants.ts` | Surface component IDs |
| `MARKER_PREFIX` | `'dx-marker'` | `react-ui-canvas-editor/Shape.tsx` | SVG marker IDs |
| `PREFIX` | `'fs'` | `plugin-files/util.tsx` | File system entity prefix |
| `V1_PREFIX` | `'#01'` | `core/protocols/indexing.ts` | Object pointer version |

## Ad-Hoc Separator Usage (Remaining)

### Colon `:` — remaining ad-hoc sites (lower priority)

The following were **migrated to `compositeKey()`**:
- ~~Service IDs~~ → `compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId)`
- ~~Queue IDs~~ → `compositeKey(subspaceTag, spaceId, queueId)`
- ~~Storage keys~~ → `compositeKey(namespace, KEY)`
- ~~Activation events~~ → `compositeKey(event.id, event.specifier)`
- ~~Schema registry~~ → `compositeKey(typename, version, dxn)`
- ~~Query result keys~~ → `compositeKey(spaceId, documentId, objectId)`

The following remain as-is (low priority / intentionally skipped):
- DXN format: `dxn:${kind}:${parts}` — has its own parser/serializer
- File tree paths: `${path}:${handle.name}` (plugin-files)
- Popover anchors: `${meta.id}:${node.id}` (plugin-simple-layout, plugin-deck)
- Settings keys: `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}` (plugin-settings) — needs different encoding
- Voxel keys: `${x}:${y}:${z}` — numeric, local
- Text selection ranges: `${from}:${to}` — numeric, local
- Network addresses: `${ip}:${port}` — standard convention

### Dash `-` — ~21 occurrences (not migrated, low priority)

- Edge/relation IDs, React keys, stream/connection tags, lock keys, tool nodes

### Dot `.` — ~20 occurrences (not migrated, `PropertyPath` available for future use)

- Property/method paths, protobuf paths, grid testIds, form field paths

### Other separators (not migrated, local/specialized usage)

- Slash `/` — WebSocket paths, track names, hierarchical IDs
- At `@` — sheet cell addresses, compute graph, package versions
- Hash `#` — instance IDs, SVG icon refs
- Tilde `~` — navtree state key, story fixtures
- Plus `+` — plank size key (plugin-deck)
- Pipe `|` — 1 ad-hoc beyond headsCodec
- Underscore `_` — branch IDs, protobuf names, graph IDs

## Observations (Post-Consolidation)

1. **`compositeKey()` is the new standard** for colon-separated composite keys. Located in `@dxos/util`, used across echo-db, echo-pipeline, app-framework, observability, client, and react-client.

2. **Prefix markers are now encapsulated** — `~` (companion), `!dxos:` (pinned workspace), and `>` (registry category) are all behind helper functions. No raw prefix/separator constants are exported to consumers.

3. **`Separators` in app-graph is internal** — confirmed not part of the public API. Only used by `graph.ts` and `graph-builder.ts` within the package.

4. **Remaining ad-hoc sites are low risk** — either numeric values (voxels, text ranges), standard conventions (host:port), or have their own parsers (DXN).

5. **`PropertyPath` is available** but not yet adopted — the ~20 dot-separator sites can be migrated opportunistically.
