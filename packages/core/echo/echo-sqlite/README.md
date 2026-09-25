# @dxos/echo-sqlite

The smallest backend that implements the ECHO `Database` interface from `@dxos/echo`, as an
alternative to `@dxos/echo-client` + `@dxos/echo-host`.

- Objects are ordinary in-memory live objects (`Obj.make` proxies). The whole space is loaded on open.
- Writes are persisted to one SQLite table (`echo_objects`), one JSON row per entity, batched per
  microtask. `db.flush()` waits for them; closing the scope flushes too.
- No Automerge, feeds, replication, or client/host split.

```ts
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';

const program = Effect.gen(function* () {
  const db = yield* SqliteDatabase.open({ spaceId, types: [Person] });
  db.add(Obj.make(Person, { name: 'Alice' }));
  const people = db.query(Filter.type(Person)).runSync();
}).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: 'echo.db' })));
```

`SqliteDatabase.layer(options)` provides `Database.Service` instead.

## What works

| Area             | Support                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Objects          | add, update (`Obj.update`), soft delete, restore by re-adding, `getObjectById`                  |
| Relations        | persisted endpoints; endpoints not yet stored are added with the relation                      |
| Refs             | persisted and resolved on load; referenced objects not yet stored are added with the referrer  |
| Parents          | `Obj.Parent` persisted; `parent()` / `children()` / `Filter.childOf`                            |
| Types            | static types via `open({ types })`; `addType` persists a type so its objects load without code  |
| Queries          | filters, traversals, union / difference, order, limit / skip, created / updated timestamps     |
| Reactivity       | `Obj.subscribe`, `QueryResult.subscribe` and `.atom`                                            |
| Blobs            | inline storage only                                                                             |
| Maintenance      | `stats`, `runGarbageCollection` (hard-deletes soft-deleted rows), `retainObjects`              |

Feeds, branches, history (`getVersion`), aggregate queries and external blob backends throw
`UnsupportedOperationError` / `UnsupportedQueryError`.
