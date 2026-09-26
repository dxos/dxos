# @dxos/echo-sqlite

A minimal backend for the ECHO `Database` interface from `@dxos/echo`, as an alternative to
`@dxos/echo-client` + `@dxos/echo-host`: SQLite is the source of truth, with no Automerge, no feeds, no
replication and no client/host split. Requirements are in [`SPEC.mdl`](./SPEC.mdl).

- **The space is never resident.** Opening reads only persisted type rows. A query hydrates only its
  result rows; a ref loads its one target row.
- **Queries run in SQLite.** A query AST compiles to one `WITH RECURSIVE` statement
  (`src/sql/compile.ts`) over a JSON-row entity table, a reverse-reference table and an FTS5 table.
  There is no in-memory fallback; unsupported clauses throw `UnsupportedQueryError`.
- **Objects are ordinary live objects, held weakly.** The same id resolves to the same instance while
  anything holds it; once nothing does it is garbage-collected. Mutations are written behind (batched per
  microtask) and held strongly until durable; `db.flush()` waits for them.

```ts
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';

const program = Effect.gen(function* () {
  const db = yield* SqliteDatabase.open({ spaceId, types: [Person] });
  db.add(Obj.make(Person, { name: 'Alice' }));
  const people = yield* Effect.promise(() => db.query(Filter.type(Person)).run());
}).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: 'echo.db' })));
```

`SqliteDatabase.layer(options)` provides `Database.Service` instead. `QueryResult.runSync()` returns the
last execution (empty before the first) and never blocks; use `run()` or `subscribe()`.

## Supported

| Area        | Support                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Objects     | add, update, soft delete (cascading to children and relations), restore by re-adding            |
| Relations   | endpoints stored as indexed columns; unstored endpoints are added with the relation             |
| Refs        | stored in `echo_refs`; `ref.load()` reads one row; unstored `Ref.make` targets are added        |
| Queries     | typed filters on JSON properties, meta keys/tags, text (trigram FTS5), timestamps, child-of,     |
|             | reference / relation / hierarchy traversals, union, difference, order, limit, skip              |
| Reactivity  | `Obj.subscribe`; `QueryResult.subscribe` / `.atom` re-execute only for writes that can affect    |
| Types       | static types via `open({ types })`; `addType` persists a type for code-free reopen              |
| Blobs       | inline storage only                                                                             |
| Maintenance | `stats`, `runGarbageCollection`, `diagnostics()` (resident / hydrated / statements / loads)      |

Feeds, branches, history, aggregates, external blob backends and `retainObjects` throw.

## Tests and benchmarks

```bash
moon run echo-sqlite:test                                     # e2e, residency (GC), differential, EXPLAIN
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run            # throughput (this package)
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest run src/memory.report.test.ts   # heap vs. space size
```

Results: [`BENCHMARKS.md`](./BENCHMARKS.md).
