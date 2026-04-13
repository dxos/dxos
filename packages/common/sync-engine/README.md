# @dxos/sync-engine

Generic data-source sync engine. Diff a batch of freshly-fetched external
items against the set of ECHO objects that represent the previous sync,
apply creates/updates/removes, stamp `lastSyncedAt`.

The same ~200 lines of logic is duplicated across every sync plugin (Trello,
Granola, GitHub, Crypto, Research, Slack channel sync, Gmail, Calendar…).
This package extracts it.

## What this package does NOT do

Deliberately out of scope so this stays a small, reviewable primitive:

- **OAuth / credential storage** — use `@dxos/plugin-token-manager` + the
  `AccessToken` type for that. Pass the resulting token into your
  `fetchExternal` callback.
- **ECHO object creation** — you supply the `create`/`update`/`remove`
  callbacks that call `space.db.add(…)`, `Obj.change(…)`, etc. This package
  doesn't import from ECHO.
- **Scheduling** — no internal timer. Call `sync()` on button click, on a
  `setInterval`, or on mount (`auto: 'once'`).
- **Streaming / pagination** — `fetchExternal` is one-shot. Handle pagination
  inside it and return the concatenated result.

## Three entry points

```ts
import { diffSync, runSync, useSync } from '@dxos/sync-engine';
```

### `diffSync(config)` — pure

Takes `{ external, stored, externalId, storedExternalId, equal? }` and returns
`{ toCreate, toUpdate, unchanged, toRemove }`. No side effects, no async.
Use this on its own when you want custom orchestration.

### `runSync(config)` — orchestrator

Runs one sync cycle: `fetchExternal()` + `loadStored()` in parallel, diffs
them, applies effects sequentially, stamps `onSynced(new Date())`. Returns a
summary `{ created, updated, unchanged, removed, durationMs }`.

```ts
await runSync({
  fetchExternal: async () => await api.listChannels(token),
  loadStored: async () => (await space.db.query(Filter.type(SlackChannel)).run()),
  externalId: (ch) => ch.id,
  storedExternalId: (ch) => ch.externalId,
  equal: (ext, sto) => ext.updated === sto.updatedAt,
  effects: {
    create: async (ch) => space.db.add(makeChannel(ch)),
    update: async (ch, stored) => Obj.change(stored, (s) => {
      s.name = ch.name;
      s.updatedAt = ch.updated;
    }),
    remove: async (stored) => Obj.change(stored, (s) => { s.archived = true; }),
  },
  onSynced: async (at) => Obj.change(account, (a) => { a.lastSyncedAt = at; }),
});
```

### `useSync(options)` — React hook

Wraps `runSync` with state: `{ syncing, lastSyncedAt, error, lastSummary, sync() }`.
Concurrent-call-safe (second click while syncing is a no-op).

```tsx
const { syncing, lastSyncedAt, error, sync } = useSync({
  auto: 'once',
  initialLastSyncedAt: account.lastSyncedAt,
  fetchExternal: () => api.list(token),
  loadStored: () => query.run(),
  externalId: (ch) => ch.id,
  storedExternalId: (ch) => ch.externalId,
  effects: { create, update, remove },
  onSynced: (at) => Obj.change(account, (a) => { a.lastSyncedAt = at; }),
});

return (
  <button onClick={sync} disabled={syncing}>
    {syncing ? 'Syncing…' : `Sync now${lastSyncedAt ? ` (last ${lastSyncedAt.toLocaleString()})` : ''}`}
  </button>
);
```

## Recommended adoption pattern

A sync plugin on top of this package is roughly:

1. Define an `Account` ECHO type with a `Ref<AccessToken>` and `lastSyncedAt`.
2. Build a thin API client that accepts a bearer token and returns item arrays.
3. Wire `useSync` in the plugin's surface component.
4. Done.

See [PROPOSAL: Adopt AccessToken + plugin-token-manager for all sync
plugins](./docs/adoption-proposal.md) — `@dxos/plugin-token-manager` already
handles the OAuth dance and stores tokens as first-class ECHO objects, so
sync plugins shouldn't roll their own credential storage.
