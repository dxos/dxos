# Audit: `@dxos/client/echo` exports

## Scope

This audit covers every external call site of symbols re-exported by
[`packages/sdk/client/src/echo/index.ts`](./index.ts), grouped by usage
theme. `@dxos/react-client/echo` re-exports `@dxos/client/echo` via
`export *`, so an import from either path is counted against the same
underlying symbol.

Call-site counts include files under `packages/` and `docs/` (excluding
`node_modules`, `dist/`, and `docs/legacy/`).

## Current exports

The barrel currently re-exports symbols from five upstream packages:

| Upstream                                      | Symbols re-exported                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@dxos/client-protocol`                       | `isSpace`, `Echo`, `Space`, `SpaceSchema`, `SpaceProperties`                                        |
| `@dxos/echo-db`                               | `createObject`, `createSubscription`, `ObjectMigration`, `Queue`, `Selection`, `SubscriptionHandle` |
| `@dxos/protocols/proto/dxos/echo/indexing`    | `IndexKind`                                                                                         |
| `@dxos/protocols/proto/dxos/echo/filter`      | `QueryOptions`                                                                                      |
| `@dxos/protocols/proto/dxos/client/services`  | `SpaceMember`, `SpaceState`                                                                         |
| `@dxos/protocols/proto/dxos/halo/credentials` | `SpaceMember as HaloSpaceMember`                                                                    |
| `@dxos/protocols/proto/dxos/echo/model/text`  | `TextKind`                                                                                          |
| `@dxos/protocols/proto/dxos/echo/service`     | `SpaceSyncState`                                                                                    |
| `./import`                                    | `importSpace`, `ImportSpaceOptions`                                                                 |
| `./util`                                      | `getSpace`, `getSyncSummary`, `Progress`, `PeerSyncState`, `SpaceSyncStateMap`                      |

Plus the React-only additions in `@dxos/react-client/echo`:
`useDatabase`, `useObject`, `useObjects`, `useQuery`, `useQueue`,
`useMembers`, `useSchema`, `useSpace`, `useSpaces`,
`useSpaceInvitations`, `useSpaceProperties`, `useSpaceSyncState`,
`useSubscription`, `useSyncState`.

## Usage by theme

### 1 — Space proxy (270+ call sites)

The dominant theme. Code that has (or wants) a `Space` proxy instance.

| Symbol                | Files | Notes                                                                                                                                            |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Space`               | 132   | The runtime SpaceProxy interface. Most common single export from the barrel.                                                                     |
| `useSpaces`           | 67    | All spaces hook.                                                                                                                                 |
| `getSpace`            | 29    | Resolve owning `Space` from an ECHO object. Kept for proxy-only callers (`properties`, `queues`, `members`, `key`, `state`, `listen`, identity). |
| `SpaceState`          | 19    | Lifecycle state enum (`SPACE_READY`, etc.).                                                                                                      |
| `isSpace`             | 17    | `SPACE_TAG` brand check.                                                                                                                         |
| `useSpace`            | 8     | Single space by id/key.                                                                                                                          |
| `useSpaceInvitations` | 3     | Outbound invitations.                                                                                                                            |
| `SpaceProperties`     | 3     | Schema for the `space.properties` document.                                                                                                      |
| `SpaceSchema`         | 3     | Effect schema for the `Space` interface itself.                                                                                                  |
| `useSpaceProperties`  | 1     | Properties hook.                                                                                                                                 |

**Observation:** `Space` itself is the single largest gateway in the barrel. Anything that takes a `Space` argument transitively pulls callers into this theme.

### 2 — Object & database access (180+ call sites)

Reactive React hooks that read ECHO objects, including `useQuery` /
`useObject` / `useDatabase`. These don't need a `Space` instance —
they take an `EchoDatabase` (often via `space.db`).

| Symbol         | Files |
| -------------- | ----- |
| `useQuery`     | 126   |
| `useObject`    | 39    |
| `useDatabase`  | 13    |
| `useSchema`    | 10    |
| `useObjects`   | 1     |
| `createObject` | 2     |

**Observation:** every hook here ultimately operates on `Database`, not `Space`. This is the boundary that recent migrations exploited (e.g. `useGraphModel(db)`, `useTypeOptions({ db })`).

### 3 — Membership (29 call sites)

| Symbol            | Files |
| ----------------- | ----- |
| `SpaceMember`     | 15    |
| `useMembers`      | 10    |
| `HaloSpaceMember` | 4     |

`SpaceMember` and `HaloSpaceMember` are protocol types with identical
shape but different provenance (client services vs HALO credentials).
The current convention is to alias the credential-shaped variant.

### 4 — Queues (20 call sites)

| Symbol     | Files |
| ---------- | ----- |
| `Queue`    | 12    |
| `useQueue` | 8     |

Queues live on `Space.queues` and are the bridge to edge-side feeds.
Anything using `useQueue` already has a Space proxy upstream.

### 5 — Sync state (15 call sites)

