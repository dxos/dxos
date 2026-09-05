# @dxos/sql-sqlite

## 0.12.0

### Minor Changes

- df93cc2: Add `SqlMigrations` for executing multi-statement SQL scripts, and `SqlTransaction.clientLayer` for running `@effect/sql`'s migrator on platforms whose SQL client cannot emit `BEGIN`/`COMMIT`, such as Cloudflare Durable Objects.

  Every SQLite schema in the repo now ships as numbered `.sql` migration files recorded in a per-store history table rather than as inline DDL — 18 stores across `@dxos/feed`, `@dxos/index-core`, `@dxos/echo-host`, `@dxos/client-services`, `@dxos/keyring`, `@dxos/teleport-extension-object-sync`, `@dxos/crawler`, `@dxos/pipeline-rdf` and `@dxos/pipeline-discord`. Existing databases are unaffected: the initial migration of each store is idempotent, so it applies to a database created by an earlier release as a recorded no-op with rows preserved.

  Breaking for direct callers of a store's `migrate`: it now additionally requires the `SqlTransaction` service, so a caller providing only `SqlClient` must add `SqlTransaction.layer` (`SqlTransaction.layer.pipe(Layer.provideMerge(client))`).

### Patch Changes

- 7575cb6: Make a crashed process diagnosable from a user-submitted debug bundle.

  A failed process logged `lifecycle: failed` at `debug` with only `Cause.pretty` text, and the deferred `ctx.fail` path logged nothing about the cause at all — so a crashed agent turn left no error-level line to find. Both paths now report at `error` and carry the failing `Error`/defect itself, so the record keeps the message, stack, and nested causes that `Cause.pretty` flattens away.

  `sqlite query` moves from `debug` to `trace` unless the query took at least 20 ms. The persistent log store drops `trace`, and this one line was 80% of a 50 MB feedback upload — enough to cut the retained window to under nine minutes and evict the failure being reported. Slow queries, the ones worth diagnosing after the fact, still log at `debug`. Use `DX_LOG=trace` or a per-file filter to see every query locally; the DevTools `performance.measure` track is unchanged.

- @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1
- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f6a01e3]
  - @dxos/log@0.11.0
  - @dxos/node-std@0.11.0
