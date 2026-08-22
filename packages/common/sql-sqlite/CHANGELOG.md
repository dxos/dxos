# @dxos/sql-sqlite

## 0.12.0

### Minor Changes

- df93cc2: Add `SqlMigrations` for executing multi-statement SQL scripts, and `SqlTransaction.clientLayer` for running `@effect/sql`'s migrator on platforms whose SQL client cannot emit `BEGIN`/`COMMIT`, such as Cloudflare Durable Objects.

  Every SQLite schema in the repo now ships as numbered `.sql` migration files recorded in a per-store history table rather than as inline DDL — 18 stores across `@dxos/feed`, `@dxos/index-core`, `@dxos/echo-host`, `@dxos/client-services`, `@dxos/keyring`, `@dxos/teleport-extension-object-sync`, `@dxos/crawler`, `@dxos/pipeline-rdf` and `@dxos/pipeline-discord`. Existing databases are unaffected: the initial migration of each store is idempotent, so it applies to a database created by an earlier release as a recorded no-op with rows preserved.

  Breaking for direct callers of a store's `migrate`: it now additionally requires the `SqlTransaction` service, so a caller providing only `SqlClient` must add `SqlTransaction.layer` (`SqlTransaction.layer.pipe(Layer.provideMerge(client))`).

### Patch Changes

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