EDGE sync introspection. Three of the five types are _local_ to this
package — they don't exist in `@dxos/echo-db`.

| Symbol              | Files | Source                                  |
| ------------------- | ----- | --------------------------------------- |
| `SpaceSyncStateMap` | 4     | local `./util`                          |
| `PeerSyncState`     | 3     | local `./util` (alias of protocol type) |
| `getSyncSummary`    | 3     | local `./util`                          |
| `useSyncState`      | 2     | react-client                            |
| `SpaceSyncState`    | 2     | protocol type                           |
| `useSpaceSyncState` | 1     | react-client                            |

**Observation:** the `./util` helpers are a small "edge sync summary"
mini-API. Could be promoted to a dedicated `Sync` namespace.

### 6 — Low-level object lifecycle (5 call sites)

| Symbol               | Files                       |
| -------------------- | --------------------------- |
| `createObject`       | 2 (also counted in theme 2) |
| `ObjectMigration`    | 1                           |
| `Selection`          | 1                           |
| `SubscriptionHandle` | 1                           |
| `createSubscription` | 1                           |

**Observation:** all five symbols are deep echo-db internals. `createSubscription`/`Selection`/`SubscriptionHandle` are a coupled trio (the selection-based subscription API behind `useSubscription`).

### 7 — Import / export (3 call sites)

| Symbol               | Files |
| -------------------- | ----- |
| `importSpace`        | 2     |
| `ImportSpaceOptions` | 1     |

Local helper in `./import`. Takes an `EchoDatabase`, not a `Space`.

### 8 — Indexing / query protocol (1 call site)

| Symbol      | Files |
| ----------- | ----- |
| `IndexKind` | 1     |

Protocol enum. Lowest-priority barrel entry by usage.

### 9 — Unused (0 call sites)

These exports have zero call sites and can be dropped immediately.

| Symbol            | Source                                       |
| ----------------- | -------------------------------------------- |
| `Echo` (type)     | `@dxos/client-protocol`                      |
| `QueryOptions`    | `@dxos/protocols/proto/dxos/echo/filter`     |
| `TextKind`        | `@dxos/protocols/proto/dxos/echo/model/text` |
| `Progress` (type) | local `./util`                               |

## Themes ranked by leverage

Ordered by how much code would be touched if each theme were
unbundled into its own entry point or moved to a different package.

1. **Space proxy** — 270+ sites. The barrel exists primarily to serve this theme.
2. **Object / database access** — 180+ sites. Could be served by `@dxos/echo` directly _if_ the React hooks were re-housed there (currently in `@dxos/echo-react`/`@dxos/react-client`).
3. **Membership** — 29 sites.
4. **Queues** — 20 sites.
5. **Sync state** — 15 sites.

## Recommendations

1. **Drop the 4 unused exports** (`Echo`, `QueryOptions`, `TextKind`, `Progress`) — pure cleanup, no migration needed.
2. **Promote the local sync helpers** (`getSyncSummary`, `createEmptyEdgeSyncState`, `SpaceSyncStateMap`, `PeerSyncState`) to a `Sync` sub-export of `@dxos/echo-db` or a top-level `@dxos/edge-sync` module — they are pure reductions over a protocol type, with no dependency on `Space`.
3. **Move `importSpace` to `@dxos/echo-db`** — already takes `EchoDatabase`; the local `./import` file is a thin wrapper.
4. **Confront the Space-proxy theme directly** — that's where the bulk of remaining churn lives. Options:
   - Hyperspace namespace: bundle `Space`, `isSpace`, `SpaceSchema`, `SpaceProperties`, `SpaceState`, `getSpace`, `useSpaces`/`useSpace` under a single `Hyperspace` import surface (matches the `// TODO(burdon): Reconcile under Hyperspace` note in `index.ts`).
   - Split into `@dxos/client/space` (proxy + hooks) + `@dxos/client/echo` (DB-only).
5. **Reclassify the React hooks bundle** — `useQuery`, `useObject`, `useDatabase`, `useSchema` are not Space-coupled. They could live in a thinner `@dxos/echo-react/db` entry point. This is the lowest-risk place to reduce the barrel.

## Prior work (already merged)

The following migrations have been completed on this branch and are no
longer in the barrel:

- `getSpace` call sites split into "DB-only" (migrated to `Obj.getDatabase`) vs "Needs Space" (kept).
- `Filter`, `Query`, `Ref`, `Entity`, `Relation`, `Type`, `Database` re-exports removed; callers migrated to `@dxos/echo`.
- `SpaceId`, `parseId`, `SPACE_ID_LENGTH`, `OBJECT_ID_LENGTH`, `FQ_ID_LENGTH` removed; `parseId` + the length constants moved into `@dxos/keys`.
- `defineObjectMigration`, `compareForeignKeys`, `createQueueDXN`, `EntityMeta`, `RefArray` re-exports removed.
- Public `Ref.hasEntityId` promoted in `@dxos/echo` so `Ref.*` access continues to work after dropping the alias.
