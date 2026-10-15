---
'@dxos/echo': minor
---

The ECHO host reports what its index is doing, so an app can show index migrations and a rebuild after an upgrade instead of appearing to hang.

- `@dxos/protocols`: `DataService.IndexStatus` (`migrating`, `indexing` or `idle`, with `done` of `total`, plus optional `catchUp` and `fullText` progress), `DataService.movesPhase(previous, next)`, which is true when a migration or rebuild moves on and false when only a lane does, and the `DataService.subscribeIndexStatus` stream, which sends the current status and then each change.
- `@dxos/echo-host`: `EchoHost.indexStatus` counts pending index migrations before running them and reports each store as it migrates. After opening, and at most once a second while a pass leaves work behind, it counts the backlog: documents and feeds with no primary-index cursor are a rebuild, and blocks past an existing feed cursor are catch-up. Each pass adds its own catch-up, the indexed documents whose heads moved on, and a pass that drains ends both. Each full-text flush reports the objects the full-text index has yet to reach, until it finishes or fails; flushes run one at a time.
- `@dxos/index-core`: `IndexEngine.pendingMigrations()`, `migrate({ onProgress })`, `IndexEngine.primaryIndexNames` and `IndexEngine.countSecondaryBacklog()`. A data source can report `catchUp` from `getChangedObjects`, and `IndexingResult.catchUp` carries it.
- `@dxos/sql-sqlite`: `SqlMigrations.pending(migrations, table)` lists the migrations a `Migrator` history table has not recorded yet.
- `@dxos/worker-framework`: a worker's runtime can send `status` messages before `ready`. Each one restarts the leader handshake deadline and the connection's initial-open deadline, so a long but progressing start is no longer cut off at 15 s. `Connection.workerStatus` exposes them.
- `@dxos/client`: `Client.indexStatus` reports the status from the worker while the client opens, then from the host's stream. The worker sends only the statuses that move a migration or rebuild on, and stops at `ready`.
